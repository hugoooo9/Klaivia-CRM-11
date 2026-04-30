// Timeline fusionnée : activités auto + interactions manuelles
"use client";

import {
  TrendingUp, MessageSquare, CheckCircle2, Mail, Tag as TagIcon,
  Plus, Clock,
} from "lucide-react";
import { fmtDate, fmtRelative } from "@/lib/format";

type ActivityItem = {
  id: string;
  kind: "activity";
  type: string;
  description: string;
  createdAt: Date;
};

type InteractionItem = {
  id: string;
  kind: "interaction";
  type: string;
  contenu: string;
  createdAt: Date;
};

type Item = ActivityItem | InteractionItem;

const ACTIVITY_ICON: Record<string, { icon: typeof TrendingUp; color: string; bg: string }> = {
  STATUT_CHANGE: { icon: TrendingUp, color: "text-[color:var(--color-klaivia-violet)]", bg: "bg-[color:var(--color-klaivia-violet-pale)]" },
  TASK_DONE: { icon: CheckCircle2, color: "text-[color:var(--color-klaivia-green)]", bg: "bg-emerald-50" },
  TASK_CREATED: { icon: Plus, color: "text-sky-600", bg: "bg-sky-50" },
  EMAIL_SENT: { icon: Mail, color: "text-amber-600", bg: "bg-amber-50" },
  CREATED: { icon: Plus, color: "text-[color:var(--color-klaivia-violet)]", bg: "bg-[color:var(--color-klaivia-violet-pale)]" },
  TAG_ADDED: { icon: TagIcon, color: "text-pink-600", bg: "bg-pink-50" },
  INTERACTION: { icon: MessageSquare, color: "text-slate-600", bg: "bg-slate-50" },
};

const INTERACTION_ICON: Record<string, { icon: typeof MessageSquare; color: string; bg: string }> = {
  Email: { icon: Mail, color: "text-amber-600", bg: "bg-amber-50" },
  Appel: { icon: Clock, color: "text-sky-600", bg: "bg-sky-50" },
  default: { icon: MessageSquare, color: "text-slate-600", bg: "bg-slate-50" },
};

export function ActivityTimeline({
  activities,
  interactions,
}: {
  activities: ActivityItem[];
  interactions: InteractionItem[];
}) {
  // Fusion + tri DESC
  const items: Item[] = [...activities, ...interactions].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div className="klaivia-card p-6">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        Historique · {items.length} entrée{items.length > 1 ? "s" : ""}
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Pas d&apos;activité pour le moment. Les changements de statut, interactions et tâches apparaîtront ici automatiquement.
        </p>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-border pl-6">
          {items.map((it) => {
            const cfg =
              it.kind === "activity"
                ? ACTIVITY_ICON[it.type] ?? ACTIVITY_ICON.INTERACTION
                : INTERACTION_ICON[it.type] ?? INTERACTION_ICON.default;
            const Icon = cfg.icon;
            return (
              <li key={it.id} className="relative">
                <span
                  className={`absolute -left-[33px] top-0.5 flex size-6 items-center justify-center rounded-full border-2 border-card ${cfg.bg}`}
                >
                  <Icon className={`size-3 ${cfg.color}`} />
                </span>
                <div className="flex items-center gap-2">
                  <span className={`klaivia-badge ${cfg.bg} ${cfg.color} border-transparent`}>
                    {it.kind === "activity" ? it.type.replace(/_/g, " ").toLowerCase() : it.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(it.createdAt)} · {fmtRelative(it.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">
                  {it.kind === "activity" ? it.description : it.contenu}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
