// Vérification opt-out (LPD) — appelée avant ENRICHISSEMENT et avant GÉNÉRATION de message.
import { db } from "@/lib/db";

/**
 * Retourne true si l'email OU le domaine est en liste noire.
 * Accepte un email complet ("foo@bar.ch") ou un domaine ("bar.ch").
 */
export async function isOptedOut(emailOrDomain: string): Promise<boolean> {
  const v = emailOrDomain.toLowerCase().trim();
  if (!v) return false;
  const domain = v.includes("@") ? v.split("@")[1] : v;

  const hit = await db.optOut.findFirst({
    where: {
      OR: [{ valeur: v }, { valeur: domain }],
    },
  });
  return !!hit;
}

/**
 * Filtre un tableau d'emails en retirant ceux opt-out.
 */
export async function filterOptedOut(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const checks = await Promise.all(emails.map((e) => isOptedOut(e)));
  return emails.filter((_, i) => !checks[i]);
}

export async function addOptOut(valeur: string, type: "EMAIL" | "DOMAIN", raison?: string) {
  return db.optOut.upsert({
    where: { valeur: valeur.toLowerCase().trim() },
    create: { valeur: valeur.toLowerCase().trim(), type, raison },
    update: { type, raison },
  });
}
