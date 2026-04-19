// Client Anthropic singleton. Lazy init — lève une erreur claire si ANTHROPIC_API_KEY manque.

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquante — scoring & génération IA indisponibles");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export const MODEL = "claude-sonnet-4-5";
