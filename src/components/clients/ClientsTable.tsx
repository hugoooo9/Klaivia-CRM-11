// Table des clients — nom, pack, MRR, setup, NPS éditable, prochain RDV, actions churn
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Star, UserMinus, CalendarDays, Mail, Phone, MapPin, Globe, Briefcase, AtSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { fmtCHF, fmtDate } from "@/lib/format";
import {
  setClientNPS, setClientNextRDV, markClientChurned,
} from "@/actions/clients";

export type ClientRow = {
  id: string;
  prospectId: string;
  prenom: string;
  nom: string;
  entreprise: string | null;
  email: string | null;
  phone: string | null;
  ville: string | null;
  adresse: string | null;
  npa: string | null;
  canton: string | null;
  siteWeb: string | null;
  linkedin: string | null;
  instagram: string | null;
  pack: string;
  mrrCHF: number;
  setupCHF: number;
  dateDebut: Date;
  prochainRDV: Date | null;
  nps: number | null;
  statut: string;
};

const STATUT_COLOR: Record<string, string> = {
  "Actif": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Pause": "bg-amber-50 text-amber-700 border-amber-200",
  "Churné": "bg-rose-50 text-rose-700 border-rose-200",
};

export function ClientsTable({ rows }: { rows: ClientRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Aucun client pour le moment. Convertis un prospect signé en client depuis sa fiche.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Client</th>
            <th className="py-2 pr-3 font-medium">Contact</th>
            <th className="py-2 pr-3 font-medium">Adresse</th>
            <th className="py-2 pr-3 font-medium">Pack</th>
            <th className="py-2 pr-3 font-medium">MRR</th>
            <th className="py-2 pr-3 font-medium">Setup</th>
            <th className="py-2 pr-3 font-medium">Depuis</th>
            <th className="py-2 pr-3 font-medium">Prochain RDV</th>
            <th className="py-2 pr-3 font-medium">NPS</th>
            <th className="py-2 pr-3 font-medium">Statut</th>
            <th className="py-2 pr-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <ClientRowView key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientRowView({ row }: { row: ClientRow }) {
  const [, startTransition] = useTransition();
  const [npsOpen, setNpsOpen] = useState(false);
  const [rdvOpen, setRdvOpen] = useState(false);
  const [churnOpen, setChurnOpen] = useState(false);
  const [churnReason, setChurnReason] = useState("");
  const [npsValue, setNpsValue] = useState<number>(row.nps ?? 8);
  const [rdvDate, setRdvDate] = useState<string>(
    row.prochainRDV ? row.prochainRDV.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );

  const fullName = `${row.prenom} ${row.nom}`;

  const onSetNPS = () => {
    startTransition(async () => {
      try {
        await setClientNPS(row.id, npsValue);
        toast.success(`NPS de ${fullName} : ${npsValue}/10`);
        setNpsOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onSetRDV = () => {
    startTransition(async () => {
      try {
        await setClientNextRDV(row.id, rdvDate);
        toast.success(`Prochain RDV : ${fmtDate(rdvDate)}`);
        setRdvOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onChurn = () => {
    if (!churnReason.trim()) {
      toast.error("Précise la raison du churn");
      return;
    }
    startTransition(async () => {
      try {
        await markClientChurned(row.id, churnReason);
        toast.success(`${fullName} marqué comme churné`);
        setChurnOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <tr
      className={`border-b border-border/50 text-sm hover:bg-muted/30 ${
        row.statut === "Churné" ? "opacity-60" : ""
      }`}
    >
      <td className="py-3 pr-3 align-top">
        <Link
          href={`/prospects/${row.prospectId}`}
          className="font-medium text-foreground hover:text-[color:var(--color-klaivia-orange)]"
        >
          {fullName}
        </Link>
        {row.entreprise && (
          <div className="text-xs text-muted-foreground">{row.entreprise}</div>
        )}
        {(row.siteWeb || row.linkedin || row.instagram) && (
          <div className="mt-1 flex items-center gap-1.5">
            {row.siteWeb && (
              <a
                href={row.siteWeb.startsWith("http") ? row.siteWeb : `https://${row.siteWeb}`}
                target="_blank"
                rel="noreferrer noopener"
                title={row.siteWeb}
                className="text-muted-foreground transition-colors hover:text-[color:var(--color-klaivia-violet)]"
              >
                <Globe className="size-3.5" />
              </a>
            )}
            {row.linkedin && (
              <a
                href={row.linkedin.startsWith("http") ? row.linkedin : `https://www.linkedin.com/in/${row.linkedin.replace(/^\/?/, "")}`}
                target="_blank"
                rel="noreferrer noopener"
                title={`LinkedIn : ${row.linkedin}`}
                className="text-muted-foreground transition-colors hover:text-[#0A66C2]"
              >
                <Briefcase className="size-3.5" />
              </a>
            )}
            {row.instagram && (
              <a
                href={row.instagram.startsWith("http") ? row.instagram : `https://www.instagram.com/${row.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer noopener"
                title={`Instagram : ${row.instagram}`}
                className="text-muted-foreground transition-colors hover:text-[#E4405F]"
              >
                <AtSign className="size-3.5" />
              </a>
            )}
          </div>
        )}
      </td>
      <td className="py-3 pr-3 align-top">
        {(row.email || row.phone) ? (
          <div className="flex flex-col gap-0.5 text-xs">
            {row.email && (
              <a
                href={`mailto:${row.email}`}
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-[color:var(--color-klaivia-violet)]"
                title={row.email}
              >
                <Mail className="size-3 shrink-0" />
                <span className="max-w-[160px] truncate">{row.email}</span>
              </a>
            )}
            {row.phone && (
              <a
                href={`tel:${row.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-[color:var(--color-klaivia-violet)]"
                title={row.phone}
              >
                <Phone className="size-3 shrink-0" />
                <span>{row.phone}</span>
              </a>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="py-3 pr-3 align-top">
        {(row.adresse || row.ville || row.npa || row.canton) ? (
          <div className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3 shrink-0" />
            <div className="flex flex-col">
              {row.adresse && <span>{row.adresse}</span>}
              {(row.npa || row.ville) && (
                <span>
                  {row.npa && `${row.npa} `}
                  {row.ville}
                  {row.canton && ` (${row.canton})`}
                </span>
              )}
              {!row.adresse && !row.npa && !row.ville && row.canton && (
                <span>{row.canton}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="py-3 pr-3 align-top">
        <span className="rounded-md border border-[color:var(--color-klaivia-orange)]/30 bg-[color:var(--color-klaivia-orange-pale)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-klaivia-orange)]">
          {row.pack}
        </span>
      </td>
      <td className="py-3 pr-3 font-medium text-[color:var(--color-klaivia-green)]">
        {fmtCHF(row.mrrCHF)}
      </td>
      <td className="py-3 pr-3 text-muted-foreground">{fmtCHF(row.setupCHF)}</td>
      <td className="py-3 pr-3 text-muted-foreground">{fmtDate(row.dateDebut)}</td>
      <td className="py-3 pr-3">
        <Popover open={rdvOpen} onOpenChange={setRdvOpen}>
          <PopoverTrigger className="rounded px-2 py-1 text-xs hover:bg-muted">
            {row.prochainRDV ? fmtDate(row.prochainRDV) : <span className="text-muted-foreground/60">Planifier…</span>}
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-card p-3">
            <Label htmlFor={`rdv-${row.id}`} className="text-xs">Prochain RDV</Label>
            <Input
              id={`rdv-${row.id}`} type="date" value={rdvDate}
              onChange={(e) => setRdvDate(e.target.value)}
              className="mt-1"
            />
            <Button size="sm" onClick={onSetRDV} className="mt-2 w-full">
              Enregistrer
            </Button>
          </PopoverContent>
        </Popover>
      </td>
      <td className="py-3 pr-3">
        <Popover open={npsOpen} onOpenChange={setNpsOpen}>
          <PopoverTrigger className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted">
            <Star className="size-3 text-[color:var(--color-klaivia-gold)]" />
            {row.nps != null ? `${row.nps}/10` : <span className="text-muted-foreground/60">—</span>}
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-card p-3">
            <Label htmlFor={`nps-${row.id}`} className="text-xs">Note NPS (0-10)</Label>
            <Input
              id={`nps-${row.id}`} type="number" min={0} max={10}
              value={npsValue} onChange={(e) => setNpsValue(Number(e.target.value) || 0)}
              className="mt-1"
            />
            <Button size="sm" onClick={onSetNPS} className="mt-2 w-full">
              Enregistrer
            </Button>
          </PopoverContent>
        </Popover>
      </td>
      <td className="py-3 pr-3">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUT_COLOR[row.statut] ?? ""}`}>
          {row.statut}
        </span>
      </td>
      <td className="py-3 pr-3 text-right">
        <div className="inline-flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            className="size-7"
            onClick={() => setRdvOpen(true)}
            title="Planifier un RDV"
          >
            <CalendarDays className="size-3.5" />
          </Button>
          {row.statut !== "Churné" && (
            <Button
              variant="ghost" size="icon"
              className="size-7 text-[color:var(--color-klaivia-red)] hover:bg-destructive/10"
              onClick={() => setChurnOpen(true)}
              title="Marquer comme churné"
            >
              <UserMinus className="size-3.5" />
            </Button>
          )}
        </div>
      </td>

      {/* Dialog churn */}
      <Dialog open={churnOpen} onOpenChange={setChurnOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Marquer {fullName} comme churné</DialogTitle>
            <DialogDescription className="text-xs">
              Précise la raison — utile pour améliorer le produit et éviter les churns récurrents.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4} value={churnReason}
            onChange={(e) => setChurnReason(e.target.value)}
            placeholder="Ex : résultats insuffisants, budget coupé, changement d'outils…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setChurnOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={onChurn}>Confirmer le churn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </tr>
  );
}
