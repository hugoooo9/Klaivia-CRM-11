// Vue client /prospector — table + actions (run import, generate message).
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, RefreshCw, ExternalLink } from "lucide-react";

type Row = {
  id: string;
  raisonSociale: string | null;
  numeroIDE: string | null;
  canton: string | null;
  ville: string | null;
  npa: string | null;
  secteurNOGA: string | null;
  siteWeb: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  scoreICP: number | null;
  pipelineAuto: string | null;
  derniereEnrichAt: Date | string | null;
};

const PIPELINE_COLORS: Record<string, string> = {
  NEW: "bg-sky-50 text-sky-700 border-sky-200",
  ENRICHED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  QUALIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  APPROACHED: "bg-[color:var(--color-klaivia-orange-pale)] text-[color:var(--color-klaivia-orange)] border-[color:var(--color-klaivia-orange)]/30",
  SKIPPED: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export function ProspectorClient({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [importing, setImporting] = useState(false);
  const [pending, startTransition] = useTransition();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  async function runImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/prospector/run", { method: "POST", body: JSON.stringify({ maxPerCanton: 30 }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Import échoué");
      toast.success(`Import ${data.stats.upsertedCreated} créés · ${data.stats.upsertedUpdated} màj · ${data.stats.rejected} rejetés`);
      // Refresh page data (simplistic)
      startTransition(() => {
        location.reload();
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function generateMessage(id: string) {
    setGeneratingId(id);
    try {
      const res = await fetch(`/api/prospector/prospects/${id}/generate-message`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Génération échouée");
      toast.success("Message généré ✓");
      // Mets à jour pipelineAuto inline
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, pipelineAuto: "APPROACHED" } : r)));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {rows.length} prospects affichés (top 200 par score ICP)
        </div>
        <Button
          onClick={runImport}
          disabled={importing || pending}
          className="bg-[color:var(--color-klaivia-orange)] text-white hover:bg-[color:var(--color-klaivia-orange-light)]"
        >
          <Play className="size-4" />
          {importing ? "Import en cours…" : "Lancer import Zefix"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Raison sociale</th>
              <th className="px-3 py-2 text-left">Canton / Ville</th>
              <th className="px-3 py-2 text-left">NOGA</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Google</th>
              <th className="px-3 py-2 text-left">Pipeline</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                  Aucun prospect auto-découvert. Lance l&apos;import Zefix ↗
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/20">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.raisonSociale || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.numeroIDE || ""}</div>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-xs font-mono">{r.canton || "—"}</span>
                  <span className="ml-2 text-muted-foreground">{r.npa} {r.ville}</span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.secteurNOGA || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold">{r.scoreICP ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  {r.googleRating ? `${r.googleRating}★ (${r.googleReviewsCount})` : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PIPELINE_COLORS[r.pipelineAuto || ""] || "bg-zinc-100"}`}>
                    {r.pipelineAuto || "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {r.siteWeb && (
                      <a
                        href={r.siteWeb}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Site web"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateMessage(r.id)}
                      disabled={generatingId === r.id}
                      className="h-7 px-2 text-xs"
                      title={r.pipelineAuto === "APPROACHED" ? "Régénérer" : "Générer approche"}
                    >
                      {generatingId === r.id ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <Sparkles className="size-3" />
                      )}
                      {r.pipelineAuto === "APPROACHED" ? "Regen" : "Générer"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
