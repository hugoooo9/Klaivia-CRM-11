// Page Tâches — todos liées à un prospect ou globales
import { Topbar } from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { TasksClient } from "@/components/tasks/TasksClient";

export default async function TachesPage() {
  const [tasks, prospects] = await Promise.all([
    db.task.findMany({
      orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        prospect: {
          select: { id: true, entreprise: true, prenom: true, nom: true },
        },
      },
    }),
    db.prospect.findMany({
      where: { statut: { notIn: ["Signé", "Perdu"] } },
      orderBy: { entreprise: "asc" },
      select: { id: true, entreprise: true, prenom: true, nom: true },
    }),
  ]);

  const openCount = tasks.filter((t) => !t.done).length;
  const overdueCount = tasks.filter(
    (t) => !t.done && t.dueDate && t.dueDate < new Date()
  ).length;

  return (
    <>
      <Topbar
        title="Tâches"
        subtitle={`${openCount} ouvertes${overdueCount > 0 ? ` · ${overdueCount} en retard` : ""}`}
      />
      <div className="p-8">
        <TasksClient tasks={tasks} prospects={prospects} />
      </div>
    </>
  );
}
