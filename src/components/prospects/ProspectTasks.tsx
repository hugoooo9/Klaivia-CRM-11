// Section Tâches dans la fiche prospect
"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTask, toggleTaskDone, deleteTask } from "@/actions/tasks";
import { fmtDate } from "@/lib/format";

type Task = {
  id: string;
  titre: string;
  description: string | null;
  dueDate: Date | null;
  done: boolean;
  priorite: string;
};

export function ProspectTasks({ prospectId, tasks }: { prospectId: string; tasks: Task[] }) {
  const [, startTransition] = useTransition();
  const [titre, setTitre] = useState("");
  const [dueDate, setDueDate] = useState("");

  const onAdd = () => {
    if (!titre.trim()) return;
    startTransition(async () => {
      try {
        await createTask({ titre, dueDate: dueDate || "", priorite: "Normale", prospectId });
        toast.success("Tâche ajoutée");
        setTitre("");
        setDueDate("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const now = new Date();

  return (
    <div className="klaivia-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Tâches · {tasks.filter((t) => !t.done).length} ouvertes
        </h3>
      </div>

      {/* Quick add */}
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Nouvelle tâche…"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          className="flex-1"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-[140px]"
        />
        <Button onClick={onAdd} className="klaivia-btn-primary font-semibold">
          <Plus className="size-4" />
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune tâche pour ce prospect.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const overdue = !t.done && t.dueDate && t.dueDate < now;
            return (
              <li
                key={t.id}
                className={`flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2 ${t.done ? "opacity-50" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await toggleTaskDone(t.id); })}
                  className="mt-0.5 shrink-0"
                >
                  {t.done ? (
                    <CheckCircle2 className="size-5 text-[color:var(--color-klaivia-green)]" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground hover:text-[color:var(--color-klaivia-violet)]" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${t.done ? "line-through" : "text-foreground"}`}>{t.titre}</div>
                  {t.dueDate && (
                    <div
                      className={`mt-0.5 flex items-center gap-1 text-[11px] ${
                        overdue ? "font-semibold text-[color:var(--color-klaivia-red)]" : "text-muted-foreground"
                      }`}
                    >
                      {overdue && <AlertTriangle className="size-3" />}
                      {fmtDate(t.dueDate)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await deleteTask(t.id); toast.success("Supprimée"); })}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
