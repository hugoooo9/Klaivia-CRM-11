// Server Actions — envoi d'emails d'approche via SMTP contact@klaivia.ch.
// Flow : l'utilisateur ouvre le dialog, relit / édite, clique Envoyer.
// Cette action : valide → check opt-out → envoie → loggue une Interaction.
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { isOptedOut } from "@/lib/prospector/optOut";

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

  // 1. Prospect + email
  const prospect = await db.prospect.findUnique({
    where: { id: parsed.prospectId },
    select: { id: true, email: true, prenom: true, nom: true, statut: true },
  });
  if (!prospect) throw new Error("Prospect introuvable");
  if (!prospect.email) {
    throw new Error("Ce prospect n'a pas d'adresse email renseignée.");
  }

  // 2. Opt-out (LPD / nLPD)
  if (await isOptedOut(prospect.email)) {
    throw new Error(
      "Cette adresse est en opt-out — envoi bloqué pour respect de la LPD."
    );
  }

  // 3. CC validation (optionnelle)
  const cc = parsed.cc?.trim() || undefined;
  if (cc && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cc)) {
    throw new Error("Adresse CC invalide.");
  }

  // 4. Envoi SMTP
  const { messageId } = await sendMail({
    to: prospect.email,
    subject: parsed.subject,
    text: parsed.body,
    cc,
  });

  // 5. Log Interaction
  const interaction = await db.interaction.create({
    data: {
      prospectId: prospect.id,
      type: "Email",
      contenu: `Envoyé à ${prospect.email}\nObjet : ${parsed.subject}\n\n${parsed.body}`,
    },
  });

  // 6. Avance le statut si "Nouveau" (premier contact → Contacté)
  if (prospect.statut === "Nouveau") {
    await db.prospect.update({
      where: { id: prospect.id },
      data: { statut: "Contacté" },
    });
  }

  revalidatePath(`/prospects/${prospect.id}`);
  revalidatePath("/prospects");
  revalidatePath("/actions-du-jour");
  revalidatePath("/dashboard");

  return { ok: true, messageId, interactionId: interaction.id };
}

// Récupère un brouillon par défaut pour le dialog :
//   - Si un ApproachMessage EMAIL existe → l'utilise (généré par l'agent)
//   - Sinon → template simple pré-rempli avec prénom/entreprise
export async function getDefaultApproachEmail(
  prospectId: string
): Promise<{ subject: string; body: string } | null> {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: { prenom: true, nom: true, entreprise: true, ville: true, secteur: true },
  });
  if (!prospect) return null;

  // Dernier message généré par l'agent pour ce prospect, canal EMAIL
  const approach = await db.approachMessage.findFirst({
    where: { prospectId, canal: "EMAIL" },
    orderBy: { createdAt: "desc" },
    select: { contenu: true },
  });

  const firstName = prospect.prenom || "";
  const company = prospect.entreprise ? ` chez ${prospect.entreprise}` : "";

  if (approach?.contenu) {
    return {
      subject: `Un mot rapide${company ? " — " + prospect.entreprise : ""}`,
      body:
        `Bonjour ${firstName},\n\n` +
        `${approach.contenu}\n\n` +
        `Belle journée,\nKlaivia`,
    };
  }

  // Template neutre par défaut
  return {
    subject: `Un mot rapide${company ? " — " + prospect.entreprise : ""}`,
    body:
      `Bonjour ${firstName},\n\n` +
      `[Votre message d'approche ici]\n\n` +
      `Belle journée,\nKlaivia`,
  };
}
