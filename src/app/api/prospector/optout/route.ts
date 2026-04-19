// POST /api/prospector/optout — ajoute un email ou domaine en liste noire
// GET /api/prospector/optout — liste
// DELETE /api/prospector/optout?valeur=... — retire

import { db } from "@/lib/db";
import { addOptOut } from "@/lib/prospector/optOut";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db.optOut.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json({ rows });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { valeur?: string; type?: "EMAIL" | "DOMAIN"; raison?: string };
  if (!body.valeur || !body.type) {
    return Response.json({ error: "valeur et type requis" }, { status: 400 });
  }
  const row = await addOptOut(body.valeur, body.type, body.raison);
  return Response.json(row);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const valeur = url.searchParams.get("valeur");
  if (!valeur) return Response.json({ error: "valeur requise" }, { status: 400 });
  await db.optOut.delete({ where: { valeur: valeur.toLowerCase().trim() } }).catch(() => null);
  return Response.json({ ok: true });
}
