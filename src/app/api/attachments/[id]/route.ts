// GET /api/attachments/[id] — sert le contenu binaire de la pièce jointe
// Affiché inline (Content-Disposition: inline) pour preview navigateur des PDF/images.
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const att = await db.attachment.findUnique({
    where: { id },
    select: { filename: true, mimeType: true, data: true, size: true },
  });
  if (!att) return new Response("Not found", { status: 404 });

  const url = new URL(_req.url);
  const download = url.searchParams.get("download") === "1";

  // Encode filename for Content-Disposition (RFC 5987) pour gérer les caractères spéciaux
  const encodedName = encodeURIComponent(att.filename).replace(/['()]/g, escape);
  const disposition = `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodedName}`;

  // att.data est un Buffer (Bytes Prisma → Uint8Array côté Node)
  return new Response(new Uint8Array(att.data), {
    status: 200,
    headers: {
      "Content-Type": att.mimeType || "application/octet-stream",
      "Content-Disposition": disposition,
      "Content-Length": String(att.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
