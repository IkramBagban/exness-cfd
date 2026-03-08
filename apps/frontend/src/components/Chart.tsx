import React, { useEffect, useRef, useState } from 'react';
import { CandlestickData, CandlestickSeries, ColorType, createChart, IChartApi, ISeriesApi, Time, WhitespaceData } from 'lightweight-charts';
import axios from 'axios';

const fetchCandles = async (symbol, interval, limit, startTime: string | number | null = null) => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    let url = `${API_URL}/api/v1/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    if (startTime) {
      url += `&startTime=${startTime}`;
    }
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching candles:', error);
    return { candles: [] };
  }
};

interface Props {
  chartElementRef: React.RefObject<HTMLDivElement | null>;
  window: '1m' | '5m' | '1h' | '1d';
  tick: { price: number; time: number } | null;
  selectedSymbol: string | null;
  chartRef: React.RefObject<IChartApi | null>;
}

const Chart = ({ chartRef, window = '1m', tick, selectedSymbol, chartElementRef }: Props) => {
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lastCandleRef = useRef<any>(null);
  const isFetchingRef = useRef(false);
  const [hasData, setHasData] = useState(false);
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);

  const getChartSize = () => {
    const width = Math.max(chartElementRef.current?.clientWidth ?? 0, 320);
    const height = Math.max(chartElementRef.current?.clientHeight ?? 0, 300);
    return { width, height };
  };

  const normalizeCandles = (candles: any[] = []) => {
    return candles.map((candle) => ({
      time: Number(candle.time) as Time,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    }));
  };

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    setHasData(false);
    setLastTickAt(null);
    lastCandleRef.current = null;

    (async () => {
      try {
        if (!chartElementRef.current || !selectedSymbol) return;

        const chartOptions = {
          layout: {
            textColor: '#848E9C',
            background: {
              type: ColorType.Solid as const,
              color: '#131722',
            },
          },
          grid: {
            vertLines: { color: '#2A2E39' },
            horzLines: { color: '#2A2E39' },
          },
          timeScale: {
            borderColor: '#2A2E39',
          },
          rightPriceScale: {
            borderColor: '#2A2E39',
          },
        };

        const { width, height } = getChartSize();
        chartRef.current = createChart(chartElementRef.current, {
          ...chartOptions,
          width,
          height,
        });
        const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
          upColor: '#0ECB81',
          downColor: '#F6465D',
          borderVisible: false,
          wickUpColor: '#0ECB81',
          wickDownColor: '#F6465D',
        });
        candlestickSeriesRef.current = candlestickSeries;

        chartRef.current.timeScale().fitContent();

        const response = await fetchCandles(selectedSymbol, window, 100);
        const initialCandles = normalizeCandles(response?.candles);

        if (initialCandles && initialCandles.length > 0) {
          candlestickSeries.setData(initialCandles);
          lastCandleRef.current = initialCandles[initialCandles.length - 1];
          setHasData(true);
          chartRef.current.timeScale().setVisibleLogicalRange({ from: Math.max(0, initialCandles.length - 10), to: initialCandles.length });
        }

        chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(async (range) => {
          if (range && range.from < 5 && !isFetchingRef.current) {
            const currentCandles = candlestickSeries.data();
            if (currentCandles.length > 0) {
              isFetchingRef.current = true;
              const earliest = currentCandles[0]?.time;
              const earliestTime = typeof earliest === 'number' ? earliest : typeof earliest === 'string' ? parseInt(earliest, 10) : null;

              const historicalResponse = await fetchCandles(selectedSymbol, window, 50, earliestTime);
              const moreCandles = normalizeCandles(historicalResponse?.candles);

              if (moreCandles && moreCandles.length > 0) {
                const newCandles = [...moreCandles, ...currentCandles];
                candlestickSeries.setData(newCandles);
                setHasData(true);
              }
              isFetchingRef.current = false;
            }
          }
        });

        const handleResize = () => {
          if (!chartElementRef.current || !chartRef.current) return;
          const { width, height } = getChartSize();
          chartRef.current.applyOptions({
            width,
            height,
          });
        };

        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartElementRef.current);
        handleResize();
      } catch (error) {
        console.error('Error in chart setup', error);
      }
    })();

    return () => {
      resizeObserver?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [selectedSymbol, window, chartRef, chartElementRef]);

  useEffect(() => {
    if (!tick || !candlestickSeriesRef.current || !tick.price || !tick.time) return;

    try {
      setLastTickAt(Date.now());
      const price = tick.price;
      const time = Math.floor(tick.time / 1000);
      const lastCandle = lastCandleRef.current;

      if (!lastCandle) {
        // Seed the chart from the first live tick when historical fetch is empty.
        const firstCandle: CandlestickData<Time> = {
          time: time as Time,
          open: price,
          high: price,
          low: price,
          close: price,
        };
        candlestickSeriesRef.current.update(firstCandle);
        lastCandleRef.current = firstCandle;
        setHasData(true);
        return;
      }

      let shouldAddNewCandle = false;
      switch (window) {
        case '1m':
          shouldAddNewCandle = time - (lastCandle?.time || 0) >= 60;
          break;
        case '5m':
          shouldAddNewCandle = time - (lastCandle?.time || 0) >= 300;
          break;
        case '1h':
          shouldAddNewCandle = time - (lastCandle?.time || 0) >= 3600;
          break;
        case '1d':
          shouldAddNewCandle = time - (lastCandle?.time || 0) >= 86400;
          break;
      }

      if (time > lastCandle.time && shouldAddNewCandle) {
        const newCandle: CandlestickData<Time> | WhitespaceData<Time> = {
          time: time as Time,
          open: price,
          high: price,
          low: price,
          close: price,
        };
        candlestickSeriesRef.current.update(newCandle);
        lastCandleRef.current = newCandle;
        setHasData(true);
      } else if (time >= lastCandle.time) {
        const updatedCandle = {
          ...lastCandle,
          close: price,
          high: Math.max(lastCandle.high, price),
          low: Math.min(lastCandle.low, price),
        };
        candlestickSeriesRef.current.update(updatedCandle);
        lastCandleRef.current = updatedCandle;
        setHasData(true);
      }
    } catch (error) {
      console.error('error in tick processing: ', error);
    }
  }, [tick, window]);

  return (
    <div className="flex-1 relative">
      <div ref={chartElementRef} className="w-full h-full bg-gray-900 flex items-center justify-center" />
      {!hasData && (
        <div className="absolute left-3 top-3 rounded bg-black/45 px-2 py-1 text-[11px] text-gray-300">
          {lastTickAt ? 'Waiting for chart update...' : 'Waiting for candles/ticks...'}
        </div>
      )}
    </div>
  );
};

export default Chart;
