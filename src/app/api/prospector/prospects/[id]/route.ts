// GET /api/prospector/prospects/:id — détail + contacts + messages + logs
// PATCH /api/prospector/prospects/:id/status — changement statut commercial

import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const p = await db.prospect.findUnique({
    where: { id },
    include: {
      contacts: true,
      approachMessages: { orderBy: { createdAt: "desc" } },
      enrichmentLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!p) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(p);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { statut?: string; pipelineAuto?: string };
  const data: Record<string, string> = {};
  if (body.statut) data.statut = body.statut;
  if (body.pipelineAuto) data.pipelineAuto = body.pipelineAuto;
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "aucun champ modifiable fourni" }, { status: 400 });
  }
  const updated = await db.prospect.update({ where: { id }, data });
  return Response.json(updated);
}
