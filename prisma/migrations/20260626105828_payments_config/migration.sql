-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "paymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proxypayApiKey" TEXT,
ADD COLUMN     "proxypayEntityId" TEXT,
ADD COLUMN     "proxypaySandbox" BOOLEAN NOT NULL DEFAULT true;
