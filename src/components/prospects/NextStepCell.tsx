// Affiche la date du prochain step avec une couleur qui reflète son urgence
import { cn } from "@/lib/utils";
import { fmtDateShort, stepStatus } from "@/lib/format";

export function NextStepCell({ date }: { date: Date | string | null | undefined }) {
  const status = stepStatus(date);
  const cls =
    status === "overdue"
      ? "text-[color:var(--color-klaivia-red)]"
      : status === "today"
      ? "text-[color:var(--color-klaivia-gold)]"
      : "text-muted-foreground";
  return <span className={cn("text-xs tabular-nums", cls)}>{fmtDateShort(date)}</span>;
}
