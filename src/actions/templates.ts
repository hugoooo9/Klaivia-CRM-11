// Server Actions — Templates email/LinkedIn réutilisables
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const templateSchema = z.object({
  nom: z.string().min(1, "Nom requis").max(100),
  type: z.enum(["EMAIL", "LINKEDIN", "DM", "NOTE"]),
  sujet: z.string().max(200).optional().or(z.literal("")),
  contenu: z.string().min(1, "Contenu requis").max(10000),
});

export type TemplateInput = z.infer<typeof templateSchema>;

export async function createTemplate(input: TemplateInput) {
  const parsed = templateSchema.parse(input);
  const t = await db.template.create({
    data: {
      nom: parsed.nom,
      type: parsed.type,
      sujet: parsed.sujet || null,
      contenu: parsed.contenu,
    },
  });
  revalidatePath("/templates");
  return t;
}

export async function updateTemplate(id: string, input: TemplateInput) {
  const parsed = templateSchema.parse(input);
  const t = await db.template.update({
    where: { id },
    data: {
      nom: parsed.nom,
      type: parsed.type,
      sujet: parsed.sujet || null,
      contenu: parsed.contenu,
    },
  });
  revalidatePath("/templates");
  return t;
}

export async function deleteTemplate(id: string) {
  await db.template.delete({ where: { id } });
  revalidatePath("/templates");
  return { ok: true };
}

