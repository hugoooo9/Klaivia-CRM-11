// PieChart de la répartition des prospects par secteur
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
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

export function SectorPie({ data }: Props) {
  const filtered = data.filter((d) => d.count > 0);
  if (filtered.length === 0) {
    return <EmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value} prospect(s)`, ""]}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
      Aucun prospect enregistré.
    </div>
  );
}
