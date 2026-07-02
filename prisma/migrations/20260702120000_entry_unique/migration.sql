-- Inscricao unica por categoria (M1): impede duplicados na mesma categoria.
-- O Postgres trata NULL como distinto, por isso duplas (playerId nulo) e individuais
-- (teamId nulo) nao colidem entre si. IF NOT EXISTS torna a migracao segura em ambientes
-- onde o indice ja tenha sido aplicado antes por `db push`.

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Entry_categoryId_playerId_key" ON "Entry"("categoryId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Entry_categoryId_teamId_key" ON "Entry"("categoryId", "teamId");
