import React, { useEffect, useRef, useState } from 'react'
import { CandlestickData, CandlestickSeries, createChart, IChartApi, ISeriesApi, Time, WhitespaceData, ColorType } from 'lightweight-charts';
import axios from 'axios'

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
        console.error("Error fetching candles:", error);
        return { candles: [] };
    }
}

interface Props {
    chartElementRef: any,
    window: "1m" | "5m" | "1h" | "1d",
    tick: { price: number, time: number } | null,
    selectedSymbol: string | null
    chartRef: React.RefObject<IChartApi | null>
}

const Chart = ({ chartRef, window = "1m", tick, selectedSymbol, chartElementRef }: Props) => {
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const lastCandleRef = useRef<any>(null); // keep track of the last candle
    const [candles, setCandles] = useState<any[]>([]); // store loaded candles
    const isFetchingRef = useRef(false);

    useEffect(() => {
        (async () => {
            try {
                console.log("Setting up chart for ", { selectedSymbol, window })

                const chartOptions = {
                    layout: { 
                        textColor: '#848E9C', 
                        background: { 
                            type: ColorType.Solid as const, 
                            color: '#131722' 
                        } 
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

                chartRef.current = createChart(chartElementRef.current, chartOptions);
                const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
                    upColor: '#0ECB81',
                    downColor: '#F6465D',
                    borderVisible: false,
                    wickUpColor: '#0ECB81',
                    wickDownColor: '#F6465D'
                });
                candlestickSeriesRef.current = candlestickSeries;

                chartRef.current.timeScale().fitContent();

                const response = await fetchCandles(selectedSymbol, window,10);
                console.log("Fetch response:", response);
                const _candles = response?.candles;
                console.log("Initial candles loaded:", _candles?.length, _candles);
                
                if (_candles && _candles.length > 0) {
                    candlestickSeries.setData(_candles);
                    setCandles(_candles);
                    lastCandleRef.current = _candles[_candles.length - 1];
                    chartRef.current.timeScale().setVisibleLogicalRange({ from: Math.max(0, _candles.length - 10), to: _candles.length });
                } else {
                    console.log("No candles data received or empty array");
                }

                // Historical fetch on scroll
                chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(async range => {
                    console.log("Visible range changed:", range);
                    if (range && range.from < 5 && !isFetchingRef.current) {
                        const currentCandles = candlestickSeries.data();
                        if (currentCandles.length > 0) {
                            isFetchingRef.current = true;
                            const earliest = currentCandles[0]?.time;
                            const earliestTime = typeof earliest === 'number' ? earliest : (typeof earliest === 'string' ? parseInt(earliest) : null);
                            console.log("🔄 Fetching historical candles before:", earliestTime, new Date(earliestTime * 1000));
                            
                            const response = await fetchCandles(selectedSymbol, window, 50, earliestTime);
                            const moreCandles = response?.candles;
                            if (moreCandles && moreCandles.length > 0) {
                                console.log("✅ Historical candles loaded:", moreCandles.length, "candles");
                                // prepend and update chart
                                const newCandles = [...moreCandles, ...currentCandles];
                                setCandles(newCandles);
                                candlestickSeries.setData(newCandles);
                                console.log("📊 Updated chart with total candles:", newCandles.length);
                            } else {
                                console.log("❌ No historical candles received");
                            }
                            isFetchingRef.current = false;
                        }
                    }
                });
            } catch (error) {
                console.error("Error in chart setup", error);
            }
        })()

        return () => {
            chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(() => { });
            chartRef.current?.remove();
        };
    }, [selectedSymbol, window])

    useEffect(() => {
        if (!tick || !candlestickSeriesRef.current) return;

        console.log("Processing tick:", tick, "Last candle:", lastCandleRef.current);

        try {
            const price = tick.price;
            const time = Math.floor(tick.time / 1000); // Lw chart expect seconds

            let lastCandle = lastCandleRef.current;
            
            // Don't process ticks if we don't have historical data loaded yet
            if (!lastCandle) {
                console.log("No last candle found, skipping tick update");
                return;
            }
            
            let shouldAddNewCandle = false;
            switch (window) {
                case "1m":
                    shouldAddNewCandle = time - (lastCandle?.time || 0) >= 60;
                    break;
                case "5m":
                    shouldAddNewCandle = time - (lastCandle?.time || 0) >= 300;
                    break;
                case "1h":
                    shouldAddNewCandle = time - (lastCandle?.time || 0) >= 3600;
                    break;
                case "1d":
                    shouldAddNewCandle = time - (lastCandle?.time || 0) >= 86400;
                    break;
            }

            console.log("Should add new candle:", shouldAddNewCandle, "Time diff:", time - (lastCandle?.time || 0));

            if (time > lastCandle.time && shouldAddNewCandle) {
                const newCandle: CandlestickData<Time> | WhitespaceData<Time> = {
                    time: time as Time,
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                };
                console.log("Adding new candle:", newCandle);
                candlestickSeriesRef.current.update(newCandle);
                lastCandleRef.current = newCandle;
            } else if (time >= lastCandle.time) {
                const updatedCandle = {
                    ...lastCandle,
                    close: price,
                    high: Math.max(lastCandle.high, price),
                    low: Math.min(lastCandle.low, price),
                };
                console.log("Updating existing candle:", updatedCandle);
                candlestickSeriesRef.current.update(updatedCandle);
                lastCandleRef.current = updatedCandle;
            } else {
                console.log("Tick time is older than last candle, ignoring");
            }
        } catch (error) {
            console.error("error in tick processing: ", error)
        }
    }, [tick, window]);

    return (
        <div className="flex-1 relative">
            <div ref={chartElementRef} className="w-full h-full bg-gray-900 flex items-center justify-center" />
        </div>
    )
}

export default Chart;
