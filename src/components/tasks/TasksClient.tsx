// Client component — liste tâches + form ajout rapide
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createTask, toggleTaskDone, deleteTask } from "@/actions/tasks";
import { fmtDate } from "@/lib/format";

type ProspectMini = {
  id: string;
  entreprise: string | null;
  prenom: string;
  nom: string;
};

type TaskWithProspect = {
  id: string;
  titre: string;
  description: string | null;
  dueDate: Date | null;
  done: boolean;
  priorite: string;
  prospectId: string | null;
  prospect: ProspectMini | null;
};

const PRIORITE_COLOR: Record<string, string> = {
  Haute: "bg-rose-50 text-rose-700 border-rose-200",
  Normale: "bg-sky-50 text-sky-700 border-sky-200",
  Faible: "bg-slate-50 text-slate-600 border-slate-200",
};

export function TasksClient({
  tasks,
  prospects,
}: {
  tasks: TaskWithProspect[];
  prospects: ProspectMini[];
}) {
  const [, startTransition] = useTransition();
  const [titre, setTitre] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priorite, setPriorite] = useState<"Haute" | "Normale" | "Faible">("Normale");
  const [prospectId, setProspectId] = useState<string>("none");
  const [filter, setFilter] = useState<"all" | "open" | "done" | "overdue">("open");

  const onAdd = () => {
    if (!titre.trim()) return;
    startTransition(async () => {
      try {
        await createTask({
          titre: titre.trim(),
          dueDate: dueDate || "",
          priorite,
          prospectId: prospectId === "none" ? "" : prospectId,
        });
        toast.success("Tâche créée");
        setTitre("");
        setDueDate("");
        setPriorite("Normale");
        setProspectId("none");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onToggle = (id: string) => {
    startTransition(async () => { await toggleTaskDone(id); });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      await deleteTask(id);
      toast.success("Tâche supprimée");
    });
  };

  const now = new Date();
  const filtered = tasks.filter((t) => {
    if (filter === "open") return !t.done;
    if (filter === "done") return t.done;
    if (filter === "overdue") return !t.done && t.dueDate && t.dueDate < now;
    return true;
  });

  const FILTERS: { id: typeof filter; label: string; count: number }[] = [
    { id: "open", label: "Ouvertes", count: tasks.filter((t) => !t.done).length },
    { id: "overdue", label: "En retard", count: tasks.filter((t) => !t.done && t.dueDate && t.dueDate < now).length },
    { id: "done", label: "Faites", count: tasks.filter((t) => t.done).length },
    { id: "all", label: "Toutes", count: tasks.length },
  ];

  return (
    <div className="space-y-5">
      {/* Quick add */}
      <div className="klaivia-card p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Label htmlFor="task-titre" className="text-[11px] uppercase tracking-wider text-muted-foreground">Nouvelle tâche</Label>
            <Input
              id="task-titre"
              placeholder="Rappeler Acme SA pour démo…"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
              className="mt-1"
            />
          </div>
          <div className="lg:col-span-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Échéance</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
          </div>
          <div className="lg:col-span-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Priorité</Label>
            <Select value={priorite} onValueChange={(v) => setPriorite(v as "Haute" | "Normale" | "Faible")}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Haute">Haute</SelectItem>
                <SelectItem value="Normale">Normale</SelectItem>
                <SelectItem value="Faible">Faible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Lié à</Label>
            <Select value={prospectId} onValueChange={(v) => setProspectId(v ?? "none")}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Aucun</SelectItem>
                {prospects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.entreprise ?? `${p.prenom} ${p.nom}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end lg:col-span-1">
            <Button onClick={onAdd} className="klaivia-btn-primary w-full font-semibold">
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-1 border-b border-border">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`relative px-3.5 py-2.5 text-sm font-medium transition-all ${
                active ? "text-[color:var(--color-klaivia-violet)]" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    active ? "bg-[color:var(--color-klaivia-violet-pale)] text-[color:var(--color-klaivia-violet)]" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f.count}
                </span>
              </span>
              {active && <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-[color:var(--color-klaivia-violet)]" />}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="klaivia-card flex flex-col items-center p-12 text-center text-muted-foreground">
            <CheckCircle2 className="mb-3 size-10 text-[color:var(--color-klaivia-green)]" />
            <p className="text-sm">Aucune tâche dans cette vue.</p>
          </div>
        ) : (
          filtered.map((t) => {
            const overdue = !t.done && t.dueDate && t.dueDate < now;
            return (
              <div
                key={t.id}
                className={`klaivia-card-hover flex items-start gap-3 p-4 ${t.done ? "opacity-60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(t.id)}
                  className="mt-0.5 shrink-0"
                  title={t.done ? "Marquer non fait" : "Marquer fait"}
                >
                  {t.done ? (
                    <CheckCircle2 className="size-5 text-[color:var(--color-klaivia-green)]" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground hover:text-[color:var(--color-klaivia-violet)]" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${t.done ? "line-through" : "text-foreground"}`}>
                    {t.titre}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`klaivia-badge ${PRIORITE_COLOR[t.priorite] ?? PRIORITE_COLOR.Normale}`}>
                      {t.priorite}
                    </span>
                    {t.dueDate && (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          overdue ? "text-[color:var(--color-klaivia-red)] font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {overdue && <AlertTriangle className="size-3" />}
                        {fmtDate(t.dueDate)}
                      </span>
                    )}
                    {t.prospect && (
                      <Link
                        href={`/prospects/${t.prospect.id}`}
                        className="text-[color:var(--color-klaivia-violet)] hover:underline"
                      >
                        {t.prospect.entreprise ?? `${t.prospect.prenom} ${t.prospect.nom}`}
                      </Link>
                    )}
                  </div>
                  {t.description && (
                    <p className="mt-1.5 text-xs text-muted-foreground">{t.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
