-- CreateEnum
CREATE TYPE "ClubStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "accessEnd" TIMESTAMP(3),
ADD COLUMN     "accessStart" TIMESTAMP(3),
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ClubStatus" NOT NULL DEFAULT 'PENDING';
