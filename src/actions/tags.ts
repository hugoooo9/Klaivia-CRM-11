// Server Actions — Tags libres + assignation many-to-many
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const tagSchema = z.object({
  label: z.string().min(1, "Label requis").max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur HEX invalide")
    .default("#5B3FA6"),
});

export async function createTag(input: { label: string; color?: string }) {
  const parsed = tagSchema.parse({ label: input.label, color: input.color ?? "#5B3FA6" });
  const tag = await db.tag.create({ data: parsed });
  revalidatePath("/tags");
  revalidatePath("/prospects");
  return tag;
}

export async function deleteTag(id: string) {
  await db.tag.delete({ where: { id } });
  revalidatePath("/tags");
  revalidatePath("/prospects");
  return { ok: true };
}

export async function attachTag(prospectId: string, tagId: string) {
  await db.prospectTag.upsert({
    where: { prospectId_tagId: { prospectId, tagId } },
    create: { prospectId, tagId },
    update: {},
  });
  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/prospects");
  return { ok: true };
}

export async function detachTag(prospectId: string, tagId: string) {
  await db.prospectTag.delete({
    where: { prospectId_tagId: { prospectId, tagId } },
  });
  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/prospects");
  return { ok: true };
}
