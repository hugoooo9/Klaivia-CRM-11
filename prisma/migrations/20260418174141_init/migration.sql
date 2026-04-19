-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "entreprise" TEXT,
    "ville" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "secteur" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Nouveau',
    "urgence" TEXT NOT NULL DEFAULT 'Normale',
    "score" INTEGER NOT NULL DEFAULT 3,
    "dateContact" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prochainStep" DATETIME,
    "packInteret" TEXT,
    "budgetEstime" INTEGER,
    "notes" TEXT,
    "raisonPerte" TEXT
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    CONSTRAINT "Interaction_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "prospectId" TEXT NOT NULL,
    "pack" TEXT NOT NULL,
    "mrrCHF" INTEGER NOT NULL,
    "setupCHF" INTEGER NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "prochainRDV" DATETIME,
    "nps" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "notes" TEXT,
    CONSTRAINT "Client_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "semaine" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "dmEnvoyes" INTEGER NOT NULL DEFAULT 0,
    "reponses" INTEGER NOT NULL DEFAULT 0,
    "appels" INTEGER NOT NULL DEFAULT 0,
    "demos" INTEGER NOT NULL DEFAULT 0,
    "closes" INTEGER NOT NULL DEFAULT 0,
    "mrr" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "Prospect_statut_idx" ON "Prospect"("statut");

-- CreateIndex
CREATE INDEX "Prospect_urgence_idx" ON "Prospect"("urgence");

-- CreateIndex
CREATE INDEX "Prospect_prochainStep_idx" ON "Prospect"("prochainStep");

-- CreateIndex
CREATE INDEX "Interaction_prospectId_idx" ON "Interaction"("prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_prospectId_key" ON "Client"("prospectId");

-- CreateIndex
CREATE INDEX "Client_statut_idx" ON "Client"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "KPI_annee_semaine_key" ON "KPI"("annee", "semaine");
