-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,
    "nom" TEXT,
    "prenom" TEXT,
    "fonction" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "linkedin" TEXT,
    "source" TEXT NOT NULL,
    CONSTRAINT "Contact_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApproachMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "ton" TEXT,
    "genereA" TEXT NOT NULL,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "promptVersion" TEXT NOT NULL,
    CONSTRAINT "ApproachMessage_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnrichmentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "donneesBrutes" TEXT,
    "erreur" TEXT,
    CONSTRAINT "EnrichmentLog_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptOut" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valeur" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "raison" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prospect" (
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
    "raisonPerte" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "enrichissementAuto" BOOLEAN NOT NULL DEFAULT false,
    "raisonSociale" TEXT,
    "numeroIDE" TEXT,
    "canton" TEXT,
    "npa" TEXT,
    "adresse" TEXT,
    "secteurNOGA" TEXT,
    "tailleEntreprise" INTEGER,
    "dateCreationRC" DATETIME,
    "siteWeb" TEXT,
    "googleRating" REAL,
    "googleReviewsCount" INTEGER,
    "signauxDouleur" TEXT,
    "scoreICP" INTEGER,
    "pipelineAuto" TEXT,
    "derniereEnrichAt" DATETIME
);
INSERT INTO "new_Prospect" ("budgetEstime", "canal", "createdAt", "dateContact", "email", "entreprise", "id", "instagram", "linkedin", "nom", "notes", "packInteret", "phone", "prenom", "prochainStep", "raisonPerte", "score", "secteur", "statut", "updatedAt", "urgence", "ville") SELECT "budgetEstime", "canal", "createdAt", "dateContact", "email", "entreprise", "id", "instagram", "linkedin", "nom", "notes", "packInteret", "phone", "prenom", "prochainStep", "raisonPerte", "score", "secteur", "statut", "updatedAt", "urgence", "ville" FROM "Prospect";
DROP TABLE "Prospect";
ALTER TABLE "new_Prospect" RENAME TO "Prospect";
CREATE UNIQUE INDEX "Prospect_numeroIDE_key" ON "Prospect"("numeroIDE");
CREATE INDEX "Prospect_statut_idx" ON "Prospect"("statut");
CREATE INDEX "Prospect_urgence_idx" ON "Prospect"("urgence");
CREATE INDEX "Prospect_prochainStep_idx" ON "Prospect"("prochainStep");
CREATE INDEX "Prospect_source_idx" ON "Prospect"("source");
CREATE INDEX "Prospect_pipelineAuto_idx" ON "Prospect"("pipelineAuto");
CREATE INDEX "Prospect_scoreICP_idx" ON "Prospect"("scoreICP");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Contact_prospectId_idx" ON "Contact"("prospectId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "ApproachMessage_prospectId_idx" ON "ApproachMessage"("prospectId");

-- CreateIndex
CREATE INDEX "EnrichmentLog_prospectId_idx" ON "EnrichmentLog"("prospectId");

-- CreateIndex
CREATE INDEX "EnrichmentLog_source_idx" ON "EnrichmentLog"("source");

-- CreateIndex
CREATE UNIQUE INDEX "OptOut_valeur_key" ON "OptOut"("valeur");
