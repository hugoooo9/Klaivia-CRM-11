// GET /api/prospector/prospects?canton=VD&scoreMin=70&pipelineAuto=QUALIFIED
// Liste filtrable des prospects auto-découverts (source=AUTO_ZEFIX).

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const canton = url.searchParams.get("canton");
  const scoreMin = url.searchParams.get("scoreMin");
  const pipelineAuto = url.searchParams.get("pipelineAuto");
  const secteurNOGA = url.searchParams.get("secteurNOGA");
  const take = Math.min(parseInt(url.searchParams.get("take") ?? "50", 10), 500);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);

  const where: Prisma.ProspectWhereInput = {
    source: "AUTO_ZEFIX",
    ...(canton ? { canton } : {}),
    ...(pipelineAuto ? { pipelineAuto } : {}),
    ...(secteurNOGA ? { secteurNOGA } : {}),
    ...(scoreMin ? { scoreICP: { gte: parseInt(scoreMin, 10) } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.prospect.findMany({
      where,
      orderBy: [{ scoreICP: "desc" }, { createdAt: "desc" }],
      take,
      skip,
      select: {
        id: true,
        raisonSociale: true,
        numeroIDE: true,
        canton: true,
        ville: true,
        npa: true,
        secteurNOGA: true,
        siteWeb: true,
        googleRating: true,
        googleReviewsCount: true,
        scoreICP: true,
        pipelineAuto: true,
        derniereEnrichAt: true,
      },
    }),
    db.prospect.count({ where }),
  ]);

  return Response.json({ total, rows });
}
