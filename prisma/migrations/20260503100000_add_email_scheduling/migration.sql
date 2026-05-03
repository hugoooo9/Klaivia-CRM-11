-- Ajout des colonnes pour la planification d'envoi
ALTER TABLE "ProspectEmail" ADD COLUMN "scheduledAt" DATETIME;
ALTER TABLE "ProspectEmail" ADD COLUMN "errorMsg" TEXT;
CREATE INDEX "ProspectEmail_scheduledAt_idx" ON "ProspectEmail"("scheduledAt");
