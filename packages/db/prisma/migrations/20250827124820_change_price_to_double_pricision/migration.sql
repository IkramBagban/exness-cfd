/*
  Warnings:

  - Changed the type of `price` on the `Ticks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Ticks" DROP COLUMN "price",
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Ticks_time_symbol_price_key" ON "public"."Ticks"("time", "symbol", "price");

