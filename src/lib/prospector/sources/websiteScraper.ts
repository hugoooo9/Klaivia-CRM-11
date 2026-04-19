// Scraper site web du prospect — extrait emails génériques (info@, contact@) + réseaux sociaux.
// Pas de Playwright (MVP) : HTML statique via fetch + cheerio suffit pour 80% des sites TPE.
// Respect robots.txt : on skip si Disallow /.

import * as cheerio from "cheerio";
import { RATE_LIMITS, USER_AGENT } from "../constants";

let lastCall = 0;
async function throttledFetch(url: string): Promise<Response> {
  const wait = Math.max(0, RATE_LIMITS.WEBSITE - (Date.now() - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
}

// Filtre : on veut emails génériques pro (base légale B2B), pas personnels.
const GENERIC_PREFIXES = ["info", "contact", "hello", "bonjour", "office", "admin", "secretariat", "accueil", "reservation", "rendez-vous"];

export type WebsiteData = {
  emails: string[];
  telephones: string[];
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  copyrightYear?: number; // indice signal "site daté"
  hasBookingWidget: boolean;
  htmlSize: number;
};

async function checkRobots(base: URL): Promise<boolean> {
  try {
    const robots = await throttledFetch(`${base.origin}/robots.txt`);
    if (!robots.ok) return true;
    const txt = await robots.text();
    // Interdiction générique (User-agent: * avec Disallow: /) = on respecte
    const lines = txt.split(/\r?\n/);
    let inGlobal = false;
    for (const l of lines) {
      if (/^User-agent:\s*\*/i.test(l)) inGlobal = true;
      else if (/^User-agent:/i.test(l)) inGlobal = false;
      else if (inGlobal && /^Disallow:\s*\/\s*$/i.test(l)) return false;
    }
    return true;
  } catch {
    return true; // robots inaccessible = on permet
  }
}

export async function scrapeWebsite(url: string): Promise<WebsiteData | null> {
  let base: URL;
  try {
    base = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return null;
  }

  if (!(await checkRobots(base))) {
    console.warn("[websiteScraper] robots.txt Disallow — skip", base.origin);
    return null;
  }

  let html = "";
  try {
    const res = await throttledFetch(base.toString());
    if (!res.ok) return null;
    html = await res.text();
  } catch (e) {
    console.warn("[websiteScraper] fetch failed:", (e as Error).message);
    return null;
  }

  const $ = cheerio.load(html);
  const text = $("body").text();

  // Emails — pattern standard, filtrés sur prefix générique
  const emailRe = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  const allEmails = Array.from(new Set((html.match(emailRe) ?? []).map((e) => e.toLowerCase())));
  const genericEmails = allEmails.filter((e) => {
    const prefix = e.split("@")[0];
    return GENERIC_PREFIXES.some((p) => prefix.startsWith(p));
  });

  // Téléphones CH (+41 ou 0XX)
  const phoneRe = /(?:\+41\s?|0)(?:\d{2}[\s.]?){4}\d{0,2}/g;
  const phones = Array.from(new Set((text.match(phoneRe) ?? []).map((p) => p.replace(/\s+/g, " ").trim())));

  // Réseaux sociaux
  const findSocial = (host: string) => {
    const a = $(`a[href*="${host}"]`).first().attr("href");
    return a ?? undefined;
  };

  // Copyright (heuristique : chercher "© 2018" style)
  const copyMatch = text.match(/(?:©|copyright)\s*(?:\(c\)\s*)?(\d{4})/i);
  const copyrightYear = copyMatch ? parseInt(copyMatch[1], 10) : undefined;

  // Widget booking (Calendly, Booksy, OnlineBooking, etc.)
  const hasBookingWidget = /calendly|booksy|doctolib|treatwell|onlinebooking|setmore|bookeo|fresha/i.test(html);

  return {
    emails: genericEmails,
    telephones: phones,
    instagram: findSocial("instagram.com"),
    linkedin: findSocial("linkedin.com"),
    facebook: findSocial("facebook.com"),
    copyrightYear,
    hasBookingWidget,
    htmlSize: html.length,
  };
}
