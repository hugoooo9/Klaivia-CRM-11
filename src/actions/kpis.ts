// Server Actions — KPIs hebdomadaires (saisie manuelle)
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { kpiSchema, type KPIInput } from "@/lib/validations";

// Upsert sur (annee, semaine) — on écrase si la ligne existe déjà
export async function upsertKPI(input: KPIInput) {
  const parsed = kpiSchema.parse(input);
  const kpi = await db.kPI.upsert({
    where: {
      annee_semaine: { annee: parsed.annee, semaine: parsed.semaine },
    },
    create: { ...parsed, date: new Date() },
    update: { ...parsed, date: new Date() },
  });
  revalidatePath("/kpis");
  revalidatePath("/dashboard");
  return kpi;
}

export async function deleteKPI(id: string) {
  await db.kPI.delete({ where: { id } });
  revalidatePath("/kpis");
  revalidatePath("/dashboard");
}
