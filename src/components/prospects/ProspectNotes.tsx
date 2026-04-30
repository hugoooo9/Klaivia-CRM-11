// Notes éditable inline — auto-save sur blur ou Cmd+Enter
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateProspectNotes } from "@/actions/prospects";

export function ProspectNotes({
  prospectId,
  initialNotes,
}: {
  prospectId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  const onSave = () => {
    startTransition(async () => {
      try {
        await updateProspectNotes(prospectId, notes);
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 1500);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onCancel = () => {
    setNotes(initialNotes ?? "");
    setEditing(false);
  };

  return (
    <div className="klaivia-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Notes</h3>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-klaivia-green)]">
              <Check className="size-3" /> Enregistré
            </span>
          )}
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Modifier"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            ref={taRef}
            rows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                onSave();
              }
              if (e.key === "Escape") onCancel();
            }}
            placeholder="Ajoute des notes sur ce prospect…"
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              ⌘+Entrée pour enregistrer · Échap pour annuler
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
                Annuler
              </Button>
              <Button onClick={onSave} disabled={isPending} className="klaivia-btn-primary font-semibold" size="sm">
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block w-full cursor-text rounded text-left text-sm transition-colors hover:bg-muted/40"
          title="Cliquer pour modifier"
        >
          {notes ? (
            <p className="whitespace-pre-wrap text-foreground">{notes}</p>
          ) : (
            <p className="text-muted-foreground italic">Aucune note. Clique pour ajouter…</p>
          )}
        </button>
      )}
    </div>
  );
}
