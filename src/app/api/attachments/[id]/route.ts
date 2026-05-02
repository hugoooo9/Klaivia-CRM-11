// GET /api/attachments/[id] — sert le contenu décodé depuis base64
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const att = await db.attachment.findUnique({
    where: { id },
    select: { filename: true, mimeType: true, dataBase64: true, size: true },
  });
  if (!att) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";

  const encodedName = encodeURIComponent(att.filename);
  const disposition = `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodedName}`;

  const buffer = Buffer.from(att.dataBase64, "base64");

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": att.mimeType || "application/octet-stream",
      "Content-Disposition": disposition,
      "Content-Length": String(att.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
