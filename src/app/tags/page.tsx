// Page Tags — gestion des tags libres
import { Topbar } from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { TagsClient } from "@/components/tags/TagsClient";

export default async function TagsPage() {
  const tags = await db.tag.findMany({
    orderBy: { label: "asc" },
    include: {
      _count: { select: { prospects: true } },
    },
  });

  return (
    <>
      <Topbar
        title="Tags"
        subtitle={`${tags.length} tag${tags.length > 1 ? "s" : ""} pour catégoriser tes prospects`}
      />
      <div className="p-8">
        <TagsClient tags={tags} />
      </div>
    </>
  );
}
