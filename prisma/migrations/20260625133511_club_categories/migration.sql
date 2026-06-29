-- CreateTable
CREATE TABLE "ClubCategory" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "unit" "EntryUnit" NOT NULL DEFAULT 'PAIR',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubCategory_clubId_code_key" ON "ClubCategory"("clubId", "code");

-- AddForeignKey
ALTER TABLE "ClubCategory" ADD CONSTRAINT "ClubCategory_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
