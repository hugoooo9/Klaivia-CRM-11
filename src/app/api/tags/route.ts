// GET /api/tags — liste tags
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const tags = await db.tag.findMany({
    orderBy: { label: "asc" },
    select: { id: true, label: true, color: true },
  });
  return Response.json({ tags });
}
