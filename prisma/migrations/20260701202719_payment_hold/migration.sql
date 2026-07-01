-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "paymentHoldCancel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentHoldHours" INTEGER;
