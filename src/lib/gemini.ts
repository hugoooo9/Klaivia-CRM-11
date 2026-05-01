// Client Gemini API (Google AI Studio) — génération de mails d'approche
// Pas de SDK pour rester léger : fetch direct sur l'endpoint REST.
// Modèle utilisé : gemini-2.0-flash (stable, rapide, gratuit jusqu'à un certain quota).

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `Tu rédiges des emails d'approche pour Klaivia, une agence basée à Lausanne qui crée des sites web, des automatisations sur mesure et des agents IA pour les PME romandes. On aide les entreprises à gagner du temps sur leurs tâches répétitives et à mieux convertir leurs visiteurs en clients.

Ton style :
- Direct, humain, pas commercial
- Phrases courtes
- Pas de jargon technique, pas de "synergies", pas de "solutions innovantes"
- Pas d'emoji
- Tutoiement interdit, vouvoiement professionnel
- Ne jamais commencer par "J'espère que ce mail vous trouve bien" ou équivalent
- Le mail doit donner envie de répondre, pas de signer un devis

Structure du mail :
1. Une accroche courte qui montre que tu connais le contexte du prospect (secteur, canal d'acquisition, urgence)
2. Un constat ou une observation pertinente sur ce que Klaivia pourrait apporter à une boîte comme la sienne (site, automatisation, ou agent IA selon ce qui semble le plus pertinent)
3. Une invitation simple à répondre pour en discuter — pas de "réservez un call", juste "ça vous parle ?" ou équivalent naturel
4. Signature : "Hugo — Klaivia" sur deux lignes

Longueur cible : 80 à 130 mots maximum, corps du mail uniquement (signature comprise).

Tu reçois les infos du prospect en JSON. Tu retournes UNIQUEMENT un objet JSON valide avec les clés "subject" et "body", sans backticks markdown, sans texte autour. L'objet doit faire entre 4 et 8 mots, accrocheur sans être putaclic.`;

export type GeminiProspectInput = {
  entreprise: string | null;
  prenom: string | null;
  nom: string | null;
  secteur: string | null;
  canal: string | null;
  urgence: string | null;
  score: number | null;
  notes: string | null;
  ville: string | null;
};

export type GeneratedEmail = {
  subject: string;
  body: string;
};

function buildUserMessage(p: GeminiProspectInput): string {
  const nameOrCompany = p.entreprise ?? `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() ?? "non précisé";
  return `Voici les infos du prospect :
- Nom / entreprise : ${nameOrCompany}
- Ville : ${p.ville ?? "non précisée"}
- Secteur : ${p.secteur ?? "non précisé"}
- Canal d'acquisition : ${p.canal ?? "non précisé"}
- Urgence : ${p.urgence ?? "non précisée"}
- Score : ${p.score ?? "non précisé"}
- Notes : ${p.notes ?? "aucune"}

Génère le mail d'approche au format JSON { "subject": "...", "body": "..." }.`;
}

async function callGemini(prospect: GeminiProspectInput): Promise<GeneratedEmail> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "GEMINI_API_KEY absent ou vide côté serveur. Vérifie les variables d'environnement Hostinger (hPanel → Node.js → Environment Variables) et redémarre l'app après ajout.",
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserMessage(prospect) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.8,
          maxOutputTokens: 800,
        },
      }),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error("Gemini timeout (30s) — réessaye dans un instant.");
    }
    console.error("[gemini] fetch error:", e);
    throw new Error(`Connexion Gemini impossible : ${(e as Error).message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(`[gemini] HTTP ${response.status}:`, errorText.slice(0, 500));
    if (response.status === 429) {
      throw new Error("Limite de débit Gemini atteinte. Réessaye dans 1 minute.");
    }
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error(
        `Clé Gemini rejetée (HTTP ${response.status}). Vérifie qu'elle est valide sur https://aistudio.google.com/apikey et autorisée pour Generative Language API.`,
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Modèle Gemini introuvable (HTTP 404). Le modèle "${GEMINI_MODEL}" est peut-être deprecated dans cette région.`,
      );
    }
    throw new Error(`Gemini a renvoyé ${response.status} : ${errorText.slice(0, 200)}`);
  }

  type GeminiResponse = {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
  };
  const data = (await response.json()) as GeminiResponse;

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini a bloqué la requête : ${data.promptFeedback.blockReason}`);
  }
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    console.error("[gemini] finish reason:", candidate.finishReason);
    throw new Error(`Génération interrompue : ${candidate.finishReason}`);
  }
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("[gemini] empty response:", JSON.stringify(data).slice(0, 500));
    throw new Error("Gemini a renvoyé une réponse vide.");
  }

  // Parse strict JSON ; nettoie d'éventuels backticks markdown au cas où le modèle ignore la consigne
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("JSON_PARSE_ERROR");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { subject?: unknown }).subject !== "string" ||
    typeof (parsed as { body?: unknown }).body !== "string"
  ) {
    throw new Error("JSON_PARSE_ERROR");
  }

  const result = parsed as { subject: string; body: string };
  if (!result.subject.trim() || !result.body.trim()) {
    throw new Error("Gemini a généré un mail vide.");
  }

  return { subject: result.subject.trim(), body: result.body.trim() };
}

// Wrapper avec retry une fois en cas de JSON malformé
export async function generateEmailWithRetry(prospect: GeminiProspectInput): Promise<GeneratedEmail> {
  try {
    return await callGemini(prospect);
  } catch (e) {
    if ((e as Error).message === "JSON_PARSE_ERROR") {
      // Une seule retry sur JSON malformé
      try {
        return await callGemini(prospect);
      } catch (retryErr) {
        if ((retryErr as Error).message === "JSON_PARSE_ERROR") {
          throw new Error("Gemini a renvoyé un format invalide après 2 tentatives.");
        }
        throw retryErr;
      }
    }
    throw e;
  }
}
