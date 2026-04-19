// POST /api/prospector/run — déclenche manuellement l'import + enrichissement.
// Le scraping et scoring tournent en background via la queue in-memory.
// ⚠ Long-running si gros volume — frontend doit polling /status.

import { runImport } from "@/lib/prospector/runImport";

export const runtime = "nodejs"; // pas Edge (fetch streaming + cron)
export const maxDuration = 300;  // 5 min max

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { maxPerCanton?: number };
  try {
    const stats = await runImport({ maxPerCanton: body.maxPerCanton ?? 50 });
    return Response.json({ ok: true, stats });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const { getStats } = await import("@/lib/prospector/queue");
  return Response.json({ queues: getStats() });
}
