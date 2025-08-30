import React, { useEffect, useRef, useState } from 'react'
import { CandlestickSeries, createChart, ISeriesApi } from 'lightweight-charts';
import axios from 'axios'

const fetchCandles = async (symbol, interval, limit) => {
    try {
        const response = await axios.get(`http://localhost:3000/api/v1/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching candles:", error);
    }
}

interface Props {
    chartRef: any,
    window: "1m" | "5m" | "1h" | "1d",
    tick: { price: number, time: number } | null,
    selectedSymbol: string | null
}

const Chart = ({ chartRef, window = "1m", tick, selectedSymbol }: Props) => {
    const [candles, setCandles] = React.useState<any[]>([]);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const lastCandleRef = useRef<any>(null); // keep track of the last candle

    useEffect(() => {
        let chart;
        (async () => {
            try {
                console.log("Setting up chart for ", { selectedSymbol, window })

                const chartOptions = {
                    layout: { textColor: 'black', background: { type: 'solid', color: 'white' } }
                };

                chart = createChart(chartRef.current, chartOptions);
                const candlestickSeries = chart.addSeries(CandlestickSeries, {
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350'
                });
                candlestickSeriesRef.current = candlestickSeries;

                chart.timeScale().fitContent();

                const { candles: _candles } = await fetchCandles(selectedSymbol, window, 500);
                if (_candles && _candles.length > 0) {
                    candlestickSeries.setData(_candles);
                    lastCandleRef.current = _candles[_candles.length - 1];
                }
            } catch (error) {
                console.error("Error in chart setup", error);
            }
        })()

        return () => {
            chart?.remove();
        };
    }, [selectedSymbol, window])

    useEffect(() => {
        if (!tick || !candlestickSeriesRef.current) return;

        try {
            const price = tick.price;
            const time = Math.floor(tick.time / 1000); // lw chart expect seconds

            let lastCandle = lastCandleRef.current;
            console.log("Window", window)
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
            }

            if (!lastCandle || time > lastCandle.time && shouldAddNewCandle) {
                // start a new candle
                const newCandle = {
                    time,
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                };
                candlestickSeriesRef.current.update(newCandle);
                lastCandleRef.current = newCandle;
            } else {
                // update current candle
                const updatedCandle = {
                    ...lastCandle,
                    close: price,
                    high: Math.max(lastCandle.high, price),
                    low: Math.min(lastCandle.low, price),
                };
                // console.log("Updated candle:", updatedCandle);
                candlestickSeriesRef.current.update(updatedCandle);
                lastCandleRef.current = updatedCandle;
            }
        } catch (error) {
            console.error("error: ", error)
        }
    }, [tick]);

    return (
        <div className="flex-1 relative">
            <div ref={chartRef} className="w-full h-full bg-gray-900 flex items-center justify-center" />
        </div>
    )
}

export default Chart;
