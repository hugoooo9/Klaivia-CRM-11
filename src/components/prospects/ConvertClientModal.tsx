// Modal "Convertir en client" — pack, MRR, setup, date début → crée un Client
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PACKS, PACK_MRR, type Pack } from "@/lib/constants";
import { convertProspectToClient } from "@/actions/clients";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospectId: string;
  prospectName: string;
  defaultPack?: Pack;
};

export function ConvertClientModal({ open, onOpenChange, prospectId, prospectName, defaultPack }: Props) {
  const [pack, setPack] = useState<Pack>(defaultPack ?? "Growth IA");
  const [mrr, setMrr] = useState<number>(defaultPack ? PACK_MRR[defaultPack] : PACK_MRR["Growth IA"]);
  const [setupCHF, setSetupCHF] = useState<number>(1200);
  const [dateDebut, setDateDebut] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();

  const onPackChange = (p: string | null) => {
    if (!p) return;
    setPack(p as Pack);
    setMrr(PACK_MRR[p as Pack]);
  };

  const onSubmit = () => {
    startTransition(async () => {
      try {
        await convertProspectToClient({
          prospectId, pack, mrrCHF: mrr, setupCHF,
          dateDebut,
          prochainRDV: "",
          statut: "Actif",
        });
        toast.success(`${prospectName} est maintenant client · ${pack}`);
        onOpenChange(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Convertir en client</DialogTitle>
          <DialogDescription className="text-xs">
            {prospectName} passe en statut « Signé » et devient un client actif.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Pack</Label>
            <Select value={pack} onValueChange={onPackChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PACKS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p} — {PACK_MRR[p]} CHF/mois
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mrr">MRR (CHF/mois)</Label>
              <Input id="mrr" type="number" min={0}
                value={mrr} onChange={(e) => setMrr(Number(e.target.value) || 0)}
                className="mt-1" />
            </div>
            <div>
              <Label htmlFor="setup">Setup (CHF)</Label>
              <Input id="setup" type="number" min={0}
                value={setupCHF} onChange={(e) => setSetupCHF(Number(e.target.value) || 0)}
                className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="dateDebut">Date de début</Label>
            <Input id="dateDebut" type="date"
              value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
              className="mt-1 w-fit" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={onSubmit} disabled={isPending}
            className="bg-[color:var(--color-klaivia-green)] text-white hover:brightness-110"
          >
            {isPending ? "…" : "Confirmer la signature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
