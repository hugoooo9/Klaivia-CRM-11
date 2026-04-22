// Cloche de notifications — popover avec les choses urgentes, triées par priorité
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fmtRelative } from "@/lib/format";
import type { NotificationItem } from "@/app/api/notifications/route";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [hasRed, setHasRed] = useState(false);

  // Fetch du badge compteur au montage (rapide), sans attendre l'ouverture
  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { count: number; hasRed: boolean }) => {
        if (!cancelled) {
          setUnreadCount(data.count);
          setHasRed(data.hasRed);
        }
      })
      .catch(() => {
        if (!cancelled) setUnreadCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch complet à chaque ouverture pour avoir la liste fraîche
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { items: NotificationItem[]; count: number; hasRed: boolean }) => {
        setItems(data.items);
        setUnreadCount(data.count);
        setHasRed(data.hasRed);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative hidden size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
        title="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount != null && unreadCount > 0 && (
          <span
            className={`absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${
              hasRed
                ? "bg-[color:var(--color-klaivia-red)]"
                : "bg-[color:var(--color-klaivia-gold)]"
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Notifications
            </div>
            <div className="text-[11px] text-muted-foreground">
              Triées par priorité — les urgences en premier
            </div>
          </div>
          {unreadCount != null && unreadCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                hasRed
                  ? "bg-[color:var(--color-klaivia-red)]/10 text-[color:var(--color-klaivia-red)]"
                  : "bg-[color:var(--color-klaivia-gold)]/15 text-[color:var(--color-klaivia-gold)]"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading && items === null && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              Chargement…
            </div>
          )}
          {items !== null && items.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              Rien d&apos;urgent — pipeline à jour.
            </div>
          )}
          {items !== null && items.length > 0 && (
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                  >
                    <span
                      className={`mt-1.5 inline-block size-2 shrink-0 rounded-full ${priorityDot(it.priority)} ${it.priority === 0 ? "animate-pulse" : ""}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${priorityText(it.priority)}`}
                        >
                          {it.label}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-sm font-medium text-foreground">
                        {it.title}
                      </div>
                      {it.subtitle && (
                        <div className="truncate text-xs text-muted-foreground">
                          {it.subtitle}
                        </div>
                      )}
                      {it.dueAt && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {fmtRelative(it.dueAt)}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-2">
          <Link
            href="/prospects"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-[color:var(--color-klaivia-violet)] hover:bg-muted"
          >
            Voir tous les prospects
            <ChevronRight className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Palette alignée sur URGENCE_DOT : rouge = Haute ou en retard, or = Normale/aujourd'hui,
// gris = Faible / RDV lointain. Une seule langue visuelle dans toute l'app.
function priorityDot(p: number): string {
  if (p <= 3) return "bg-[color:var(--color-klaivia-red)]";
  if (p <= 5) return "bg-[color:var(--color-klaivia-gold)]";
  return "bg-[color:var(--color-klaivia-gray)]";
}

function priorityText(p: number): string {
  if (p <= 3) return "text-[color:var(--color-klaivia-red)]";
  if (p <= 5) return "text-[color:var(--color-klaivia-gold)]";
  return "text-[color:var(--color-klaivia-gray)]";
}
