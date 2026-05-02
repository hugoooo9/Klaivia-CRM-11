// Server Actions — pièces jointes (PDF, devis, contrats) liées à un prospect
// Stockage : base64 dans colonne TEXT (compat Prisma + SQLite Hostinger).
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB par fichier
const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export type UploadAttachmentResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function uploadAttachment(
  prospectId: string,
  formData: FormData,
): Promise<UploadAttachmentResult> {
  try {
    if (!prospectId) return { ok: false, error: "prospectId requis" };

    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Fichier manquant" };
    if (file.size === 0) return { ok: false, error: "Fichier vide" };
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `Fichier trop volumineux (max ${MAX_BYTES / 1024 / 1024} MB)` };
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return {
        ok: false,
        error: `Type non autorisé (${file.type}). Acceptés : PDF, Word, PNG, JPEG, WEBP.`,
      };
    }

    const exists = await db.prospect.findUnique({ where: { id: prospectId }, select: { id: true } });
    if (!exists) return { ok: false, error: "Prospect introuvable" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const att = await db.attachment.create({
      data: {
        prospectId,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        dataBase64: base64,
      },
      select: { id: true },
    });

    await db.activity.create({
      data: {
        prospectId,
        type: "ATTACHMENT_UPLOADED",
        description: `Pièce jointe ajoutée : ${file.name}`,
      },
    });

    revalidatePath(`/prospects/${prospectId}`);
    return { ok: true, id: att.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[uploadAttachment] échec:", msg);
    return { ok: false, error: msg };
  }
}

export async function deleteAttachment(
  id: string,
  prospectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await db.attachment.delete({ where: { id } });
    revalidatePath(`/prospects/${prospectId}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
