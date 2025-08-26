-- CreateTable
CREATE TABLE "public"."Ticks" (
    "time" TIMESTAMP(3) NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticks_time_symbol_price_key" ON "public"."Ticks"("time", "symbol", "price");
