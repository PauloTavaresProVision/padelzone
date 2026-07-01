-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "iban" TEXT,
ADD COLUMN     "ibanName" TEXT,
ADD COLUMN     "transferEnabled" BOOLEAN NOT NULL DEFAULT false;
