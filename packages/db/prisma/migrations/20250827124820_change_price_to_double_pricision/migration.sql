/*
  Warnings:

  - Changed the type of `price` on the `Ticks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Ticks" DROP COLUMN "price",
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Ticks_time_symbol_price_key" ON "public"."Ticks"("time", "symbol", "price");


SELECT create_hypertable('"Ticks"', 'time', if_not_exists => TRUE);

CREATE MATERIALIZED VIEW candles_1m
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 minute', time) AS bucket,
       symbol,
       first(price, time) AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, time) AS close
FROM "Ticks"
GROUP BY bucket, symbol;


SELECT add_continuous_aggregate_policy('candles_1m',
    start_offset => INTERVAL '1 day',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

-- 5 minute candles
CREATE MATERIALIZED VIEW candles_5m
WITH (timescaledb.continuous) AS
SELECT time_bucket('5 minutes', time) AS bucket,
	       symbol,
       first(price, time) AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, time) AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_5m',
    start_offset => INTERVAL '7 days',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '5 minutes');

