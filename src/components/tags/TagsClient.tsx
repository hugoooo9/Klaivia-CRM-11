// Client component — création/suppression de tags
"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTag, deleteTag } from "@/actions/tags";

type TagWithCount = {
  id: string;
  label: string;
  color: string;
  _count: { prospects: number };
};

const PRESET_COLORS = [
  "#5B3FA6", "#0091AE", "#00BDA5", "#F2A900",
  "#F2545B", "#7C98B6", "#33475B", "#7B5DC8",
];

export function TagsClient({ tags }: { tags: TagWithCount[] }) {
  const [, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const onAdd = () => {
    if (!label.trim()) return;
    startTransition(async () => {
      try {
        await createTag({ label: label.trim(), color });
        toast.success("Tag créé");
        setLabel("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur (label déjà existant ?)");
      }
    });
  };

  const onDelete = (id: string, label: string) => {
    if (!confirm(`Supprimer le tag "${label}" ? Sera retiré de tous les prospects.`)) return;
    startTransition(async () => {
      await deleteTag(id);
      toast.success("Tag supprimé");
    });
  };

  return (
    <div className="space-y-5">
      <div className="klaivia-card p-4">
        <Label htmlFor="tag-label" className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Nouveau tag
        </Label>
        <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Input
              id="tag-label"
              placeholder="Ex: VIP, Décideur, Concurrent…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
            />
          </div>
          <div className="flex items-center gap-2 lg:col-span-6">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-7 rounded-full transition-transform ${
                  color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110" : ""
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
          <Button onClick={onAdd} className="klaivia-btn-primary font-semibold lg:col-span-1">
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {tags.length === 0 ? (
          <div className="klaivia-card flex flex-col items-center p-12 text-center text-muted-foreground">
            <TagIcon className="mb-3 size-10" />
            <p className="text-sm">Aucun tag pour l&apos;instant. Crée-en un ci-dessus.</p>
          </div>
        ) : (
          tags.map((t) => (
            <div key={t.id} className="klaivia-card-hover flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: t.color, borderColor: t.color }}
                >
                  <span className="size-1.5 rounded-full bg-white/80" />
                  {t.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t._count.prospects} prospect{t._count.prospects > 1 ? "s" : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDelete(t.id, t.label)}
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Supprimer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
