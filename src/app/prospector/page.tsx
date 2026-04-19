// Page Agent Prospecteur — liste des prospects auto-découverts (Zefix + enrichissement).
// Actions : lancer import manuel, voir détail, générer message d'approche à la demande.

import { Topbar } from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { ProspectorClient } from "@/components/prospector/ProspectorClient";

export const dynamic = "force-dynamic";

export default async function ProspectorPage() {
  const rows = await db.prospect.findMany({
    where: { source: "AUTO_ZEFIX" },
    orderBy: [{ scoreICP: "desc" }, { createdAt: "desc" }],
    take: 200,
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
  });

  const totalAuto = await db.prospect.count({ where: { source: "AUTO_ZEFIX" } });
  const qualified = await db.prospect.count({
    where: { source: "AUTO_ZEFIX", pipelineAuto: "QUALIFIED" },
  });
  const approached = await db.prospect.count({
    where: { source: "AUTO_ZEFIX", pipelineAuto: "APPROACHED" },
  });

  return (
    <div>
      <Topbar
        title="Agent prospecteur"
        subtitle="Découverte Zefix · enrichissement auto · Suisse romande"
      />
      <main className="px-8 py-6 space-y-4">
        {/* Cards stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Découverts" value={totalAuto} hint="source Zefix" />
          <StatCard label="Qualifiés" value={qualified} hint="score ICP ≥ 60" />
          <StatCard label="Approchés" value={approached} hint="message généré" />
          <StatCard
            label="Taux qualification"
            value={totalAuto ? `${Math.round((qualified / totalAuto) * 100)}%` : "—"}
            hint=""
          />
        </div>

        <ProspectorClient initialRows={rows} />
      </main>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
