// Page Clients actifs — liste + stats MRR/ARR/NPS + actions churn/NPS/RDV
import { Topbar } from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { fmtCHF } from "@/lib/format";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { TrendingUp, Users, Star, UserMinus } from "lucide-react";

export default async function ClientsPage() {
  const clients = await db.client.findMany({
    include: { prospect: true },
    orderBy: [{ statut: "asc" }, { dateDebut: "desc" }],
  });

  const actifs = clients.filter((c) => c.statut === "Actif");
  const churned = clients.filter((c) => c.statut === "Churné");
  const mrr = actifs.reduce((acc, c) => acc + c.mrrCHF, 0);
  const arr = mrr * 12;
  const setupTotal = clients.reduce((acc, c) => acc + c.setupCHF, 0);

  const npsValues = clients.map((c) => c.nps).filter((n): n is number => n != null);
  const avgNPS = npsValues.length > 0
    ? npsValues.reduce((a, b) => a + b, 0) / npsValues.length
    : null;

  const cards = [
    {
      label: "Agents en prod",
      value: actifs.length,
      hint: `${clients.length} déploiement${clients.length > 1 ? "s" : ""} total`,
      icon: Users,
      iconBg: "bg-[color:var(--color-klaivia-orange-pale)]",
      iconColor: "text-[color:var(--color-klaivia-orange)]",
    },
    {
      label: "MRR",
      value: fmtCHF(mrr),
      hint: `ARR ${fmtCHF(arr)}`,
      icon: TrendingUp,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "NPS moyen",
      value: avgNPS != null ? `${avgNPS.toFixed(1)}/10` : "—",
      hint: `${npsValues.length} note${npsValues.length > 1 ? "s" : ""}`,
      icon: Star,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Churn",
      value: churned.length,
      hint: clients.length > 0
        ? `${((churned.length / clients.length) * 100).toFixed(1)}% global`
        : "—",
      icon: UserMinus,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <>
      <Topbar
        title="Clients actifs"
        subtitle={
          clients.length === 0
            ? "Aucun client pour le moment — signe un prospect pour le convertir"
            : `${actifs.length} actif${actifs.length > 1 ? "s" : ""} · ${fmtCHF(mrr)} de MRR`
        }
      />
      <div className="p-8">
        {clients.length > 0 && (
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
        )}

        <div className={`klaivia-card p-5 ${clients.length > 0 ? "mt-6" : ""}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              Portefeuille clients
            </h3>
            {clients.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Setup cumulé : {fmtCHF(setupTotal)}
                </span>
                <a
                  href="/api/export?type=clients&format=csv"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:bg-muted"
                >
                  Exporter CSV
                </a>
              </div>
            )}
          </div>
          <ClientsTable
            rows={clients.map((c) => ({
              id: c.id,
              prospectId: c.prospectId,
              prenom: c.prospect.prenom,
              nom: c.prospect.nom,
              entreprise: c.prospect.entreprise,
              email: c.prospect.email,
              phone: c.prospect.phone,
              ville: c.prospect.ville,
              adresse: c.prospect.adresse,
              npa: c.prospect.npa,
              canton: c.prospect.canton,
              siteWeb: c.prospect.siteWeb,
              linkedin: c.prospect.linkedin,
              instagram: c.prospect.instagram,
              pack: c.pack,
              mrrCHF: c.mrrCHF,
              setupCHF: c.setupCHF,
              dateDebut: c.dateDebut,
              prochainRDV: c.prochainRDV,
              nps: c.nps,
              statut: c.statut,
            }))}
          />
        </div>
      </div>
    </>
  );
}
