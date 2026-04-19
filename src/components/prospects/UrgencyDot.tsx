import { cn } from "@/lib/utils";
import { URGENCE_DOT, type Urgence } from "@/lib/constants";

export function UrgencyDot({ urgence, className }: { urgence: Urgence; className?: string }) {
  return (
    <span
      title={`Urgence ${urgence}`}
      className={cn("inline-block size-2.5 rounded-full", URGENCE_DOT[urgence], className)}
    />
  );
}
