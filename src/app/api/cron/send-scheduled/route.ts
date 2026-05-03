// GET/POST /api/cron/send-scheduled
// Trouve tous les ProspectEmail status="scheduled" avec scheduledAt <= now,
// les envoie via SMTP, met status="sent" + sentAt = now.
// Pour Hostinger : configurer un cron job dans hPanel qui hit cette URL toutes les
// 5 minutes (ex: `*/5 * * * * curl https://tonsite.ch/api/cron/send-scheduled`).
// Sécurité : si CRON_SECRET défini, requiert ?secret=... ou header Authorization.

import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

async function processScheduled() {
  const now = new Date();
  const due = await db.prospectEmail.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    take: 50, // batch limité pour éviter les timeouts
    select: {
      id: true,
      prospectId: true,
      subject: true,
      body: true,
      prospect: { select: { email: true, statut: true } },
    },
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const m of due) {
    if (!m.prospect?.email) {
      await db.prospectEmail.update({
        where: { id: m.id },
        data: { status: "failed", errorMsg: "Prospect sans email" },
      });
      failed += 1;
      continue;
    }

    try {
      const { messageId } = await sendMail({
        to: m.prospect.email,
        subject: m.subject,
        text: m.body,
      });

      await db.prospectEmail.update({
        where: { id: m.id },
        data: { status: "sent", sentAt: new Date(), errorMsg: null },
      });

      await db.activity.create({
        data: {
          prospectId: m.prospectId,
          type: "EMAIL_SENT",
          description: `Mail programmé envoyé à ${m.prospect.email} : ${m.subject} (msgId ${messageId.slice(0, 30)})`,
        },
      });

      // Avance le statut Nouveau → Contacté
      if (m.prospect.statut === "Nouveau") {
        await db.prospect.update({
          where: { id: m.prospectId },
          data: { statut: "Contacté" },
        });
        await db.activity.create({
          data: {
            prospectId: m.prospectId,
            type: "STATUT_CHANGE",
            description: "Nouveau → Contacté (auto via mail programmé)",
          },
        });
      }

      revalidatePath(`/prospects/${m.prospectId}`);
      sent += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[cron/send-scheduled] échec envoi ${m.id}:`, msg);
      await db.prospectEmail.update({
        where: { id: m.id },
        data: { status: "failed", errorMsg: msg.slice(0, 500) },
      });
      failed += 1;
      errors.push(`${m.id}: ${msg.slice(0, 100)}`);
    }
  }

  return { sent, failed, errors, processed: due.length };
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // pas de secret configuré → endpoint ouvert

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  if (querySecret === secret) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  const result = await processScheduled();
  return Response.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  const result = await processScheduled();
  return Response.json({ ok: true, ...result });
}
