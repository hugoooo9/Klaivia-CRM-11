// Dashboard — KPIs globaux + charts (MRR, funnel, secteur, canal) + feed des actions du jour
import { Topbar } from "@/components/layout/Topbar";
import { getGlobalStats } from "@/lib/stats";
import {
  getMRRSeries, getFunnel, getBySecteur, getByCanal, getActionsDuJour,
} from "@/lib/dashboard-stats";
import { fmtCHF } from "@/lib/format";
import { Users, TrendingUp, Flame, Trophy } from "lucide-react";
import { MRRChart } from "@/components/dashboard/MRRChart";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { SectorPie } from "@/components/dashboard/SectorPie";
import { ChannelBar } from "@/components/dashboard/ChannelBar";
import { ActionsFeed } from "@/components/dashboard/ActionsFeed";

export default async function DashboardPage() {
  const [stats, mrrSeries, funnel, secteur, canal, actions] = await Promise.all([
    getGlobalStats(),
    getMRRSeries(),
    getFunnel(),
    getBySecteur(),
    getByCanal(),
    getActionsDuJour(8),
  ]);

  const cards = [
    {
      label: "Prospects",
      value: stats.totalProspects,
      hint:
        stats.totalProspects === 0
          ? "Aucun prospect pour le moment"
          : `${stats.signesCount} signé${stats.signesCount > 1 ? "s" : ""} · ${stats.perdusCount} perdu${stats.perdusCount > 1 ? "s" : ""}`,
      icon: Users,
      iconBg: "bg-[color:var(--color-klaivia-violet-pale)]",
      iconColor: "text-[color:var(--color-klaivia-violet)]",
    },
    {
      label: "MRR récurrent",
      value: fmtCHF(stats.mrr),
      hint: stats.mrr === 0 ? "Aucun client actif" : "Agents IA en production",
      icon: TrendingUp,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Taux de closing",
      value: `${stats.tauxConversion.toFixed(1)}%`,
      hint: stats.totalProspects === 0 ? "Pas encore de données" : "Signés / (pipeline − perdus)",
      icon: Trophy,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "À relancer",
      value: stats.enRetard,
      hint: stats.enRetard > 0 ? "En retard, à traiter en priorité" : "Pipeline à jour",
      icon: Flame,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <>
      <Topbar
        title="Tableau de bord"
        subtitle="Vue synthétique de ton pipeline, ton MRR et tes actions à venir"
      />
      <div className="p-8">
        {/* Ligne de KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, value, hint, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="klaivia-card-hover p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-foreground">
                    {value}
                  </div>
                </div>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
                  <Icon className={`size-4 ${iconColor}`} />
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{hint}</div>
            </div>
          ))}
        </div>

        {/* Ligne 1 : MRR + Funnel */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="klaivia-card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">MRR hebdomadaire</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">12 dernières semaines</p>
              </div>
              {stats.mrr > 0 && (
                <span className="rounded-md bg-[color:var(--color-klaivia-orange-pale)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-klaivia-orange)]">
                  {fmtCHF(stats.mrr)}
                </span>
              )}
            </div>
            <MRRChart data={mrrSeries} />
          </div>

          <div className="klaivia-card p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">Suivi des prospects</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Répartition par étape de vente</p>
            </div>
            <ConversionFunnel data={funnel} />
          </div>
        </div>

        {/* Ligne 2 : Secteur + Canal + Actions */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="klaivia-card p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">Par secteur</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Typologie de clientèle</p>
            </div>
            <SectorPie data={secteur} />
          </div>

          <div className="klaivia-card p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">Par canal</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Sources d&apos;acquisition</p>
            </div>
            <ChannelBar data={canal} />
          </div>

          <div className="klaivia-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Actions du jour</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">À traiter aujourd&apos;hui</p>
              </div>
              <span className="rounded-full bg-[color:var(--color-klaivia-orange)] px-2 py-0.5 text-xs font-semibold text-white">
                {actions.length}
              </span>
            </div>
            <ActionsFeed prospects={actions} />
          </div>
        </div>
      </div>
    </>
  );
}
