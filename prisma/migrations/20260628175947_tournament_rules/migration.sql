-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "rules" TEXT;

-- CreateTable
CREATE TABLE "CompetitionAttachment" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionAttachment_competitionId_idx" ON "CompetitionAttachment"("competitionId");

-- AddForeignKey
ALTER TABLE "CompetitionAttachment" ADD CONSTRAINT "CompetitionAttachment_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
