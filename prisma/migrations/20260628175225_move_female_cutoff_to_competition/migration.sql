/*
  Warnings:

  - You are about to drop the column `femaleLatestStart` on the `Club` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Club" DROP COLUMN "femaleLatestStart";

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "femaleLatestStart" TEXT;
