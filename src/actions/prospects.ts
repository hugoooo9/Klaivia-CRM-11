// Server Actions — CRUD prospects + mutations rapides (statut, score)
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { prospectSchema, type ProspectInput } from "@/lib/validations";
import { STATUTS_PROSPECT, type StatutProspect } from "@/lib/constants";

// Helper : reconstruit les dates à partir de strings
function buildData(input: ProspectInput) {
  return {
    prenom: input.prenom || "—",
    nom: input.nom || "—",
    entreprise: input.entreprise,
    ville: input.ville || null,
    email: input.email || null,
    phone: input.phone || null,
    instagram: input.instagram || null,
    linkedin: input.linkedin || null,
    secteur: input.secteur || "",
    canal: input.canal || "",
    statut: input.statut,
    urgence: input.urgence,
    score: input.score,
    prochainStep: input.prochainStep ? new Date(input.prochainStep) : null,
    packInteret: input.packInteret || null,
    budgetEstime: input.budgetEstime ?? null,
    setupEstime: input.setupEstime ?? null,
    notes: input.notes || null,
    raisonPerte: input.raisonPerte || null,
  };
}

async function logActivity(prospectId: string, type: string, description: string, meta?: Record<string, unknown>) {
  await db.activity.create({
    data: {
      prospectId,
      type,
      description,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}

export async function createProspect(input: ProspectInput) {
  const parsed = prospectSchema.parse(input);
  const p = await db.prospect.create({ data: buildData(parsed) });
  await logActivity(p.id, "CREATED", `Prospect créé : ${p.entreprise ?? p.prenom + " " + p.nom}`);
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  return p;
}

export async function updateProspect(id: string, input: ProspectInput) {
  const parsed = prospectSchema.parse(input);
  const before = await db.prospect.findUnique({ where: { id }, select: { statut: true } });
  const p = await db.prospect.update({ where: { id }, data: buildData(parsed) });
  if (before && before.statut !== p.statut) {
    await logActivity(id, "STATUT_CHANGE", `${before.statut} → ${p.statut}`, {
      from: before.statut,
      to: p.statut,
    });
  }
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${id}`);
  revalidatePath("/dashboard");
  return p;
}

export async function deleteProspect(id: string) {
  await db.prospect.delete({ where: { id } });
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
}

// Avance au statut suivant dans la séquence STATUTS_PROSPECT (sans dépasser "Signé")
export async function advanceProspectStatut(id: string) {
  const prospect = await db.prospect.findUnique({ where: { id } });
  if (!prospect) throw new Error("Prospect introuvable");
  const idx = STATUTS_PROSPECT.indexOf(prospect.statut as StatutProspect);
  // Pas d'avancement si déjà Signé/Perdu ou statut inconnu
  if (idx < 0 || idx >= STATUTS_PROSPECT.indexOf("Signé")) return prospect;
  const nextStatut = STATUTS_PROSPECT[idx + 1];
  const updated = await db.prospect.update({
    where: { id },
    data: { statut: nextStatut },
  });
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${id}`);
  revalidatePath("/dashboard");
  return updated;
}

export async function changeProspectStatut(id: string, statut: StatutProspect) {
  const before = await db.prospect.findUnique({ where: { id }, select: { statut: true } });
  const updated = await db.prospect.update({
    where: { id },
    data: { statut },
  });
  if (before && before.statut !== statut) {
    await logActivity(id, "STATUT_CHANGE", `${before.statut} → ${statut}`, {
      from: before.statut,
      to: statut,
    });
  }
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${id}`);
  revalidatePath("/dashboard");
  return updated;
}

export async function updateProspectScore(id: string, score: number) {
  if (score < 1 || score > 5) throw new Error("Score invalide (1-5)");
  const updated = await db.prospect.update({
    where: { id },
    data: { score },
  });
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${id}`);
  return updated;
}

// Reporter le prochain step de +days jours à partir d'aujourd'hui
export async function snoozeProspect(id: string, days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  const updated = await db.prospect.update({
    where: { id },
    data: { prochainStep: d },
  });
  revalidatePath("/prospects");
  revalidatePath("/actions-du-jour");
  revalidatePath(`/prospects/${id}`);
  return updated;
}

// Actions en masse — appliquées à une sélection de prospects
export async function bulkChangeStatut(ids: string[], statut: StatutProspect) {
  if (ids.length === 0) return { count: 0 };
  const res = await db.prospect.updateMany({
    where: { id: { in: ids } },
    data: { statut },
  });
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  return { count: res.count };
}

export async function bulkDeleteProspects(ids: string[]) {
  if (ids.length === 0) return { count: 0 };
  const res = await db.prospect.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  return { count: res.count };
}

export async function bulkSnooze(ids: string[], days: number) {
  if (ids.length === 0) return { count: 0 };
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  const res = await db.prospect.updateMany({
    where: { id: { in: ids } },
    data: { prochainStep: d },
  });
  revalidatePath("/prospects");
  revalidatePath("/actions-du-jour");
  return { count: res.count };
}

// Marquer comme perdu avec raison (utilisé depuis dialog de confirmation)
export async function markProspectPerdu(id: string, raison: string) {
  const updated = await db.prospect.update({
    where: { id },
    data: { statut: "Perdu", raisonPerte: raison },
  });
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${id}`);
  revalidatePath("/dashboard");
  return updated;
}
