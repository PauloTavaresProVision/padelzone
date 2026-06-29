-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "services" TEXT,
ADD COLUMN     "whatsapp" TEXT;
