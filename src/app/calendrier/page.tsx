// Page Calendrier — vue mois des prochainStep prospects + tasks dueDate
import { Topbar } from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { CalendarView } from "@/components/calendar/CalendarView";

export default async function CalendrierPage() {
  // Fenêtre : -7 → +90 jours
  const start = new Date();
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 90);
  end.setHours(23, 59, 59, 999);

  const [prospects, tasks] = await Promise.all([
    db.prospect.findMany({
      where: {
        prochainStep: { gte: start, lte: end },
        statut: { notIn: ["Signé", "Perdu"] },
      },
      select: {
        id: true,
        entreprise: true,
        prenom: true,
        nom: true,
        statut: true,
        urgence: true,
        prochainStep: true,
      },
    }),
    db.task.findMany({
      where: {
        dueDate: { gte: start, lte: end },
        done: false,
      },
      select: {
        id: true,
        titre: true,
        priorite: true,
        dueDate: true,
        prospect: { select: { id: true, entreprise: true, prenom: true, nom: true } },
      },
    }),
  ]);

  // Sérialisation pour client
  const events = [
    ...prospects.map((p) => ({
      id: `prospect-${p.id}`,
      kind: "prospect" as const,
      date: p.prochainStep!.toISOString(),
      title: p.entreprise ?? `${p.prenom} ${p.nom}`,
      sub: p.statut,
      urgence: p.urgence,
      href: `/prospects/${p.id}`,
    })),
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      kind: "task" as const,
      date: t.dueDate!.toISOString(),
      title: t.titre,
      sub: t.prospect ? (t.prospect.entreprise ?? `${t.prospect.prenom} ${t.prospect.nom}`) : "Tâche libre",
      urgence: t.priorite,
      href: t.prospect ? `/prospects/${t.prospect.id}` : "/taches",
    })),
  ];

  return (
    <>
      <Topbar
        title="Calendrier"
        subtitle={`${events.length} échéance${events.length > 1 ? "s" : ""} sur 3 mois`}
      />
      <div className="p-8">
        <CalendarView events={events} />
      </div>
    </>
  );
}
