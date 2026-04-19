// Modal "Ajouter une interaction" — type + contenu + prochain step auto
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { INTERACTION_TYPES, NEXT_STEP_BY_TYPE, type InteractionType } from "@/lib/constants";
import { createInteraction } from "@/actions/interactions";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospectId: string;
};

export function InteractionModal({ open, onOpenChange, prospectId }: Props) {
  const [type, setType] = useState<InteractionType>("Note");
  const [contenu, setContenu] = useState("");
  const [nextStepDays, setNextStepDays] = useState<number>(NEXT_STEP_BY_TYPE.Note);
  const [isPending, startTransition] = useTransition();

  const onTypeChange = (t: string | null) => {
    if (!t) return;
    setType(t as InteractionType);
    setNextStepDays(NEXT_STEP_BY_TYPE[t as InteractionType]);
  };

  const onSubmit = () => {
    if (!contenu.trim()) {
      toast.error("Le contenu est requis");
      return;
    }
    startTransition(async () => {
      try {
        await createInteraction({ prospectId, type, contenu, nextStepDays });
        toast.success(`${type} enregistré`);
        setContenu("");
        setType("Note");
        setNextStepDays(NEXT_STEP_BY_TYPE.Note);
        onOpenChange(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Ajouter une interaction</DialogTitle>
          <DialogDescription className="text-xs">
            Le prochain step sera automatiquement planifié selon le type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={onTypeChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="contenu">Contenu *</Label>
            <Textarea
              id="contenu" rows={4}
              value={contenu} onChange={(e) => setContenu(e.target.value)}
              placeholder="Ce qui a été dit, échangé, décidé…"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="nextStep">Prochain step dans (jours)</Label>
            <Input
              id="nextStep" type="number" min={0} max={90}
              value={nextStepDays}
              onChange={(e) => setNextStepDays(Number(e.target.value) || 0)}
              className="mt-1 w-28"
            />
            <p className="mt-1 text-xs text-muted-foreground">0 = ne pas modifier le prochain step</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={onSubmit} disabled={isPending}
            className="bg-[color:var(--color-klaivia-orange)] text-white hover:bg-[color:var(--color-klaivia-orange-light)]"
          >
            {isPending ? "…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
