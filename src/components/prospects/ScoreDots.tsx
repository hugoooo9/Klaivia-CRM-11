import { cn } from "@/lib/utils";

export function ScoreDots({ score, className }: { score: number; className?: string }) {
  const color =
    score >= 4
      ? "bg-[color:var(--color-klaivia-green)]"
      : "bg-[color:var(--color-klaivia-violet-light)]";
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full transition-colors",
            i < score ? color : "bg-white/10"
          )}
        />
      ))}
    </div>
  );
}
