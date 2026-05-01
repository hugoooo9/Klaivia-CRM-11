// Server Actions — génération + envoi + brouillon de mails d'approche IA
// Auth gérée par le proxy.ts middleware (cookie HMAC) — pas de check explicite ici.
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { generateEmailWithRetry, type GeneratedEmail } from "@/lib/gemini";

export type GenerateResult =
  | { ok: true; subject: string; body: string }
  | { ok: false; error: string };

// 1. Génère un mail via Gemini à partir des infos du prospect
// Retourne {ok, ...} au lieu de throw pour que les erreurs traversent
// la frontière Server Action sans être masquées en prod par Next.js.
export async function generateApproachEmail(prospectId: string): Promise<GenerateResult> {
  try {
    if (!prospectId) return { ok: false, error: "prospectId requis" };

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
    if (!prospect) return { ok: false, error: "Prospect introuvable" };

    const result = await generateEmailWithRetry({
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
    return { ok: true, subject: result.subject, body: result.body };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generateApproachEmail] échec:", msg);
    return { ok: false, error: msg };
  }
}

// 2. Sauvegarde un brouillon (sans envoi)
export async function saveDraftEmail(input: {
  prospectId: string;
  subject: string;
  body: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject || !body) return { ok: false, error: "Objet et corps requis" };

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
    return { ok: true, id: draft.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[saveDraftEmail] échec:", msg);
    return { ok: false, error: msg };
  }
}

// 3. Envoie un mail via SMTP, l'archive comme "sent", passe le statut à Contacté si Nouveau
export async function sendApproachEmailV2(input: {
  prospectId: string;
  subject: string;
  body: string;
}): Promise<{ ok: true; id: string; messageId: string } | { ok: false; error: string }> {
  try {
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject || !body) return { ok: false, error: "Objet et corps requis" };

    const prospect = await db.prospect.findUnique({
      where: { id: input.prospectId },
      select: { id: true, email: true, statut: true, entreprise: true, prenom: true, nom: true },
    });
    if (!prospect) return { ok: false, error: "Prospect introuvable" };
    if (!prospect.email) {
      return { ok: false, error: "Ce prospect n'a pas d'adresse email renseignée." };
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

    return { ok: true, id: sent.id, messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sendApproachEmailV2] échec:", msg);
    return { ok: false, error: msg };
  }
}

// 4. Supprime un mail (brouillon ou archive)
export async function deleteProspectEmail(id: string, prospectId: string): Promise<{ ok: true }> {
  await db.prospectEmail.delete({ where: { id } });
  revalidatePath(`/prospects/${prospectId}`);
  return { ok: true };
}
