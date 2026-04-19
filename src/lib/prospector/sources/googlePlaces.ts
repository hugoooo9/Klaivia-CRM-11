// Source : Google Places API (New) — https://developers.google.com/maps/documentation/places/web-service
// Requiert GOOGLE_PLACES_API_KEY. Rate limit très permissif (>10 rps) mais payant ($$).
// Utilisé pour : rating, nb avis, horaires, site web, téléphone, adresse formatée.

import { RATE_LIMITS, USER_AGENT } from "../constants";

const PLACES_BASE = "https://places.googleapis.com/v1";

let lastCall = 0;
async function throttledFetch(url: string, init: RequestInit): Promise<Response> {
  const wait = Math.max(0, RATE_LIMITS.GOOGLE_PLACES - (Date.now() - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  return fetch(url, init);
}

function getKey(): string {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  if (!k) throw new Error("GOOGLE_PLACES_API_KEY manquante — enrichissement Google désactivé");
  return k;
}

export type GooglePlaceResult = {
  placeId: string;
  nom: string;
  adresse?: string;
  telephone?: string;
  siteWeb?: string;
  rating?: number;
  reviewsCount?: number;
  horairesTexte?: string[];
  businessStatus?: string;
};

export type GoogleReview = {
  rating: number;
  texte: string;
  publishTime: string; // ISO
  authorName?: string;
};

const FIELD_MASK_DETAILS = [
  "id",
  "displayName",
  "formattedAddress",
  "internationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "regularOpeningHours",
  "businessStatus",
].join(",");

const FIELD_MASK_REVIEWS = "reviews";

/** Cherche un établissement via textSearch + ville. */
export async function searchGooglePlace(
  raisonSociale: string,
  ville: string,
): Promise<GooglePlaceResult | null> {
  const key = getKey();
  const res = await throttledFetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": `places.${FIELD_MASK_DETAILS.split(",").join(",places.")}`,
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      textQuery: `${raisonSociale} ${ville}`,
      languageCode: "fr",
      regionCode: "CH",
    }),
  });
  if (!res.ok) throw new Error(`Google Places search ${res.status}`);
  const data = (await res.json()) as { places?: Array<Record<string, unknown>> };
  const p = data.places?.[0];
  if (!p) return null;

  return mapPlace(p);
}

/** Récupère les avis récents (maxReviews) d'un place_id. */
export async function fetchRecentReviews(
  placeId: string,
  sinceDays = 30,
): Promise<GoogleReview[]> {
  const key = getKey();
  const res = await throttledFetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=fr&regionCode=CH`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK_REVIEWS,
        "User-Agent": USER_AGENT,
      },
    },
  );
  if (!res.ok) throw new Error(`Google Places reviews ${res.status}`);
  const data = (await res.json()) as { reviews?: Array<Record<string, unknown>> };
  const cutoff = Date.now() - sinceDays * 86400 * 1000;
  return (data.reviews ?? [])
    .map((r) => ({
      rating: Number(r.rating ?? 0),
      texte: String((r.text as { text?: string })?.text ?? ""),
      publishTime: String(r.publishTime ?? ""),
      authorName: (r.authorAttribution as { displayName?: string })?.displayName,
    }))
    .filter((r) => r.publishTime && new Date(r.publishTime).getTime() >= cutoff);
}

function mapPlace(p: Record<string, unknown>): GooglePlaceResult {
  return {
    placeId: String(p.id),
    nom: String((p.displayName as { text?: string })?.text ?? ""),
    adresse: p.formattedAddress as string | undefined,
    telephone: p.internationalPhoneNumber as string | undefined,
    siteWeb: p.websiteUri as string | undefined,
    rating: p.rating as number | undefined,
    reviewsCount: p.userRatingCount as number | undefined,
    horairesTexte: (p.regularOpeningHours as { weekdayDescriptions?: string[] })?.weekdayDescriptions,
    businessStatus: p.businessStatus as string | undefined,
  };
}
