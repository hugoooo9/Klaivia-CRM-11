// Server Actions — mail d'approche optimisé (template déterministe) + envoi + brouillon
// Auth gérée par le proxy.ts middleware (cookie HMAC).
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import {
  buildApproachEmail,
  type GeneratedApproachEmail,
  type ApproachService,
} from "@/lib/approach-template";

export type GenerateResult =
  | { ok: true; subject: string; body: string }
  | { ok: false; error: string };

// 1. Génère un mail d'approche pré-rempli avec les infos du prospect (sans IA)
export async function generateApproachEmail(
  prospectId: string,
  service: ApproachService = "agent",
): Promise<GenerateResult> {
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
      },
    });
    if (!prospect) return { ok: false, error: "Prospect introuvable" };

    const result: GeneratedApproachEmail = buildApproachEmail(
      {
        entreprise: prospect.entreprise,
        prenom: prospect.prenom === "—" ? null : prospect.prenom,
        nom: prospect.nom === "—" ? null : prospect.nom,
        ville: prospect.ville,
        secteur: prospect.secteur || null,
        canal: prospect.canal || null,
      },
      service,
    );
    return { ok: true, subject: result.subject, body: result.body };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generateApproachEmail] échec:", msg);
    return { ok: false, error: msg };
  }
}

// 2. Sauvegarde un brouillon
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
          description: "Nouveau → Contacté (auto via envoi mail)",
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

// 4. Programme un mail pour envoi automatique à une date/heure donnée
export async function scheduleApproachEmail(input: {
  prospectId: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO datetime
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject || !body) return { ok: false, error: "Objet et corps requis" };

    const when = new Date(input.scheduledAt);
    if (Number.isNaN(when.getTime())) return { ok: false, error: "Date invalide" };
    if (when.getTime() <= Date.now()) {
      return { ok: false, error: "Date doit être dans le futur" };
    }

    const prospect = await db.prospect.findUnique({
      where: { id: input.prospectId },
      select: { id: true, email: true },
    });
    if (!prospect) return { ok: false, error: "Prospect introuvable" };
    if (!prospect.email) {
      return { ok: false, error: "Ce prospect n'a pas d'adresse email" };
    }

    const scheduled = await db.prospectEmail.create({
      data: {
        prospectId: input.prospectId,
        subject,
        body,
        status: "scheduled",
        scheduledAt: when,
      },
    });

    await db.activity.create({
      data: {
        prospectId: input.prospectId,
        type: "EMAIL_SCHEDULED",
        description: `Mail programmé pour ${when.toLocaleString("fr-CH")} : ${subject}`,
      },
    });

    revalidatePath(`/prospects/${input.prospectId}`);
    return { ok: true, id: scheduled.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[scheduleApproachEmail] échec:", msg);
    return { ok: false, error: msg };
  }
}

// 5. Supprime un mail (brouillon, programmé ou archive)
export async function deleteProspectEmail(id: string, prospectId: string): Promise<{ ok: true }> {
  await db.prospectEmail.delete({ where: { id } });
  revalidatePath(`/prospects/${prospectId}`);
  return { ok: true };
}
