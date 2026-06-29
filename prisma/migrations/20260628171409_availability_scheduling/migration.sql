-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "latestStart" TEXT;

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "femaleLatestStart" TEXT;

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "unavailable" JSONB;
