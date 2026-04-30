// Server Actions — Tasks (todos liées à un prospect ou globales)
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const taskSchema = z.object({
  titre: z.string().min(1, "Titre requis").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  priorite: z.enum(["Haute", "Normale", "Faible"]).default("Normale"),
  prospectId: z.string().optional().or(z.literal("")),
});

export type TaskInput = z.infer<typeof taskSchema>;

export async function createTask(input: TaskInput) {
  const parsed = taskSchema.parse(input);
  const task = await db.task.create({
    data: {
      titre: parsed.titre,
      description: parsed.description || null,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      priorite: parsed.priorite,
      prospectId: parsed.prospectId || null,
    },
  });
  if (task.prospectId) {
    await db.activity.create({
      data: {
        prospectId: task.prospectId,
        type: "TASK_CREATED",
        description: `Tâche créée : ${task.titre}`,
      },
    });
    revalidatePath(`/prospects/${task.prospectId}`);
  }
  revalidatePath("/taches");
  revalidatePath("/dashboard");
  return task;
}

export async function updateTask(id: string, input: Partial<TaskInput>) {
  const data: Record<string, unknown> = {};
  if (input.titre !== undefined) data.titre = input.titre;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.priorite !== undefined) data.priorite = input.priorite;
  const task = await db.task.update({ where: { id }, data });
  revalidatePath("/taches");
  if (task.prospectId) revalidatePath(`/prospects/${task.prospectId}`);
  return task;
}

export async function toggleTaskDone(id: string) {
  const t = await db.task.findUnique({ where: { id } });
  if (!t) throw new Error("Tâche introuvable");
  const updated = await db.task.update({
    where: { id },
    data: { done: !t.done },
  });
  if (updated.prospectId && updated.done) {
    await db.activity.create({
      data: {
        prospectId: updated.prospectId,
        type: "TASK_DONE",
        description: `Tâche complétée : ${updated.titre}`,
      },
    });
  }
  revalidatePath("/taches");
  if (updated.prospectId) revalidatePath(`/prospects/${updated.prospectId}`);
  revalidatePath("/dashboard");
  return updated;
}

export async function deleteTask(id: string) {
  const t = await db.task.findUnique({ where: { id }, select: { prospectId: true } });
  await db.task.delete({ where: { id } });
  revalidatePath("/taches");
  if (t?.prospectId) revalidatePath(`/prospects/${t.prospectId}`);
  return { ok: true };
}
