// Server Actions — clients (conversion, update, churn, NPS)
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { clientSchema, type ClientInput } from "@/lib/validations";

// Convertit un prospect en client. Force le statut du prospect à "Signé".
export async function convertProspectToClient(input: ClientInput) {
  const parsed = clientSchema.parse(input);

  // Empêche la double conversion
  const existing = await db.client.findUnique({ where: { prospectId: parsed.prospectId } });
  if (existing) throw new Error("Ce prospect a déjà un client associé");

  const client = await db.client.create({
    data: {
      prospectId: parsed.prospectId,
      pack: parsed.pack,
      mrrCHF: parsed.mrrCHF,
      setupCHF: parsed.setupCHF,
      dateDebut: new Date(parsed.dateDebut),
      prochainRDV: parsed.prochainRDV ? new Date(parsed.prochainRDV) : null,
      nps: parsed.nps ?? null,
      statut: parsed.statut,
      notes: parsed.notes || null,
    },
  });

  await db.prospect.update({
    where: { id: parsed.prospectId },
    data: { statut: "Signé", packInteret: parsed.pack },
  });

  revalidatePath("/clients");
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${parsed.prospectId}`);
  revalidatePath("/dashboard");
  return client;
}

export async function updateClient(id: string, input: Partial<ClientInput>) {
  const data: Record<string, unknown> = {};
  if (input.pack) data.pack = input.pack;
  if (input.mrrCHF != null) data.mrrCHF = input.mrrCHF;
  if (input.setupCHF != null) data.setupCHF = input.setupCHF;
  if (input.dateDebut) data.dateDebut = new Date(input.dateDebut);
  if (input.prochainRDV !== undefined) {
    data.prochainRDV = input.prochainRDV ? new Date(input.prochainRDV) : null;
  }
  if (input.nps !== undefined) data.nps = input.nps;
  if (input.statut) data.statut = input.statut;
  if (input.notes !== undefined) data.notes = input.notes || null;

  const c = await db.client.update({ where: { id }, data });
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return c;
}

export async function markClientChurned(id: string, raison: string) {
  const c = await db.client.update({
    where: { id },
    data: {
      statut: "Churné",
      notes: `Churn : ${raison}`,
    },
  });
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return c;
}

export async function setClientNPS(id: string, nps: number) {
  if (nps < 0 || nps > 10) throw new Error("NPS doit être entre 0 et 10");
  const c = await db.client.update({ where: { id }, data: { nps } });
  revalidatePath("/clients");
  return c;
}

export async function setClientNextRDV(id: string, date: string) {
  const c = await db.client.update({
    where: { id },
    data: { prochainRDV: new Date(date) },
  });
  revalidatePath("/clients");
  return c;
}
