-- CreateTable Attachment (base64 TEXT pour compat Prisma SQLite Hostinger)
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "dataBase64" TEXT NOT NULL,
    CONSTRAINT "Attachment_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Attachment_prospectId_idx" ON "Attachment"("prospectId");
