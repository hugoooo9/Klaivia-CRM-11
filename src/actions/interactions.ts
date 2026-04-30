// Server Actions — interactions (notes, DM, emails, appels, démos, relances)
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { interactionSchema, type InteractionInput } from "@/lib/validations";

export async function createInteraction(input: InteractionInput) {
  const parsed = interactionSchema.parse(input);

  const interaction = await db.interaction.create({
    data: {
      prospectId: parsed.prospectId,
      type: parsed.type,
      contenu: parsed.contenu,
    },
  });

  await db.activity.create({
    data: {
      prospectId: parsed.prospectId,
      type: "INTERACTION",
      description: `${parsed.type} : ${parsed.contenu.slice(0, 80)}${parsed.contenu.length > 80 ? "…" : ""}`,
    },
  });

  // Met à jour le prochain step sur le prospect si demandé
  if (parsed.nextStepDays != null && parsed.nextStepDays > 0) {
    const nextStep = new Date();
    nextStep.setDate(nextStep.getDate() + parsed.nextStepDays);
    nextStep.setHours(9, 0, 0, 0);
    await db.prospect.update({
      where: { id: parsed.prospectId },
      data: { prochainStep: nextStep },
    });
  }

  revalidatePath(`/prospects/${parsed.prospectId}`);
  revalidatePath("/prospects");
  revalidatePath("/actions-du-jour");
  revalidatePath("/dashboard");
  return interaction;
}

export async function deleteInteraction(id: string, prospectId: string) {
  await db.interaction.delete({ where: { id } });
  revalidatePath(`/prospects/${prospectId}`);
}
