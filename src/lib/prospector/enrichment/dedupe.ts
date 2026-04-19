// Dédoublonnage : un prospect existant (manuel OU auto) avec même UID est MIS À JOUR
// plutôt que dupliqué. Match primaire sur numeroIDE (index unique).
// Match secondaire (fuzzy) sur raisonSociale + ville si UID absent.

import { db } from "@/lib/db";
import type { ZefixCompany } from "../sources/zefix";

/**
 * Upsert à partir des données Zefix filtrées ICP.
 * - Si numeroIDE existe : update les champs auto, laisse les champs manuels (prenom, nom, statut commercial, notes) inchangés.
 * - Sinon : crée le prospect avec source=AUTO_ZEFIX.
 */
export async function upsertFromZefix(
  company: ZefixCompany,
  nogaGuessed: string | null,
): Promise<{ id: string; created: boolean }> {
  const uid = company.uid;
  if (!uid) throw new Error("Zefix company sans UID");

  const existing = await db.prospect.findUnique({ where: { numeroIDE: uid } });

  const addr = company.address;
  const adresseLine = addr
    ? [addr.street, addr.houseNumber].filter(Boolean).join(" ")
    : null;

  const sharedData = {
    raisonSociale: company.name,
    entreprise: company.name, // miroir pour l'UI existante
    canton: company.canton || company.legalSeat || null,
    ville: addr?.town || null,
    npa: addr?.swissZipCode || null,
    adresse: adresseLine,
    secteurNOGA: nogaGuessed,
    source: "AUTO_ZEFIX",
    enrichissementAuto: true,
    pipelineAuto: existing?.pipelineAuto ?? "NEW",
  };

  if (existing) {
    // Ne jamais écraser un prospect manuel en cours (statut, pack, notes, prenom/nom saisis)
    await db.prospect.update({
      where: { id: existing.id },
      data: sharedData,
    });
    return { id: existing.id, created: false };
  }

  const created = await db.prospect.create({
    data: {
      numeroIDE: uid,
      prenom: "—",        // rempli ultérieurement via enrichment
      nom: "—",           // (contact nommé via localCh / scraping site)
      secteur: "",        // laissé vide, NOGA est la source de vérité auto
      canal: "",          // pas encore approché
      statut: "Nouveau",  // pipeline commercial
      ...sharedData,
    },
  });
  return { id: created.id, created: true };
}
