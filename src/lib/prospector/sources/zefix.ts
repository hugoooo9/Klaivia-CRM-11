// Source : Zefix (Registre du Commerce fédéral suisse)
// API publique REST — https://www.zefix.ch/ZefixPublicREST/
// Gratuit, pas de clé requise. Rate limit conservatoire : 1 req/s.
//
// ⚠ Zefix ne renvoie PAS de code NOGA directement (NOGA vient du BFS/STATENT).
// On approxime NOGA par KEYWORD MATCHING sur le champ `purpose` (but statutaire).
// Si `ZEFIX_SKIP_NOGA_HEURISTIC=true`, on skip le filtrage NOGA (pour debug).

import { RATE_LIMITS, USER_AGENT, isNpaRomand, isNogaAllowed, ROMAND_CANTONS, type RomandCanton } from "../constants";

const ZEFIX_BASE = process.env.ZEFIX_BASE_URL || "https://www.zefix.ch/ZefixPublicREST";

// ─── Types (subset de la réponse Zefix) ───
export type ZefixAddress = {
  street?: string;
  houseNumber?: string;
  swissZipCode?: string;
  town?: string;
  country?: string;
};

export type ZefixCompany = {
  uid: string;                    // CHE-xxx.xxx.xxx (numéro IDE)
  uidFormatted?: string;
  name: string;                   // raison sociale
  legalSeatId?: number;
  legalSeat?: string;             // canton (VD, GE, ...)
  legalForm?: { id: number; shortName: string | null; name: { de: string; fr: string; it: string } };
  status?: string;                // ACTIVE, DELETED, ...
  address?: ZefixAddress;
  purpose?: string;               // but statutaire — utilisé pour heuristique NOGA
  sogcDate?: string;              // date publication SHAB (ISO)
  chid?: string;
  canton?: string;
};

// ─── Heuristique NOGA via keyword match sur purpose ───
// Clé = NOGA code, valeur = regex cherchée dans `purpose` (case-insensitive)
const PURPOSE_TO_NOGA: Array<{ noga: string; re: RegExp }> = [
  { noga: "96.02", re: /\b(coiffur|salon.+coiffure|barbier)\b/i },
  { noga: "96.04", re: /\b(spa|institut.+beaut|massage|esth[ée]tique|bien-?[êe]tre)\b/i },
  { noga: "43.21", re: /\b([ée]lectricit[ée]|installations?\s+[ée]lectriques?)\b/i },
  { noga: "43.22", re: /\b(plomberie|sanitaire|chauffage|climatisation|ventilation)\b/i },
  { noga: "43.31", re: /\b(pl[âa]trerie|cr[ée]pissage)\b/i },
  { noga: "43.32", re: /\b(menuiserie|[ée]b[ée]nisterie|charpenterie)\b/i },
  { noga: "43.33", re: /\b(carrelage|rev[êe]tement.+sol|parquet)\b/i },
  { noga: "43.34", re: /\b(peinture|peintre|vitrerie)\b/i },
  { noga: "86.21", re: /\b(cabinet\s+m[ée]dical|m[ée]decin|g[ée]n[ée]raliste)\b/i },
  { noga: "86.22", re: /\b(sp[ée]cialiste.+m[ée]decin|cardiologie|dermatologie|p[ée]diatrie|gyn[ée]cologie)\b/i },
  { noga: "86.23", re: /\b(dentiste|cabinet\s+dentaire|orthodontie)\b/i },
  { noga: "69.20", re: /\b(fiduciaire|expertise\s+comptable|comptabilit[ée]|r[ée]vision|fiscalit[ée])\b/i },
  { noga: "68.31", re: /\b(agence\s+immobili[èe]re|immobilier|courtage\s+immobilier|g[ée]rance)\b/i },
  { noga: "56.10", re: /\b(restaurant|restauration|caf[ée]-restaurant|brasserie|pizzeria)\b/i },
  { noga: "55.10", re: /\b(h[ôo]tel|h[ôo]tellerie)\b/i },
  { noga: "55.20", re: /\b(appartement\s+de\s+vacances|gîte|chambre\s+d'h[ôo]te|bed\s+and\s+breakfast)\b/i },
  { noga: "93.13", re: /\b(fitness|salle\s+de\s+sport|remise\s+en\s+forme|crossfit)\b/i },
];

export function guessNogaFromPurpose(purpose: string | null | undefined): string | null {
  if (!purpose) return null;
  for (const { noga, re } of PURPOSE_TO_NOGA) {
    if (re.test(purpose)) return noga;
  }
  return null;
}

// ─── Rate-limited fetch (1 req/s) ───
let lastZefixCall = 0;
async function zefixFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, RATE_LIMITS.ZEFIX - (now - lastZefixCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastZefixCall = Date.now();

  const url = path.startsWith("http") ? path : `${ZEFIX_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Zefix ${res.status} ${res.statusText} on ${path}`);
  }
  return (await res.json()) as T;
}

/** Récupère le détail d'une société par UID (CHE-xxx.xxx.xxx). */
export async function fetchZefixByUid(uid: string): Promise<ZefixCompany | null> {
  try {
    const data = await zefixFetch<ZefixCompany[]>(`/api/v1/company/uid/${encodeURIComponent(uid)}`);
    return data[0] || null;
  } catch (e) {
    if ((e as Error).message.includes("404")) return null;
    throw e;
  }
}

/**
 * Recherche paginée de sociétés par canton.
 * Utilisé par le cron quotidien pour backfill les nouvelles immatriculations.
 */
export async function searchZefixByCanton(
  canton: RomandCanton,
  opts: { maxResults?: number; activeOnly?: boolean } = {},
): Promise<ZefixCompany[]> {
  const { maxResults = 200, activeOnly = true } = opts;
  const body = {
    name: "",
    languageKey: "fr",
    activeOnly,
    canton,
    maxEntries: Math.min(maxResults, 200), // Zefix cap
  };
  const data = await zefixFetch<ZefixCompany[]>("/api/v1/company/search", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data;
}

// ─── Filtrage ICP (AVANT insertion DB) ───
export type IcpFilterResult = {
  accepted: boolean;
  reason?: string;        // pourquoi rejeté
  nogaGuessed?: string;   // code NOGA déduit du purpose
};

export function applyIcpFilter(company: ZefixCompany): IcpFilterResult {
  // 1. Canton romand
  const canton = company.canton || company.legalSeat;
  if (!canton || !(ROMAND_CANTONS as readonly string[]).includes(canton)) {
    return { accepted: false, reason: `canton non-romand: ${canton ?? "N/A"}` };
  }

  // 2. NPA romand (whitelist de plages)
  const npa = company.address?.swissZipCode;
  if (!isNpaRomand(npa, canton)) {
    return { accepted: false, reason: `NPA hors zone romande: ${npa ?? "N/A"}` };
  }

  // 3. Société active
  if (company.status && company.status !== "ACTIVE" && company.status !== "EXISTING") {
    return { accepted: false, reason: `statut RC: ${company.status}` };
  }

  // 4. NOGA whitelist (heuristique sur purpose)
  const skipNoga = process.env.ZEFIX_SKIP_NOGA_HEURISTIC === "true";
  const nogaGuessed = guessNogaFromPurpose(company.purpose);
  if (!skipNoga) {
    if (!nogaGuessed || !isNogaAllowed(nogaGuessed)) {
      return { accepted: false, reason: `NOGA hors whitelist (purpose: "${company.purpose?.slice(0, 80) ?? "N/A"}")` };
    }
  }

  return { accepted: true, nogaGuessed: nogaGuessed ?? undefined };
}
