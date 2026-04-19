// Source : local.ch (annuaire pro CH)
// Pas d'API publique — scraping HTML. Rate limit 1.5s, User-Agent explicite.
// On cherche par raison sociale + ville pour récupérer tél / email.

import * as cheerio from "cheerio";
import { RATE_LIMITS, USER_AGENT } from "../constants";

let lastCall = 0;
async function throttledFetch(url: string): Promise<string> {
  const now = Date.now();
  const wait = Math.max(0, RATE_LIMITS.LOCAL_CH - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html",
      "Accept-Language": "fr-CH,fr;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`local.ch ${res.status} ${res.statusText}`);
  return await res.text();
}

export type LocalChResult = {
  telephone?: string;
  siteWeb?: string;
  adresse?: string;
};

/**
 * Cherche un établissement sur local.ch par nom + ville.
 * Retourne le premier résultat ou null.
 *
 * ⚠ Scraping fragile — si local.ch change son DOM, mettre à jour les sélecteurs.
 * Alternative payante : API swissdir (CHF/mois).
 */
export async function searchLocalCh(
  raisonSociale: string,
  ville: string,
): Promise<LocalChResult | null> {
  const q = encodeURIComponent(`${raisonSociale} ${ville}`);
  const url = `https://www.local.ch/fr/q?what=${q}`;

  try {
    const html = await throttledFetch(url);
    const $ = cheerio.load(html);

    // Premier résultat — sélecteurs best-effort
    const firstCard = $("[data-cy='search-result']").first();
    if (!firstCard.length) return null;

    const phone = firstCard.find("a[href^='tel:']").first().attr("href")?.replace("tel:", "");
    const website = firstCard.find("a[data-cy='result-website-link']").first().attr("href");
    const address = firstCard.find("[data-cy='result-address']").first().text().trim();

    return {
      telephone: phone || undefined,
      siteWeb: website || undefined,
      adresse: address || undefined,
    };
  } catch (e) {
    // Swallow : source tierce, ne doit pas casser l'enrichissement complet
    console.warn("[localCh] search failed:", (e as Error).message);
    return null;
  }
}
