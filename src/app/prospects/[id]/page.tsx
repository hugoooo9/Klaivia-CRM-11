// Fiche prospect détaillée — header + infos + notes + timeline d'interactions
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, AtSign, Globe, MapPin, Building2, Trophy } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/prospects/StatusBadge";
import { UrgencyDot } from "@/components/prospects/UrgencyDot";
import { ScoreDots } from "@/components/prospects/ScoreDots";
import { ProspectDetailActions } from "@/components/prospects/ProspectDetailActions";
import { db } from "@/lib/db";
import { initials, avatarColor, fmtDate, fmtRelative, fmtCHF } from "@/lib/format";
import type { StatutProspect, Urgence } from "@/lib/constants";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const prospect = await db.prospect.findUnique({
    where: { id },
    include: {
      interactions: { orderBy: { createdAt: "desc" } },
      client: true,
    },
  });

  if (!prospect) notFound();

  const fullName = `${prospect.prenom} ${prospect.nom}`;
  const avatar = avatarColor(fullName);

  // Valeurs pour le form d'édition (converties en strings pour les inputs)
  const editDefaults = {
    prenom: prospect.prenom,
    nom: prospect.nom,
    entreprise: prospect.entreprise ?? "",
    ville: prospect.ville ?? "",
    email: prospect.email ?? "",
    phone: prospect.phone ?? "",
    instagram: prospect.instagram ?? "",
    linkedin: prospect.linkedin ?? "",
    secteur: prospect.secteur,
    canal: prospect.canal,
    statut: prospect.statut,
    urgence: prospect.urgence,
    score: prospect.score,
    prochainStep: prospect.prochainStep
      ? prospect.prochainStep.toISOString().slice(0, 10)
      : "",
    packInteret: prospect.packInteret ?? "",
    budgetEstime: prospect.budgetEstime ?? undefined,
    setupEstime: prospect.setupEstime ?? undefined,
    notes: prospect.notes ?? "",
    raisonPerte: prospect.raisonPerte ?? "",
  };

  return (
    <>
      <Topbar title={fullName} subtitle={prospect.entreprise ?? "Prospect Klaivia"} />
      <div className="p-8">
        <Link
          href="/prospects"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Retour aux prospects
        </Link>

        {/* Header card */}
        <div className="klaivia-card mb-6 p-6">
          <div className="flex items-start gap-4">
            <div
              className="flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white"
              style={{ backgroundColor: avatar }}
            >
              {initials(prospect.prenom, prospect.nom)}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {fullName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {prospect.entreprise ?? "—"}
                {prospect.ville && ` · ${prospect.ville}`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge statut={prospect.statut as StatutProspect} />
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px]">
                  <UrgencyDot urgence={prospect.urgence as Urgence} />
                  Urgence {prospect.urgence}
                </span>
                <span className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px]">
                  Score <ScoreDots score={prospect.score} />
                </span>
                <span className="text-xs text-muted-foreground">
                  Contact initial {fmtRelative(prospect.dateContact)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <ProspectDetailActions
              id={prospect.id}
              prenom={prospect.prenom}
              nom={prospect.nom}
              email={prospect.email}
              statut={prospect.statut}
              hasClient={!!prospect.client}
              packInteret={prospect.packInteret}
              editDefaults={editDefaults}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Infos contact */}
          <div className="klaivia-card p-5">
            <h3 className="mb-3 text-base font-semibold text-foreground">Contact</h3>
            <ul className="space-y-2 text-sm">
              <ContactLine icon={Mail} label="Email" value={prospect.email} href={prospect.email ? `mailto:${prospect.email}` : undefined} />
              <ContactLine icon={Phone} label="Téléphone" value={prospect.phone} href={prospect.phone ? `tel:${prospect.phone}` : undefined} />
              <ContactLine icon={AtSign} label="Instagram" value={prospect.instagram} />
              <ContactLine icon={Globe} label="LinkedIn" value={prospect.linkedin} />
              <ContactLine icon={Building2} label="Entreprise" value={prospect.entreprise} />
              <ContactLine icon={MapPin} label="Ville" value={prospect.ville} />
            </ul>
          </div>

          {/* Infos commerciales */}
          <div className="klaivia-card p-5">
            <h3 className="mb-3 text-base font-semibold text-foreground">Commercial</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Secteur" value={prospect.secteur} />
              <Row label="Canal" value={prospect.canal} />
              <Row label="Pack d'intérêt" value={prospect.packInteret ?? "—"} />
              <Row label="Budget mensuel" value={fmtCHF(prospect.budgetEstime)} />
              <Row label="Setup one-shot" value={fmtCHF(prospect.setupEstime)} />
              <Row label="Prochain step" value={prospect.prochainStep ? fmtDate(prospect.prochainStep) : "—"} />
              {prospect.raisonPerte && (
                <div className="mt-2 rounded border border-[color:var(--color-klaivia-red)]/30 bg-destructive/10 p-2 text-xs">
                  <div className="font-semibold text-[color:var(--color-klaivia-red)]">Raison de la perte</div>
                  <p className="mt-1 text-muted-foreground">{prospect.raisonPerte}</p>
                </div>
              )}
            </dl>
          </div>

          {/* Notes */}
          <div className="klaivia-card p-5">
            <h3 className="mb-3 text-base font-semibold text-foreground">Notes</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {prospect.notes || "Aucune note pour le moment."}
            </p>
          </div>
        </div>

        {/* Timeline interactions */}
        <div className="klaivia-card mt-6 p-6">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            Historique · {prospect.interactions.length} interaction{prospect.interactions.length > 1 ? "s" : ""}
          </h3>

          {prospect.interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune interaction enregistrée. Utilise « Ajouter interaction » pour commencer.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l-2 border-border pl-6">
              {prospect.interactions.map((int) => (
                <li key={int.id} className="relative">
                  <span className="absolute -left-[29px] top-1 flex size-4 items-center justify-center rounded-full border-2 border-card bg-[color:var(--color-klaivia-orange)]" />
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[color:var(--color-klaivia-orange-pale)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-klaivia-orange)]">
                      {int.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmtDate(int.createdAt)} · {fmtRelative(int.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{int.contenu}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Client associé s'il existe */}
        {prospect.client && (
          <div className="klaivia-card mt-6 p-6">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <Trophy className="size-5 text-[color:var(--color-klaivia-green)]" /> Client actif
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><div className="text-xs text-muted-foreground">Pack</div><div className="font-medium">{prospect.client.pack}</div></div>
              <div><div className="text-xs text-muted-foreground">MRR</div><div className="font-medium text-[color:var(--color-klaivia-green)]">{fmtCHF(prospect.client.mrrCHF)}</div></div>
              <div><div className="text-xs text-muted-foreground">Setup</div><div className="font-medium">{fmtCHF(prospect.client.setupCHF)}</div></div>
              <div><div className="text-xs text-muted-foreground">Depuis</div><div className="font-medium">{fmtDate(prospect.client.dateDebut)}</div></div>
              {prospect.client.nps != null && (
                <div><div className="text-xs text-muted-foreground">NPS</div><div className="font-medium">{prospect.client.nps}/10</div></div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ContactLine({
  icon: Icon, label, value, href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  href?: string;
}) {
  const content = (
    <span className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto truncate text-sm">
        {value ?? <span className="text-muted-foreground/50">—</span>}
      </span>
    </span>
  );
  return (
    <li>
      {value && href ? (
        <a href={href} className="block hover:text-[color:var(--color-klaivia-orange)]">{content}</a>
      ) : content}
    </li>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
