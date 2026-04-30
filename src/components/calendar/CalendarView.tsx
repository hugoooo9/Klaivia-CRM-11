// Client component — vue calendrier mois (FullCalendar-like, custom léger)
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Event = {
  id: string;
  kind: "prospect" | "task";
  date: string; // ISO
  title: string;
  sub: string;
  urgence: string;
  href: string;
};

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const URGENCE_COLOR: Record<string, string> = {
  Haute: "bg-rose-50 text-rose-700 border-rose-300",
  Normale: "bg-sky-50 text-sky-700 border-sky-300",
  Faible: "bg-slate-50 text-slate-600 border-slate-300",
};

export function CalendarView({ events }: { events: Event[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekDay = (firstOfMonth.getDay() + 6) % 7; // Lun = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekDay + daysInMonth) / 7) * 7;

  const eventsByDay = new Map<string, Event[]>();
  for (const e of events) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(e);
  }

  const goPrev = () => setCursor(new Date(year, month - 1, 1));
  const goNext = () => setCursor(new Date(year, month + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={goToday}>Aujourd&apos;hui</Button>
          <Button variant="outline" size="sm" onClick={goNext}><ChevronRight className="size-4" /></Button>
          <h2 className="ml-3 text-lg font-semibold tracking-tight">
            {MONTHS_FR[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[color:var(--color-klaivia-violet)]" /> Prospect
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[color:var(--color-klaivia-blue)]" /> Tâche
          </span>
        </div>
      </div>

      <div className="klaivia-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {DAYS_FR.map((d) => (
            <div key={d} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - startWeekDay + 1;
            const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
            const cellDate = new Date(year, month, dayNum);
            const key = `${year}-${month}-${dayNum}`;
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = cellDate.getTime() === today.getTime();
            const isPast = cellDate < today && !isToday;

            return (
              <div
                key={i}
                className={`min-h-[110px] border-b border-r border-border p-1.5 ${
                  inMonth ? (isPast ? "bg-muted/20" : "bg-card") : "bg-muted/30"
                } ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
              >
                {inMonth && (
                  <>
                    <div
                      className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? "bg-[color:var(--color-klaivia-violet)] text-white"
                          : isPast
                            ? "text-muted-foreground"
                            : "text-foreground"
                      }`}
                    >
                      {dayNum}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <Link
                          key={e.id}
                          href={e.href}
                          className={`block truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight transition-opacity hover:opacity-80 ${
                            URGENCE_COLOR[e.urgence] ?? URGENCE_COLOR.Normale
                          }`}
                          title={`${e.title} — ${e.sub}`}
                        >
                          <span className="mr-1">{e.kind === "prospect" ? "●" : "✓"}</span>
                          {e.title}
                        </Link>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="px-1.5 text-[10px] font-semibold text-muted-foreground">
                          +{dayEvents.length - 3} autres
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
