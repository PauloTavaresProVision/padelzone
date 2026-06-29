-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "expressEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referenceEnabled" BOOLEAN NOT NULL DEFAULT false;
