-- command prompt: docker exec -i 39e37141a1de psql -U postgres -d postgres < prisma/timescale.sql
-- powershell: Get-Content prisma/timescale.sql | docker exec -i 39e37141a1de psql -U postgres -d postgres
CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable('"Ticks"', 'time', if_not_exists => TRUE);

-- 1 Minute
CREATE MATERIALIZED VIEW candles_1m
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 minute', "time") AS bucket,
       symbol,
       first(price, "time") AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, "time") AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_1m',
    start_offset => INTERVAL '7 days',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

-- 5 Minute
CREATE MATERIALIZED VIEW candles_5m
WITH (timescaledb.continuous) AS
SELECT time_bucket('5 minutes', "time") AS bucket,
       symbol,
       first(price, "time") AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, "time") AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_5m',
    start_offset => INTERVAL '14 days',
    end_offset   => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes');

-- 10 Minute
CREATE MATERIALIZED VIEW candles_10m
WITH (timescaledb.continuous) AS
SELECT time_bucket('10 minutes', "time") AS bucket,
       symbol,
       first(price, "time") AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, "time") AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_10m',
    start_offset => INTERVAL '30 days',
    end_offset   => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes');

-- 30 Minute
CREATE MATERIALIZED VIEW candles_30m
WITH (timescaledb.continuous) AS
SELECT time_bucket('30 minutes', "time") AS bucket,
       symbol,
       first(price, "time") AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, "time") AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_30m',
    start_offset => INTERVAL '60 days',
    end_offset   => INTERVAL '30 minutes',
    schedule_interval => INTERVAL '30 minutes');

-- 1 Hour
CREATE MATERIALIZED VIEW candles_1h
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', "time") AS bucket,
       symbol,
       first(price, "time") AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, "time") AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_1h',
    start_offset => INTERVAL '90 days',
    end_offset   => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- 4 Hour
CREATE MATERIALIZED VIEW candles_4h
WITH (timescaledb.continuous) AS
SELECT time_bucket('4 hours', "time") AS bucket,
       symbol,
       first(price, "time") AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, "time") AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_4h',
    start_offset => INTERVAL '180 days',
    end_offset   => INTERVAL '4 hours',
    schedule_interval => INTERVAL '4 hours');

-- 1 Day
CREATE MATERIALIZED VIEW candles_1d
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 day', "time") AS bucket,
       symbol,
       first(price, "time") AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, "time") AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_1d',
    start_offset => INTERVAL '365 days',
    end_offset   => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- 15 Day
CREATE MATERIALIZED VIEW candles_15d
WITH (timescaledb.continuous) AS
SELECT time_bucket('15 days', "time") AS bucket,
       symbol,
       first(price, "time") AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, "time") AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_15d',
    start_offset => INTERVAL '2 years',
    end_offset   => INTERVAL '15 days',
    schedule_interval => INTERVAL '15 days');

-- 30 Day
CREATE MATERIALIZED VIEW candles_30d
WITH (timescaledb.continuous) AS
SELECT time_bucket('30 days', "time") AS bucket,
       symbol,
       first(price, "time") AS open,
       max(price) AS high,
       min(price) AS low,
       last(price, "time") AS close
FROM "Ticks"
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('candles_30d',
    start_offset => INTERVAL '5 years',
    end_offset   => INTERVAL '30 days',
    schedule_interval => INTERVAL '30 days');
