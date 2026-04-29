import { cn } from "@/lib/utils";

export function ScoreDots({ score, className }: { score: number; className?: string }) {
  const color =
    score >= 4
      ? "bg-[color:var(--color-klaivia-green)]"
      : score >= 3
        ? "bg-[color:var(--color-klaivia-violet)]"
        : "bg-[color:var(--color-klaivia-gold)]";
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-2 rounded-full transition-all",
            i < score ? color : "bg-border"
          )}
        />
      ))}
    </div>
  );
}
