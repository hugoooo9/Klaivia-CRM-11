// Helpers de formatage (dates, CHF, initiales, couleurs déterministes)
import { format, formatDistanceToNow, isToday, isPast, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

export function fmtCHF(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy", { locale: fr });
}

export function fmtDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM", { locale: fr });
}

export function fmtRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

export function stepStatus(date: Date | string | null | undefined): "overdue" | "today" | "future" | "none" {
  if (!date) return "none";
  const d = new Date(date);
  if (isToday(d)) return "today";
  if (isPast(d)) return "overdue";
  return "future";
}

export function daysOverdue(date: Date | string): number {
  return Math.max(0, differenceInDays(new Date(), new Date(date)));
}

export function initials(prenom: string, nom: string): string {
  return `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
}

// Couleur déterministe basée sur un nom → utilisée pour les avatars
const AVATAR_PALETTE = [
  "#5B3FA6", "#7B5DC8", "#C9A84C", "#2ECC8B", "#E8445A",
  "#4A90E2", "#E67E22", "#1ABC9C", "#9B59B6", "#F39C12",
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
