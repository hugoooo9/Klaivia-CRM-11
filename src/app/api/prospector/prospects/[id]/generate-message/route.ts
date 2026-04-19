// POST /api/prospector/prospects/:id/generate-message  → ON_DEMAND (première génération)
// POST /api/prospector/prospects/:id/generate-message?regen=1  → MANUAL_REGEN

import { generateApproachMessage } from "@/lib/prospector/messaging/approachGenerator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const regen = url.searchParams.get("regen") === "1";
  try {
    const out = await generateApproachMessage(id, {
      genereA: regen ? "MANUAL_REGEN" : "ON_DEMAND",
    });
    return Response.json({ ok: true, ...out });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
