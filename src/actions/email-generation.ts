// Server Actions — génération + envoi + brouillon de mails d'approche IA
// Auth gérée par le proxy.ts middleware (cookie HMAC) — pas de check explicite ici.
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { generateEmailWithRetry, type GeneratedEmail } from "@/lib/gemini";

// 1. Génère un mail via Gemini à partir des infos du prospect
export async function generateApproachEmail(prospectId: string): Promise<GeneratedEmail> {
  if (!prospectId) throw new Error("prospectId requis");

  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: {
      entreprise: true,
      prenom: true,
      nom: true,
      ville: true,
      secteur: true,
      canal: true,
      urgence: true,
      score: true,
      notes: true,
    },
  });
  if (!prospect) throw new Error("Prospect introuvable");

  try {
    return await generateEmailWithRetry({
      entreprise: prospect.entreprise,
      prenom: prospect.prenom === "—" ? null : prospect.prenom,
      nom: prospect.nom === "—" ? null : prospect.nom,
      ville: prospect.ville,
      secteur: prospect.secteur || null,
      canal: prospect.canal || null,
      urgence: prospect.urgence,
      score: prospect.score,
      notes: prospect.notes,
    });
  } catch (e) {
    // Log côté serveur pour Hostinger logs
    console.error("[generateApproachEmail] échec:", (e as Error).message);
    // Re-throw avec message clair pour le client
    throw e instanceof Error ? e : new Error(String(e));
  }
}

// 2. Sauvegarde un brouillon (sans envoi)
export async function saveDraftEmail(input: {
  prospectId: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || !body) throw new Error("Objet et corps requis");

  const draft = await db.prospectEmail.create({
    data: {
      prospectId: input.prospectId,
      subject,
      body,
      status: "draft",
      sentAt: null,
    },
  });

  await db.activity.create({
    data: {
      prospectId: input.prospectId,
      type: "EMAIL_DRAFT",
      description: `Brouillon enregistré : ${subject}`,
    },
  });

  revalidatePath(`/prospects/${input.prospectId}`);
  return { id: draft.id };
}

// 3. Envoie un mail via SMTP, l'archive comme "sent", passe le statut à Contacté si Nouveau
export async function sendApproachEmailV2(input: {
  prospectId: string;
  subject: string;
  body: string;
}): Promise<{ id: string; messageId: string }> {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || !body) throw new Error("Objet et corps requis");

  const prospect = await db.prospect.findUnique({
    where: { id: input.prospectId },
    select: { id: true, email: true, statut: true, entreprise: true, prenom: true, nom: true },
  });
  if (!prospect) throw new Error("Prospect introuvable");
  if (!prospect.email) {
    throw new Error("Ce prospect n'a pas d'adresse email renseignée.");
  }

  const { messageId } = await sendMail({
    to: prospect.email,
    subject,
    text: body,
  });

  const sent = await db.prospectEmail.create({
    data: {
      prospectId: prospect.id,
      subject,
      body,
      status: "sent",
      sentAt: new Date(),
    },
  });

  await db.activity.create({
    data: {
      prospectId: prospect.id,
      type: "EMAIL_SENT",
      description: `Email envoyé à ${prospect.email} : ${subject}`,
    },
  });

  // Avance le statut si "Nouveau"
  if (prospect.statut === "Nouveau") {
    await db.prospect.update({
      where: { id: prospect.id },
      data: { statut: "Contacté" },
    });
    await db.activity.create({
      data: {
        prospectId: prospect.id,
        type: "STATUT_CHANGE",
        description: "Nouveau → Contacté (auto via envoi mail IA)",
      },
    });
  }

  revalidatePath(`/prospects/${prospect.id}`);
  revalidatePath("/prospects");
  revalidatePath("/dashboard");

  return { id: sent.id, messageId };
}

// 4. Supprime un mail (brouillon ou archive)
export async function deleteProspectEmail(id: string, prospectId: string): Promise<{ ok: true }> {
  await db.prospectEmail.delete({ where: { id } });
  revalidatePath(`/prospects/${prospectId}`);
  return { ok: true };
}
