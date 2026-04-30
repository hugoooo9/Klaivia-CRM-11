// Seed Klaivia CRM — base vide au démarrage.
// La prospection se fait via l'agent prospecteur (Zefix) et l'import de fichiers.
// Usage : npx prisma db seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe complet — on part d'une base vierge, aucun client fictif.
  // Ordre : enfants → parents (respect des FK).
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.prospectTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.template.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.client.deleteMany();
  await prisma.prospect.deleteMany();
  await prisma.kPI.deleteMany();

  console.log("Base vidée — aucune donnée fictive.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
