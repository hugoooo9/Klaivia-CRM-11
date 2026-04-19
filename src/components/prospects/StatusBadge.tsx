import { cn } from "@/lib/utils";
import { STATUT_COLOR, type StatutProspect } from "@/lib/constants";

export function StatusBadge({ statut, className }: { statut: StatutProspect; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        STATUT_COLOR[statut],
        className
      )}
    >
      {statut}
    </span>
  );
}
