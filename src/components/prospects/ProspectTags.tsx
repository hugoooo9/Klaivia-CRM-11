// Section Tags dans fiche prospect — assignation/détachement + création inline
"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { attachTag, detachTag, createTag } from "@/actions/tags";

type Tag = { id: string; label: string; color: string };

export function ProspectTags({
  prospectId,
  assigned,
}: {
  prospectId: string;
  assigned: Tag[];
}) {
  const [, startTransition] = useTransition();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  // Charge tous les tags dispo via fetch côté client (lazy)
  useEffect(() => {
    if (!adding) return;
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setAllTags(d.tags ?? []))
      .catch(() => {});
  }, [adding]);

  const assignedIds = new Set(assigned.map((t) => t.id));
  const available = allTags.filter((t) => !assignedIds.has(t.id));

  const onAttach = (tagId: string) => {
    startTransition(async () => {
      try {
        await attachTag(prospectId, tagId);
        toast.success("Tag ajouté");
        setAdding(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onDetach = (tagId: string) => {
    startTransition(async () => {
      await detachTag(prospectId, tagId);
    });
  };

  const onCreateAndAttach = () => {
    const label = newLabel.trim();
    if (!label) return;
    startTransition(async () => {
      try {
        const tag = await createTag({ label });
        await attachTag(prospectId, tag.id);
        toast.success("Tag créé et appliqué");
        setNewLabel("");
        setAdding(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur (label déjà existant ?)");
      }
    });
  };

  return (
    <div className="klaivia-card p-5">
      <h3 className="mb-3 text-base font-semibold text-foreground">Tags</h3>
      <div className="flex flex-wrap gap-1.5">
        {assigned.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground">Aucun tag.</p>
        )}
        {assigned.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: t.color, borderColor: t.color }}
          >
            {t.label}
            <button
              type="button"
              onClick={() => onDetach(t.id)}
              className="rounded-full p-0.5 transition-colors hover:bg-white/20"
              title="Retirer"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-[color:var(--color-klaivia-violet)] hover:text-[color:var(--color-klaivia-violet)]"
          >
            <Plus className="size-3" /> Ajouter
          </button>
        ) : (
          <div className="mt-2 w-full space-y-2 rounded-md border border-border bg-muted/40 p-2">
            <div className="flex gap-1.5">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onCreateAndAttach()}
                placeholder="Nom du tag…"
                className="h-7 text-xs"
              />
              <Button size="sm" onClick={onCreateAndAttach} className="klaivia-btn-primary">
                <Plus className="size-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
                <X className="size-3" />
              </Button>
            </div>
            {available.length > 0 && (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Existants
                </div>
                <div className="flex flex-wrap gap-1">
                  {available.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onAttach(t.id)}
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white transition-opacity hover:opacity-80"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {available.length === 0 && allTags.length > 0 && (
              <p className="text-[10px] text-muted-foreground">Tous les tags sont déjà appliqués.</p>
            )}
            {allTags.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Aucun tag créé. Tape un nom + entrée.</p>
            )}
          </div>
        )}
      </div>
      {assigned.length === 0 && !adding && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <TagIcon className="size-3" /> Catégorise pour filtrer plus vite.
        </div>
      )}
    </div>
  );
}
