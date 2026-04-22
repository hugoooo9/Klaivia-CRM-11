// GET /api/notifications — flux trié par urgence
// Ordre : overdue+Haute → overdue → Haute → aujourd'hui → RDV clients imminents
import { db } from "@/lib/db";

export const runtime = "nodejs";

export type NotificationItem = {
  id: string;
  kind: "prospect" | "client";
  priority: number; // plus petit = plus urgent
  label: string; // "En retard · Haute urgence"
  title: string;
  subtitle: string | null;
  href: string;
  dueAt: string | null; // ISO
  urgence?: "Haute" | "Normale" | "Faible";
};

export async function GET() {
  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  in7Days.setHours(23, 59, 59, 999);

  const [urgentProspects, clientsRdv] = await Promise.all([
    db.prospect.findMany({
      where: {
        statut: { notIn: ["Signé", "Perdu"] },
        OR: [
          { urgence: "Haute" },
          { prochainStep: { lte: endOfToday } },
        ],
      },
      select: {
        id: true,
        prenom: true,
        nom: true,
        entreprise: true,
        statut: true,
        urgence: true,
        prochainStep: true,
      },
      take: 50,
    }),
    db.client.findMany({
      where: {
        statut: "Actif",
        prochainRDV: { lte: in7Days },
      },
      select: {
        id: true,
        prochainRDV: true,
        prospect: {
          select: { prenom: true, nom: true, entreprise: true },
        },
      },
      take: 20,
    }),
  ]);

  const items: NotificationItem[] = [];

  for (const p of urgentProspects) {
    const overdue = p.prochainStep ? p.prochainStep < now : false;
    const today =
      !overdue && p.prochainStep
        ? p.prochainStep.getTime() <= endOfToday.getTime()
        : false;
    const haute = p.urgence === "Haute";

    let priority = 5;
    let label = "À suivre";
    if (overdue && haute) {
      priority = 0;
      label = "En retard · Haute urgence";
    } else if (overdue) {
      priority = 1;
      label = "En retard";
    } else if (haute && today) {
      priority = 2;
      label = "Aujourd'hui · Haute urgence";
    } else if (haute) {
      priority = 3;
      label = "Haute urgence";
    } else if (today) {
      priority = 4;
      label = "Aujourd'hui";
    }

    items.push({
      id: `p-${p.id}`,
      kind: "prospect",
      priority,
      label,
      title: `${p.prenom} ${p.nom}`.trim(),
      subtitle: p.entreprise || p.statut,
      href: `/prospects/${p.id}`,
      dueAt: p.prochainStep ? p.prochainStep.toISOString() : null,
      urgence: p.urgence as "Haute" | "Normale" | "Faible",
    });
  }

  for (const c of clientsRdv) {
    if (!c.prochainRDV) continue;
    const overdueRdv = c.prochainRDV < now;
    const priority = overdueRdv ? 1 : 6;
    const label = overdueRdv ? "RDV client en retard" : "RDV client à venir";
    items.push({
      id: `c-${c.id}`,
      kind: "client",
      priority,
      label,
      title: `${c.prospect.prenom} ${c.prospect.nom}`.trim(),
      subtitle: c.prospect.entreprise,
      href: `/clients`,
      dueAt: c.prochainRDV.toISOString(),
    });
  }

  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ta = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
    const tb = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
    return ta - tb;
  });

  // `hasRed` = y a-t-il au moins un item niveau rouge (Haute OU overdue) ?
  // Sert au badge de la cloche (rouge si critique, or sinon).
  const hasRed = items.some((it) => it.priority <= 3);

  return Response.json({ items, count: items.length, hasRed });
}
