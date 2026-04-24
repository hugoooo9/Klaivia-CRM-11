// Auth simple — passwords partagés via env, cookie httpOnly signé HMAC
// Usage : Klaivia étant interne (2 users), pas besoin de DB users / sessions persistées.
// Le cookie stocke un token = base64(HMAC-SHA256(AUTH_SECRET, "ok")), recalculé à la vérif.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "klaivia_session";
const TOKEN_PAYLOAD = "ok";

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET manquant ou trop court (>= 16 chars)");
  }
  return s;
}

export function getValidPasswords(): string[] {
  const raw = process.env.AUTH_PASSWORDS || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function isPasswordValid(input: string): boolean {
  const passwords = getValidPasswords();
  if (passwords.length === 0) return false;
  // Comparaison en temps constant pour chaque candidat
  return passwords.some((p) => {
    if (p.length !== input.length) return false;
    try {
      return timingSafeEqual(Buffer.from(p), Buffer.from(input));
    } catch {
      return false;
    }
  });
}

export function signSessionToken(): string {
  return createHmac("sha256", getSecret()).update(TOKEN_PAYLOAD).digest("base64url");
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = signSessionToken();
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
