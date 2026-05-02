// Modal de création / édition d'un prospect avec validation Zod
"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { prospectSchema, type ProspectInput } from "@/lib/validations";
import {
  STATUTS_PROSPECT, URGENCES, PACKS, URGENCE_DOT, type Urgence,
} from "@/lib/constants";
import { createProspect, updateProspect } from "@/actions/prospects";

type ProspectData = Partial<ProspectInput> & { id?: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ProspectData; // si défini → mode édition
};

export function ProspectForm({ open, onOpenChange, initial }: Props) {
  const isEdit = !!initial?.id;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Construit les defaultValues à partir de `initial`
  const buildDefaults = (init?: ProspectData): ProspectInput => ({
    prenom: init?.prenom ?? "",
    nom: init?.nom ?? "",
    entreprise: init?.entreprise ?? "",
    ville: init?.ville ?? "",
    email: init?.email ?? "",
    phone: init?.phone ?? "",
    instagram: init?.instagram ?? "",
    linkedin: init?.linkedin ?? "",
    secteur: init?.secteur ?? "",
    canal: init?.canal ?? "",
    statut: init?.statut ?? "Nouveau",
    urgence: init?.urgence ?? "Normale",
    score: init?.score ?? 3,
    prochainStep: init?.prochainStep ?? "",
    packInteret: init?.packInteret ?? "",
    budgetEstime: init?.budgetEstime,
    setupEstime: init?.setupEstime,
    notes: init?.notes ?? "",
    raisonPerte: init?.raisonPerte ?? "",
  });

  const form = useForm<ProspectInput>({
    resolver: zodResolver(prospectSchema),
    defaultValues: buildDefaults(initial),
  });

  // Reset du form quand `initial` change OU à chaque ouverture du dialog —
  // sinon useForm garde l'état initial du premier mount et les modifs se "réinitialisent".
  useEffect(() => {
    if (open) {
      form.reset(buildDefaults(initial));
      setServerError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const onSubmit = (data: ProspectInput) => {
    setServerError(null);
    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateProspect(initial.id, data);
          toast.success("Prospect mis à jour");
        } else {
          await createProspect(data);
          toast.success("Prospect créé");
        }
        onOpenChange(false);
        form.reset();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erreur inconnue";
        setServerError(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEdit ? "Modifier le prospect" : "Nouveau prospect"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Renseigne les informations — les champs marqués * sont obligatoires.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Identité */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="entreprise">Entreprise *</Label>
              <Input id="entreprise" {...form.register("entreprise")} className="mt-1" />
              {form.formState.errors.entreprise && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.entreprise.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" {...form.register("prenom")} className="mt-1" />
              {form.formState.errors.prenom && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.prenom.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" {...form.register("nom")} className="mt-1" />
              {form.formState.errors.nom && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.nom.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" {...form.register("ville")} className="mt-1" />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} className="mt-1" />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...form.register("phone")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" placeholder="@compte" {...form.register("instagram")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input id="linkedin" placeholder="slug ou URL" {...form.register("linkedin")} className="mt-1" />
            </div>
          </div>

          {/* Qualification */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="secteur">Secteur</Label>
              <Input
                id="secteur"
                placeholder="Ex. Thérapeute, Fiduciaire…"
                {...form.register("secteur")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="canal">Canal</Label>
              <Input
                id="canal"
                placeholder="Ex. Instagram, LinkedIn, Référence…"
                {...form.register("canal")}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.watch("statut")} onValueChange={(v) => v && form.setValue("statut", v as ProspectInput["statut"])}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUTS_PROSPECT.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgence</Label>
              <Select value={form.watch("urgence")} onValueChange={(v) => v && form.setValue("urgence", v as ProspectInput["urgence"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block size-2.5 rounded-full ${URGENCE_DOT[form.watch("urgence") as Urgence]}`}
                      />
                      {form.watch("urgence")}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {URGENCES.map((u) => (
                    <SelectItem key={u} value={u}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block size-2.5 rounded-full ${URGENCE_DOT[u]}`} />
                        {u}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Commercial */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="score">Score (1-5)</Label>
              <Input
                id="score" type="number" min={1} max={5}
                {...form.register("score", { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Pack d&apos;intérêt</Label>
              <Select
                value={form.watch("packInteret") || "none"}
                onValueChange={(v) => v && form.setValue("packInteret", v === "none" ? "" : v as ProspectInput["packInteret"])}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {PACKS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="budgetEstime">Budget mensuel (CHF)</Label>
              <Input
                id="budgetEstime" type="number" min={0}
                {...form.register("budgetEstime", { valueAsNumber: true, setValueAs: (v) => (v === "" || Number.isNaN(v) ? undefined : Number(v)) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="setupEstime">Setup one-shot (CHF)</Label>
              <Input
                id="setupEstime" type="number" min={0}
                {...form.register("setupEstime", { valueAsNumber: true, setValueAs: (v) => (v === "" || Number.isNaN(v) ? undefined : Number(v)) })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="prochainStep">Prochain step (date)</Label>
            <Input
              id="prochainStep" type="date"
              {...form.register("prochainStep")}
              className="mt-1 w-fit"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} {...form.register("notes")} className="mt-1" />
          </div>

          {form.watch("statut") === "Perdu" && (
            <div>
              <Label htmlFor="raisonPerte">Raison de la perte</Label>
              <Textarea id="raisonPerte" rows={2} {...form.register("raisonPerte")} className="mt-1" />
            </div>
          )}

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[color:var(--color-klaivia-orange)] text-white hover:bg-[color:var(--color-klaivia-orange-light)]"
            >
              {isPending ? "…" : isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
