// LineChart du MRR hebdo — utilise la table KPI
"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { MRRPoint } from "@/lib/dashboard-stats";

type Props = { data: MRRPoint[] };

export function MRRChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        Aucun KPI saisi pour le moment.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="mrrGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-klaivia-orange)" />
            <stop offset="100%" stopColor="var(--color-klaivia-orange-light)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(46, 59, 78, 0.08)",
          }}
          formatter={(value) => [`${value} CHF`, "MRR"]}
          labelStyle={{ color: "var(--foreground)" }}
        />
        <Line
          type="monotone"
          dataKey="mrr"
          stroke="url(#mrrGradient)"
          strokeWidth={2.5}
          dot={{ fill: "var(--color-klaivia-orange)", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "var(--color-klaivia-orange)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
