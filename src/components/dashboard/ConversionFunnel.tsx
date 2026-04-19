// BarChart horizontal du funnel de conversion — nombre de prospects par statut
"use client";

import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import type { FunnelPoint } from "@/lib/dashboard-stats";

type Props = { data: FunnelPoint[] };

// Progression du pipeline : gris → bleu → violet Klaivia → vert (signé) ; rouge pour perdu
const FUNNEL_COLORS = [
  "var(--color-klaivia-gray)",         // Nouveau
  "var(--color-klaivia-navy-mid)",     // Contacté
  "var(--color-klaivia-blue)",         // En discussion
  "var(--color-klaivia-violet-light)", // Démo planifiée
  "var(--color-klaivia-violet)",       // Négociation
  "var(--color-klaivia-green)",        // Signé
  "var(--color-klaivia-red)",          // Perdu
];

export function ConversionFunnel({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Aucun prospect dans le suivi.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, bottom: 0, left: 8 }}>
        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="statut"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}`, "Prospects"]}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
