// BarChart vertical de la répartition des prospects par canal d'acquisition
"use client";

import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { BreakdownPoint } from "@/lib/dashboard-stats";

type Props = { data: BreakdownPoint[] };

// Palette Klaivia : violet primaire → bleu → vert → gold → navy-mid
const COLORS = [
  "var(--color-klaivia-violet)",
  "var(--color-klaivia-blue)",
  "var(--color-klaivia-green)",
  "var(--color-klaivia-gold)",
  "var(--color-klaivia-navy-mid)",
  "var(--color-klaivia-violet-light)",
];

export function ChannelBar({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Aucune donnée de canal pour l&apos;instant.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value} prospect(s)`, ""]}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
