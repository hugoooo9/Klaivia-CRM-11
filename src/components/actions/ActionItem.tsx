// Une ligne d'action du jour : prospect + quick-actions (fait / reporter / ajouter note)
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Clock, StickyNote, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { UrgencyDot } from "@/components/prospects/UrgencyDot";
import { StatusBadge } from "@/components/prospects/StatusBadge";
import { advanceProspectStatut, snoozeProspect } from "@/actions/prospects";
import { createInteraction } from "@/actions/interactions";
import { fmtDate, fmtRelative, stepStatus } from "@/lib/format";
import type { StatutProspect, Urgence } from "@/lib/constants";

type Props = {
  prospect: {
    id: string;
    prenom: string;
    nom: string;
    entreprise: string | null;
    email: string | null;
    phone: string | null;
    statut: string;
    urgence: string;
    canal: string;
    prochainStep: Date | null;
    packInteret: string | null;
  };
};

export function ActionItem({ prospect: p }: Props) {
  const [, startTransition] = useTransition();
  const [notePopover, setNotePopover] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [snoozePopover, setSnoozePopover] = useState(false);

  const fullName = `${p.prenom} ${p.nom}`;
  const status = stepStatus(p.prochainStep);

  const onFait = () => {
    startTransition(async () => {
      try {
        await advanceProspectStatut(p.id);
        toast.success(`${fullName} avancé`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onSnooze = (days: number) => {
    startTransition(async () => {
      try {
        await snoozeProspect(p.id, days);
        toast.success(`${fullName} reporté de ${days} jour${days > 1 ? "s" : ""}`);
        setSnoozePopover(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onAddNote = () => {
    if (!noteText.trim()) {
      toast.error("La note est vide");
      return;
    }
    startTransition(async () => {
      try {
        await createInteraction({
          prospectId: p.id,
          type: "Note",
          contenu: noteText,
          nextStepDays: 0,
        });
        toast.success("Note ajoutée");
        setNoteText("");
        setNotePopover(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <li className="flex items-center gap-3 py-3">
      <UrgencyDot urgence={p.urgence as Urgence} />

      <div className="min-w-0 flex-1">
        <Link
          href={`/prospects/${p.id}`}
          className="block truncate text-sm font-medium text-foreground hover:text-[color:var(--color-klaivia-orange)]"
        >
          {fullName}
          {p.entreprise && (
            <span className="ml-1 text-xs text-muted-foreground">· {p.entreprise}</span>
          )}
        </Link>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge statut={p.statut as StatutProspect} />
          <span className="text-muted-foreground">Canal : {p.canal}</span>
          {p.packInteret && (
            <span className="text-[color:var(--color-klaivia-gold)]">{p.packInteret}</span>
          )}
          {p.prochainStep && (
            <span
              className={
                status === "overdue"
                  ? "text-[color:var(--color-klaivia-red)]"
                  : status === "today"
                  ? "text-[color:var(--color-klaivia-gold)]"
                  : "text-muted-foreground"
              }
            >
              {status === "overdue" && "En retard · "}
              {status === "today" && "Aujourd'hui · "}
              {fmtDate(p.prochainStep)} ({fmtRelative(p.prochainStep)})
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {p.email && (
          <a
            href={`mailto:${p.email}`}
            className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title={p.email}
          >
            <Mail className="size-3.5" />
          </a>
        )}
        {p.phone && (
          <a
            href={`tel:${p.phone}`}
            className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title={p.phone}
          >
            <Phone className="size-3.5" />
          </a>
        )}

        <Popover open={notePopover} onOpenChange={setNotePopover}>
          <PopoverTrigger className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs hover:bg-muted">
            <StickyNote className="size-3" /> Note
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-card p-3">
            <Textarea
              rows={3} value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ce qui a été dit ou décidé…"
              className="text-sm"
            />
            <Button size="sm" onClick={onAddNote} className="mt-2 w-full">
              Ajouter la note
            </Button>
          </PopoverContent>
        </Popover>

        <Popover open={snoozePopover} onOpenChange={setSnoozePopover}>
          <PopoverTrigger className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs hover:bg-muted">
            <Clock className="size-3" /> Reporter
          </PopoverTrigger>
          <PopoverContent className="w-44 bg-card p-2">
            <div className="grid grid-cols-3 gap-1">
              {[1, 3, 7].map((d) => (
                <Button
                  key={d} size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => onSnooze(d)}
                >
                  +{d}j
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          onClick={onFait}
          className="h-7 bg-[color:var(--color-klaivia-green)] px-2 text-xs text-white hover:brightness-110"
        >
          <Check className="size-3" /> Fait
        </Button>
      </div>
    </li>
  );
}
