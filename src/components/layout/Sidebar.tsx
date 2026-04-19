// Sidebar Klaivia — rail navy fixe, actif orange, stats bas de page
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Flame, Trophy, LineChart, Sparkles, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtCHF } from "@/lib/format";

const ICON_MAP = {
  LayoutDashboard,
  Users,
  Flame,
  Trophy,
  LineChart,
  Radar,
} as const;

type NavItem = { href: string; label: string; icon: keyof typeof ICON_MAP };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Vue d'ensemble",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    ],
  },
  {
    title: "Prospection",
    items: [
      { href: "/prospects", label: "Prospects", icon: "Users" },
      { href: "/actions-du-jour", label: "Actions du jour", icon: "Flame" },
    ],
  },
  {
    title: "Portefeuille",
    items: [
      { href: "/clients", label: "Clients actifs", icon: "Trophy" },
      { href: "/kpis", label: "KPIs hebdo", icon: "LineChart" },
    ],
  },
];

type Props = {
  mrr: number;
  tauxConversion: number;
};

export function Sidebar({ mrr, tauxConversion }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      aria-label="Navigation principale"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-md bg-[color:var(--color-klaivia-orange)]">
          <Sparkles className="size-5 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight text-white">Klaivia</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">CRM</span>
        </div>
      </div>

      {/* Liens groupés par section */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-5 last:mb-0">
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-white/5 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[color:var(--color-klaivia-orange)] transition-opacity",
                        active ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden
                    />
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active ? "text-[color:var(--color-klaivia-orange)]" : "text-white/70 group-hover:text-white"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Mini-stats bas */}
      <div className="mx-3 mb-4 space-y-2.5 rounded-md border border-white/5 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/50">MRR</span>
          <span className="text-sm font-semibold text-[color:var(--color-klaivia-green)]">
            {fmtCHF(mrr)}
          </span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/50">Conversion</span>
          <span className="text-sm font-semibold text-white">
            {tauxConversion.toFixed(1)}%
          </span>
        </div>
      </div>
    </aside>
  );
}
