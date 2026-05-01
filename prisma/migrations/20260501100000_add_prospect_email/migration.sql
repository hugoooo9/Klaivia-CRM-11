-- CreateTable ProspectEmail
CREATE TABLE "ProspectEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProspectEmail_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProspectEmail_prospectId_idx" ON "ProspectEmail"("prospectId");
CREATE INDEX "ProspectEmail_status_idx" ON "ProspectEmail"("status");
