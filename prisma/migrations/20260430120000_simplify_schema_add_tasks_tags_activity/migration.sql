-- Drop tables prospector mortes
DROP TABLE IF EXISTS "ApproachMessage";
DROP TABLE IF EXISTS "EnrichmentLog";
DROP TABLE IF EXISTS "OptOut";
DROP TABLE IF EXISTS "Contact";

-- Drop colonnes prospector mortes (SQLite >=3.35 supporte DROP COLUMN)
ALTER TABLE "Prospect" DROP COLUMN "enrichissementAuto";
ALTER TABLE "Prospect" DROP COLUMN "raisonSociale";
ALTER TABLE "Prospect" DROP COLUMN "numeroIDE";
ALTER TABLE "Prospect" DROP COLUMN "secteurNOGA";
ALTER TABLE "Prospect" DROP COLUMN "tailleEntreprise";
ALTER TABLE "Prospect" DROP COLUMN "dateCreationRC";
ALTER TABLE "Prospect" DROP COLUMN "googleRating";
ALTER TABLE "Prospect" DROP COLUMN "googleReviewsCount";
ALTER TABLE "Prospect" DROP COLUMN "signauxDouleur";
ALTER TABLE "Prospect" DROP COLUMN "scoreICP";
ALTER TABLE "Prospect" DROP COLUMN "pipelineAuto";
ALTER TABLE "Prospect" DROP COLUMN "derniereEnrichAt";

-- CreateTable Task
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "priorite" TEXT NOT NULL DEFAULT 'Normale',
    "prospectId" TEXT,
    CONSTRAINT "Task_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Task_prospectId_idx" ON "Task"("prospectId");
CREATE INDEX "Task_done_idx" ON "Task"("done");
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateTable Tag
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#5B3FA6'
);
CREATE UNIQUE INDEX "Tag_label_key" ON "Tag"("label");

-- CreateTable ProspectTag
CREATE TABLE "ProspectTag" (
    "prospectId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("prospectId", "tagId"),
    CONSTRAINT "ProspectTag_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProspectTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProspectTag_tagId_idx" ON "ProspectTag"("tagId");

-- CreateTable Activity
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "meta" TEXT,
    "prospectId" TEXT NOT NULL,
    CONSTRAINT "Activity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Activity_prospectId_idx" ON "Activity"("prospectId");
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateTable Template
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sujet" TEXT,
    "contenu" TEXT NOT NULL,
    "variables" TEXT
);
CREATE INDEX "Template_type_idx" ON "Template"("type");
