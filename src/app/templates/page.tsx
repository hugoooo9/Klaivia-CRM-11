// Page Templates — modèles email/LinkedIn réutilisables
import { Topbar } from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { TemplatesClient } from "@/components/templates/TemplatesClient";

export default async function TemplatesPage() {
  const templates = await db.template.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <Topbar
        title="Templates"
        subtitle={`${templates.length} modèle${templates.length > 1 ? "s" : ""} email / LinkedIn / DM`}
      />
      <div className="p-8">
        <TemplatesClient templates={templates} />
      </div>
    </>
  );
}
