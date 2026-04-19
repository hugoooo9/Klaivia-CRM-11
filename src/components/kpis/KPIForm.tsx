// Form KPI hebdo — 6 inputs numériques + annee/semaine, upsert via Server Action
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { upsertKPI } from "@/actions/kpis";

type Latest = {
  semaine: number;
  annee: number;
  dmEnvoyes: number;
  reponses: number;
  appels: number;
  demos: number;
  closes: number;
  mrr: number;
};

type Props = {
  defaultAnnee: number;
  defaultSemaine: number;
  latest: Latest | null;
};

export function KPIForm({ defaultAnnee, defaultSemaine, latest }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [annee, setAnnee] = useState<number>(defaultAnnee);
  const [semaine, setSemaine] = useState<number>(defaultSemaine);
  const [dmEnvoyes, setDmEnvoyes] = useState<number>(0);
  const [reponses, setReponses] = useState<number>(0);
  const [appels, setAppels] = useState<number>(0);
  const [demos, setDemos] = useState<number>(0);
  const [closes, setCloses] = useState<number>(0);
  const [mrr, setMrr] = useState<number>(latest?.mrr ?? 0);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await upsertKPI({
          annee, semaine, dmEnvoyes, reponses, appels, demos, closes, mrr,
        });
        toast.success(`KPI semaine ${semaine}/${annee} enregistré`);
        router.refresh();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur de validation");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField label="Année" value={annee} onChange={setAnnee} />
        <NumberField label="Semaine ISO" value={semaine} onChange={setSemaine} min={1} max={53} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <NumberField label="DM envoyés" value={dmEnvoyes} onChange={setDmEnvoyes} />
        <NumberField label="Réponses" value={reponses} onChange={setReponses} />
        <NumberField label="Appels" value={appels} onChange={setAppels} />
        <NumberField label="Démos" value={demos} onChange={setDemos} />
        <NumberField label="Closes" value={closes} onChange={setCloses} />
        <NumberField label="MRR (CHF)" value={mrr} onChange={setMrr} />
      </div>

      {latest && (
        <p className="text-xs text-muted-foreground">
          Dernière semaine saisie : S{latest.semaine}/{latest.annee} · MRR {latest.mrr} · {latest.closes} close(s)
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit" disabled={isPending}
          className="bg-[color:var(--color-klaivia-orange)] text-white hover:bg-[color:var(--color-klaivia-orange-light)]"
        >
          {isPending ? "Enregistrement…" : "Enregistrer la semaine"}
        </Button>
      </div>
    </form>
  );
}

function NumberField({
  label, value, onChange, min = 0, max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const id = `kpi-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  return (
    <div>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id} type="number"
        min={min} max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1"
      />
    </div>
  );
}
