\dx;

CREATE EXTENSION IF NOT EXISTS timescaledb;

**Create*
SELECT create_hypertable('"Ticks"', 'time', if_not_exists => TRUE);

*Check*
SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'Ticks';


**Continuous aggregate (candles)**  
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

3. Auto-refresh policy
SELECT add_continuous_aggregate_policy('candles_1m',
    start_offset => INTERVAL '1 day',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');
