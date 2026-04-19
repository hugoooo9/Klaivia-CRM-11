// Générateur de phrase d'approche — appelé UNIQUEMENT à la demande.
// Avant chaque génération : refresh dynamique des avis Google (< 30j) et recheck site.
// Stocke prompt version pour traçabilité A/B.

import { db } from "@/lib/db";
import { anthropic, MODEL } from "../client";
import { fetchRecentReviews, searchGooglePlace } from "../sources/googlePlaces";
import { scrapeWebsite } from "../sources/websiteScraper";
import { isOptedOut } from "../optOut";
import { PROMPT_VERSION_APPROACH } from "../constants";

const SYSTEM_APPROACH = `Tu es expert en prospection B2B pour Klaivia, agence suisse d'agents IA vocaux pour TPE/PME romandes. Génère UNE phrase d'approche (max 2 phrases, 280 caractères) pour un premier contact LinkedIn ou email.

Règles strictes :
- Français de Suisse romande (vouvoiement, pas "tu")
- Accroche spécifique au métier ET à la ville du prospect
- Référence un signal concret et RÉCENT (avis récent, service manquant observé)
- Zéro jargon IA ; parler bénéfice concret (RDV manqués, appels perdus, temps admin)
- Ton humain, direct, non commercial
- Pas d'emoji, pas de "J'espère que vous allez bien"
- Finir par une question ouverte courte

Retourne UNIQUEMENT un JSON valide (pas de markdown) :
{ "email": "version email 280c max", "linkedin": "version LinkedIn 280c max", "ton": "direct|curieux|consultatif" }`;

type ApproachPayload = { email: string; linkedin: string; ton: string };

export type GenerateOpts = {
  genereA?: "ON_DEMAND" | "MANUAL_REGEN";
  skipRefresh?: boolean; // pour tests uniquement
};

export async function generateApproachMessage(
  prospectId: string,
  opts: GenerateOpts = {},
): Promise<{ email: string; linkedin: string; ton: string; messageIds: string[] }> {
  const p = await db.prospect.findUnique({
    where: { id: prospectId },
    include: { contacts: true },
  });
  if (!p) throw new Error("Prospect introuvable");

  // ─── Guard opt-out (LPD) ───
  if (p.email && (await isOptedOut(p.email))) {
    throw new Error("Email en opt-out — génération bloquée");
  }

  // ─── Refresh dynamique (avis récents + site) ───
  let freshReviews: { rating: number; texte: string }[] = [];
  let freshSiteSignals: Record<string, unknown> | null = null;

  if (!opts.skipRefresh) {
    // Re-fetch Google Places pour avoir placeId + avis < 30j
    try {
      if (p.raisonSociale && p.ville) {
        const gp = await searchGooglePlace(p.raisonSociale, p.ville);
        if (gp?.placeId) {
          const reviews = await fetchRecentReviews(gp.placeId, 30);
          freshReviews = reviews.map((r) => ({ rating: r.rating, texte: r.texte.slice(0, 300) }));
        }
      }
    } catch (e) {
      console.warn("[approach] refresh Google failed:", (e as Error).message);
    }

    try {
      if (p.siteWeb) {
        const w = await scrapeWebsite(p.siteWeb);
        if (w) {
          freshSiteSignals = {
            hasBookingWidget: w.hasBookingWidget,
            copyrightYear: w.copyrightYear,
            htmlSize: w.htmlSize,
          };
        }
      }
    } catch (e) {
      console.warn("[approach] refresh site failed:", (e as Error).message);
    }
  }

  const contextPayload = {
    raisonSociale: p.raisonSociale ?? p.entreprise,
    ville: p.ville,
    canton: p.canton,
    secteurNOGA: p.secteurNOGA,
    scoreICP: p.scoreICP,
    signauxDouleur: p.signauxDouleur ? JSON.parse(p.signauxDouleur) : null,
    siteSignals: freshSiteSignals,
    avisRecents30j: freshReviews,
    contactNomme: p.contacts.find((c) => c.nom && c.prenom) ?? null,
  };

  // ─── Claude ───
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_APPROACH,
    messages: [
      {
        role: "user",
        content: `Données prospect (fraîches) :\n\`\`\`json\n${JSON.stringify(contextPayload, null, 2)}\n\`\`\``,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Réponse Claude inattendue");
  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Pas de JSON dans la réponse Claude");
  const parsed = JSON.parse(jsonMatch[0]) as ApproachPayload;

  // ─── Persist (1 ligne par canal) ───
  const genereA = opts.genereA ?? "ON_DEMAND";
  const created = await db.$transaction([
    db.approachMessage.create({
      data: {
        prospectId,
        canal: "EMAIL",
        contenu: parsed.email,
        ton: parsed.ton,
        genereA,
        promptVersion: PROMPT_VERSION_APPROACH,
      },
    }),
    db.approachMessage.create({
      data: {
        prospectId,
        canal: "LINKEDIN",
        contenu: parsed.linkedin,
        ton: parsed.ton,
        genereA,
        promptVersion: PROMPT_VERSION_APPROACH,
      },
    }),
    db.prospect.update({
      where: { id: prospectId },
      data: { pipelineAuto: "APPROACHED" },
    }),
  ]);

  return {
    email: parsed.email,
    linkedin: parsed.linkedin,
    ton: parsed.ton,
    messageIds: [created[0].id, created[1].id],
  };
}
