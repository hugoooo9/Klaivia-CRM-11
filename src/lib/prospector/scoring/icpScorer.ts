// Scoring ICP (0-100) — pondération :
//   40  secteur NOGA (déjà filtré en amont → binaire : dans whitelist = 40)
//   20  taille entreprise (≤5 empl = 20, 6-10 = 15, 11-20 = 10, >20 = 0)
//   30  signaux douleur (Claude scanne avis Google + données site)
//   10  qualité données (email + tél + contact nommé présents)

import { db } from "@/lib/db";
import { anthropic, MODEL } from "../client";
import { fetchRecentReviews } from "../sources/googlePlaces";
import { isNogaAllowed, PROMPT_VERSION_SCORING } from "../constants";

type PainSignalsLLM = {
  absenceRdvEnLigne: boolean;       // booking widget absent ou mentionné négativement
  siteDate: boolean;                // dernière mise à jour visible > 3 ans
  avisNegatifsCommunication: number; // 0-5 : nb d'avis récents se plaignant de joignabilité
  horairesRestreints: boolean;      // fermetures longues sans secrétariat
  resume: string;                   // 1 phrase pour humain
};

const PAIN_PROMPT_SYSTEM = `Tu analyses un prospect B2B pour détecter des signaux de douleur opérationnelle qui justifient l'installation d'un agent IA de gestion de contacts entrants.

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte autour) :
{
  "absenceRdvEnLigne": boolean,
  "siteDate": boolean,
  "avisNegatifsCommunication": integer 0-5,
  "horairesRestreints": boolean,
  "resume": "1 phrase courte fr-CH"
}

Critères :
- absenceRdvEnLigne : aucun widget de réservation détecté (hasBookingWidget=false) OU avis mentionnant "impossible de prendre RDV en ligne"
- siteDate : copyrightYear < (année actuelle - 3), OU absence totale de copyrightYear avec htmlSize < 20000 (signe de site ancien/minimal)
- avisNegatifsCommunication : compter les avis des 30 derniers jours contenant "ne répond pas", "difficile à joindre", "pas rappelé", "messagerie pleine", "jamais de réponse", "injoignable"
- horairesRestreints : ouvertures < 30h/semaine sans mention d'un secrétariat ou accueil externalisé

Pas de markdown, pas de commentaires, uniquement le JSON.`;

async function detectPainSignals(data: {
  raisonSociale: string;
  secteurNOGA?: string | null;
  signauxDouleurRaw?: unknown; // ce qu'on a du scraping
  hasBookingWidget?: boolean;
  copyrightYear?: number;
  htmlSize?: number;
  avisRecents?: { rating: number; texte: string; publishTime: string }[];
  horairesTexte?: string[];
}): Promise<PainSignalsLLM> {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 400,
    system: PAIN_PROMPT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Analyse ce prospect :\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``,
      },
    ],
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Réponse Claude inattendue");
  // Extract JSON (Claude peut parfois envelopper malgré la consigne)
  const m = block.text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Pas de JSON dans la réponse Claude");
  return JSON.parse(m[0]) as PainSignalsLLM;
}

export async function scoreProspect(prospectId: string): Promise<{ score: number; breakdown: Record<string, number> }> {
  const p = await db.prospect.findUnique({
    where: { id: prospectId },
    include: { contacts: true },
  });
  if (!p) throw new Error("Prospect introuvable");

  // ─── 40pts : NOGA whitelist ───
  const nogaScore = isNogaAllowed(p.secteurNOGA) ? 40 : 0;

  // ─── 20pts : taille entreprise ───
  let sizeScore = 10; // défaut optimiste si inconnu (≤20)
  if (p.tailleEntreprise != null) {
    if (p.tailleEntreprise <= 5) sizeScore = 20;
    else if (p.tailleEntreprise <= 10) sizeScore = 15;
    else if (p.tailleEntreprise <= 20) sizeScore = 10;
    else sizeScore = 0;
  }

  // ─── 30pts : signaux douleur (LLM + avis récents) ───
  let painScore = 0;
  try {
    // Refresh avis récents si placeId déjà connu (future work : stocker placeId)
    // MVP : on passe juste les données déjà en DB
    const raw = p.signauxDouleur ? (JSON.parse(p.signauxDouleur) as Record<string, unknown>) : {};
    const signals = await detectPainSignals({
      raisonSociale: p.raisonSociale ?? p.entreprise ?? "",
      secteurNOGA: p.secteurNOGA,
      signauxDouleurRaw: raw,
      hasBookingWidget: raw.hasBookingWidget as boolean | undefined,
      copyrightYear: raw.copyrightYear as number | undefined,
      avisRecents: [], // TODO : stocker placeId pour refresh avis
    });
    // Points : 10 par absence RDV + 5 site daté + 10 (avis>=2 négatifs) + 5 horaires restreints
    painScore =
      (signals.absenceRdvEnLigne ? 10 : 0) +
      (signals.siteDate ? 5 : 0) +
      (signals.avisNegatifsCommunication >= 2 ? 10 : signals.avisNegatifsCommunication > 0 ? 5 : 0) +
      (signals.horairesRestreints ? 5 : 0);

    // Persist les signaux enrichis
    await db.prospect.update({
      where: { id: prospectId },
      data: { signauxDouleur: JSON.stringify({ ...raw, llm: signals }) },
    });
  } catch (e) {
    console.warn("[scoring] pain detection failed:", (e as Error).message);
    painScore = 0;
  }

  // ─── 10pts : qualité données ───
  const hasEmail = !!(p.email || p.contacts.some((c) => c.email));
  const hasPhone = !!p.phone;
  const hasNamedContact = p.contacts.some((c) => c.nom && c.prenom);
  const qualityScore = (hasEmail ? 4 : 0) + (hasPhone ? 3 : 0) + (hasNamedContact ? 3 : 0);

  const total = nogaScore + sizeScore + painScore + qualityScore;
  const breakdown = { noga: nogaScore, size: sizeScore, pain: painScore, quality: qualityScore };

  await db.prospect.update({
    where: { id: prospectId },
    data: {
      scoreICP: total,
      pipelineAuto: total >= 60 ? "QUALIFIED" : "SKIPPED",
    },
  });

  return { score: total, breakdown };
}

// Re-export pour tests / debug
export { PROMPT_VERSION_SCORING };
