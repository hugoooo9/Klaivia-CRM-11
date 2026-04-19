// Orchestrateur d'enrichissement d'un prospect auto.
// Ordre : localCh → Google Places → scraping site web.
// Chaque source est isolée (fail-safe) et loggée dans EnrichmentLog.

import { db } from "@/lib/db";
import { searchLocalCh } from "../sources/localCh";
import { searchGooglePlace } from "../sources/googlePlaces";
import { scrapeWebsite } from "../sources/websiteScraper";
import { filterOptedOut } from "../optOut";
import { MAX_EMPLOYEES } from "../constants";

export type EnrichmentOutcome = {
  prospectId: string;
  pipelineAuto: "ENRICHED" | "SKIPPED";
  reason?: string;
};

async function logEnrichment(
  prospectId: string,
  source: string,
  statut: "OK" | "SKIPPED" | "ERROR",
  donneesBrutes?: unknown,
  erreur?: string,
) {
  try {
    await db.enrichmentLog.create({
      data: {
        prospectId,
        source,
        statut,
        donneesBrutes: donneesBrutes ? JSON.stringify(donneesBrutes).slice(0, 10_000) : null,
        erreur,
      },
    });
  } catch (e) {
    console.warn("[enrichment] log failed:", (e as Error).message);
  }
}

/**
 * Enrichit un prospect (identifié par id) en appelant les sources tierces.
 * Met à jour Prospect + crée les Contacts.
 */
export async function enrichProspect(prospectId: string): Promise<EnrichmentOutcome> {
  const p = await db.prospect.findUnique({ where: { id: prospectId } });
  if (!p) throw new Error("Prospect introuvable");
  if (!p.raisonSociale || !p.ville) {
    return { prospectId, pipelineAuto: "SKIPPED", reason: "raisonSociale ou ville manquante" };
  }

  // ─── 1. local.ch ───
  let telephone: string | null = null;
  let siteWeb: string | null = p.siteWeb ?? null;
  try {
    const lc = await searchLocalCh(p.raisonSociale, p.ville);
    if (lc) {
      telephone = lc.telephone ?? null;
      siteWeb = siteWeb || lc.siteWeb || null;
      await logEnrichment(prospectId, "LOCAL_CH", "OK", lc);
    } else {
      await logEnrichment(prospectId, "LOCAL_CH", "SKIPPED");
    }
  } catch (e) {
    await logEnrichment(prospectId, "LOCAL_CH", "ERROR", undefined, (e as Error).message);
  }

  // ─── 2. Google Places ───
  let rating: number | null = null;
  let reviewsCount: number | null = null;
  try {
    const gp = await searchGooglePlace(p.raisonSociale, p.ville);
    if (gp) {
      rating = gp.rating ?? null;
      reviewsCount = gp.reviewsCount ?? null;
      siteWeb = siteWeb || gp.siteWeb || null;
      telephone = telephone || gp.telephone || null;
      await logEnrichment(prospectId, "GOOGLE_PLACES", "OK", gp);
    } else {
      await logEnrichment(prospectId, "GOOGLE_PLACES", "SKIPPED");
    }
  } catch (e) {
    // Clé manquante → SKIPPED silencieux, autres erreurs → ERROR
    const msg = (e as Error).message;
    const statut = msg.includes("GOOGLE_PLACES_API_KEY") ? "SKIPPED" : "ERROR";
    await logEnrichment(prospectId, "GOOGLE_PLACES", statut, undefined, msg);
  }

  // ─── 3. Website ───
  let webEmails: string[] = [];
  let webInstagram: string | null = null;
  let webLinkedin: string | null = null;
  let copyrightYear: number | undefined;
  let hasBookingWidget = false;
  if (siteWeb) {
    try {
      const w = await scrapeWebsite(siteWeb);
      if (w) {
        webEmails = await filterOptedOut(w.emails);
        webInstagram = w.instagram ?? null;
        webLinkedin = w.linkedin ?? null;
        copyrightYear = w.copyrightYear;
        hasBookingWidget = w.hasBookingWidget;
        await logEnrichment(prospectId, "WEBSITE", "OK", {
          emails: webEmails.length,
          instagram: !!webInstagram,
          linkedin: !!webLinkedin,
          hasBookingWidget,
          copyrightYear,
        });
      } else {
        await logEnrichment(prospectId, "WEBSITE", "SKIPPED");
      }
    } catch (e) {
      await logEnrichment(prospectId, "WEBSITE", "ERROR", undefined, (e as Error).message);
    }
  }

  // ─── Filtre taille entreprise (si on a pu la détecter — future work via BFS) ───
  // Pour MVP : on ne rejette pas ici, mais on stocke un flag pour le scoring.
  if (p.tailleEntreprise != null && p.tailleEntreprise > MAX_EMPLOYEES) {
    await db.prospect.update({
      where: { id: prospectId },
      data: { pipelineAuto: "SKIPPED" },
    });
    return { prospectId, pipelineAuto: "SKIPPED", reason: `> ${MAX_EMPLOYEES} employés` };
  }

  // ─── Persist ───
  const signauxDouleur = {
    absenceBooking: !hasBookingWidget,
    siteDatait: copyrightYear != null && copyrightYear < new Date().getFullYear() - 3,
    copyrightYear,
    // avisNegatifs + horairesRestreints : remplis au scoring LLM
  };

  await db.prospect.update({
    where: { id: prospectId },
    data: {
      phone: telephone ?? p.phone,
      email: webEmails[0] ?? p.email, // premier email générique, fallback existant
      siteWeb: siteWeb ?? p.siteWeb,
      instagram: webInstagram ?? p.instagram,
      linkedin: webLinkedin ?? p.linkedin,
      googleRating: rating,
      googleReviewsCount: reviewsCount,
      signauxDouleur: JSON.stringify(signauxDouleur),
      pipelineAuto: "ENRICHED",
      derniereEnrichAt: new Date(),
    },
  });

  // ─── Contacts : un par email générique trouvé ───
  for (const email of webEmails) {
    await db.contact.create({
      data: {
        prospectId,
        email,
        source: "WEBSITE",
      },
    });
  }

  return { prospectId, pipelineAuto: "ENRICHED" };
}
