// Constantes Prospecteur Klaivia — ICP Suisse romande
// Utilisé pour filtrer AVANT insertion en DB (jamais d'import massif).

// ─── NOGA whitelist (codes 2008) ───
// Secteurs TPE/PME romands où l'agent IA Klaivia a le plus d'impact :
// appels manqués, RDV no-show, devis tardifs, support niveau 1.
export const NOGA_WHITELIST = [
  "96.02",  // Coiffure & soins capillaires
  "96.04",  // Entretien corporel (spa, instituts)
  "43.21",  // Électricité bâtiment
  "43.22",  // Plomberie / chauffage / climatisation
  "43.31",  // Plâtrerie
  "43.32",  // Menuiserie
  "43.33",  // Revêtement sols & murs
  "43.34",  // Peinture & vitrerie
  "86.21",  // Médecins généralistes
  "86.22",  // Spécialistes
  "86.23",  // Dentistes
  "69.20",  // Fiduciaires / expertise comptable
  "68.31",  // Agences immobilières
  "56.10",  // Restaurants
  "55.10",  // Hôtels
  "55.20",  // Hébergements courte durée
  "93.13",  // Fitness / centres de remise en forme
] as const;
export type NogaCode = (typeof NOGA_WHITELIST)[number];

export function isNogaAllowed(code: string | null | undefined): boolean {
  if (!code) return false;
  // Zefix renvoie parfois "96.02.00" — on compare les 5 premiers chars
  const short = code.slice(0, 5);
  return (NOGA_WHITELIST as readonly string[]).includes(short);
}

// ─── Cantons romands autorisés ───
export const ROMAND_CANTONS = ["VD", "GE", "VS", "FR", "NE", "JU", "BE"] as const;
export type RomandCanton = (typeof ROMAND_CANTONS)[number];

// ─── NPA romands (whitelist de plages) ───
// Source : La Poste CH — plages principales par canton francophone.
// BE : uniquement Jura bernois (francophone). VS : uniquement Bas-Valais (1800-1999).
// FR : exclusion du district de la Sense (germanophone).
type NpaRange = readonly [number, number];

const NPA_RANGES: Record<RomandCanton, readonly NpaRange[]> = {
  VD: [[1000, 1299], [1300, 1499], [1510, 1699], [1800, 1897]],
  GE: [[1200, 1299], [1290, 1299]],
  VS: [[1890, 1999]], // Bas-Valais francophone (Martigny, Monthey, Sion, Sierre côté fr)
  FR: [[1470, 1489], [1500, 1599], [1630, 1789]], // hors Sense/Murtenland
  NE: [[2000, 2149], [2300, 2416]],
  JU: [[2800, 2999]],
  BE: [[2500, 2502], [2710, 2748]], // Jura bernois + Biel-Bienne bilingue
};

// NPA à exclure même s'ils tombent dans une plage (communes germanophones enclavées)
const NPA_BLACKLIST = new Set<number>([
  3175, 3176, 3177, 3178, 3183, 3184, 3185, 3186, // Sense / Singine FR
]);

export function isNpaRomand(npa: string | number | null | undefined, canton?: string): boolean {
  if (npa == null) return false;
  const n = typeof npa === "string" ? parseInt(npa, 10) : npa;
  if (!Number.isFinite(n)) return false;
  if (NPA_BLACKLIST.has(n)) return false;

  // Si canton fourni, check sa plage uniquement
  if (canton && (ROMAND_CANTONS as readonly string[]).includes(canton)) {
    const ranges = NPA_RANGES[canton as RomandCanton];
    return ranges.some(([lo, hi]) => n >= lo && n <= hi);
  }

  // Sinon check toutes les plages romandes
  return Object.values(NPA_RANGES).some((ranges) =>
    ranges.some(([lo, hi]) => n >= lo && n <= hi),
  );
}

// ─── Taille entreprise max (employés) ───
export const MAX_EMPLOYEES = 20;

// ─── Rate limits (ms entre requêtes par source) ───
export const RATE_LIMITS = {
  ZEFIX: 1000,       // 1 req/s
  LOCAL_CH: 1500,    // conservateur
  GOOGLE_PLACES: 100, // Google autorise >10 rps, on reste poli
  WEBSITE: 2000,     // scraping sites tiers
} as const;

// ─── User agent pour traçabilité ───
export const USER_AGENT = "KlaiviaBot/1.0 (+contact@klaivia.ch)";

// ─── Prompt version (stocké dans ApproachMessage pour A/B) ───
export const PROMPT_VERSION_APPROACH = "v1.0.0-2026-04";
export const PROMPT_VERSION_SCORING = "v1.0.0-2026-04";
