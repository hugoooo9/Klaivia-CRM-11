// Server Actions — envoi d'emails d'approche via SMTP contact@klaivia.ch.
// Flow : l'utilisateur ouvre le dialog, relit / édite, clique Envoyer.
// Cette action : valide → envoie → loggue une Interaction + Activity.
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

const sendSchema = z.object({
  prospectId: z.string().min(1),
  subject: z.string().min(1, "Objet requis").max(200),
  body: z.string().min(1, "Corps requis").max(10000),
  cc: z.string().optional(),
});

export type SendApproachEmailInput = z.infer<typeof sendSchema>;

export type SendApproachEmailResult = {
  ok: true;
  messageId: string;
  interactionId: string;
};

export async function sendApproachEmail(
  input: SendApproachEmailInput
): Promise<SendApproachEmailResult> {
  const parsed = sendSchema.parse(input);

  const prospect = await db.prospect.findUnique({
    where: { id: parsed.prospectId },
    select: { id: true, email: true, prenom: true, nom: true, entreprise: true, statut: true },
  });
  if (!prospect) throw new Error("Prospect introuvable");
  if (!prospect.email) {
    throw new Error("Ce prospect n'a pas d'adresse email renseignée.");
  }

  const cc = parsed.cc?.trim() || undefined;
  if (cc && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cc)) {
    throw new Error("Adresse CC invalide.");
  }

  const { messageId } = await sendMail({
    to: prospect.email,
    subject: parsed.subject,
    text: parsed.body,
    cc,
  });

  const interaction = await db.interaction.create({
    data: {
      prospectId: prospect.id,
      type: "Email",
      contenu: `Envoyé à ${prospect.email}\nObjet : ${parsed.subject}\n\n${parsed.body}`,
    },
  });

  // Activity log auto
  await db.activity.create({
    data: {
      prospectId: prospect.id,
      type: "EMAIL_SENT",
      description: `Email envoyé : ${parsed.subject}`,
    },
  });

  // Avance le statut si "Nouveau" (premier contact → Contacté)
  if (prospect.statut === "Nouveau") {
    await db.prospect.update({
      where: { id: prospect.id },
      data: { statut: "Contacté" },
    });
    await db.activity.create({
      data: {
        prospectId: prospect.id,
        type: "STATUT_CHANGE",
        description: "Nouveau → Contacté (auto via envoi email)",
      },
    });
  }

  revalidatePath(`/prospects/${prospect.id}`);
  revalidatePath("/prospects");
  revalidatePath("/actions-du-jour");
  revalidatePath("/dashboard");

  return { ok: true, messageId, interactionId: interaction.id };
}

// Récupère un brouillon par défaut pour le dialog : template neutre pré-rempli.
export async function getDefaultApproachEmail(
  prospectId: string
): Promise<{ subject: string; body: string } | null> {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: { prenom: true, nom: true, entreprise: true, ville: true, secteur: true },
  });
  if (!prospect) return null;

  const firstName = prospect.prenom && prospect.prenom !== "—" ? prospect.prenom : "";
  const company = prospect.entreprise ? ` — ${prospect.entreprise}` : "";

  return {
    subject: `Un mot rapide${company}`,
    body:
      `Bonjour ${firstName},\n\n` +
      `[Votre message d'approche ici]\n\n` +
      `Belle journée,\nKlaivia`,
  };
}
