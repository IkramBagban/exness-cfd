import React, { useEffect, useRef, useState } from 'react'
import { CandlestickData, CandlestickSeries, createChart, IChartApi, ISeriesApi, Time, WhitespaceData } from 'lightweight-charts';
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
    chartElementRef: any,
    window: "1m" | "5m" | "1h" | "1d",
    tick: { price: number, time: number } | null,
    selectedSymbol: string | null
    chartRef: React.RefObject<IChartApi | null>
}

const Chart = ({ chartRef, window = "1m", tick, selectedSymbol, chartElementRef }: Props) => {
    // const [candles, setCandles] = React.useState<any[]>([]);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const lastCandleRef = useRef<any>(null); // keep track of the last candle

    useEffect(() => {
        (async () => {
            try {
                console.log("Setting up chart for ", { selectedSymbol, window })

                const chartOptions = {
                    layout: { textColor: 'black', background: { type: 'solid', color: 'white' } }
                };

                chartRef.current = createChart(chartElementRef.current, chartOptions);
                const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350'
                });
                candlestickSeriesRef.current = candlestickSeries;


                chartRef.current.timeScale().fitContent();

                const { candles: _candles } = await fetchCandles(selectedSymbol, window, 10);
                if (_candles && _candles.length > 0) {
                    candlestickSeries.setData(_candles);
                    lastCandleRef.current = _candles[_candles.length - 1];
                    chartRef.current.timeScale().setVisibleLogicalRange({ from: _candles.length - 50, to: _candles.length }); // new candles ke first 50 candles show honge view pe

                }
                if (chartRef.current)
                    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(range => {
                        if (range!.from < 10) {
                            console.log("Visible range is less than 10");
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

        try {
            const price = tick.price;
            const time = Math.floor(tick.time / 1000); // Lw chart expect seconds

            let lastCandle = lastCandleRef.current;
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
                const newCandle: CandlestickData<Time> | WhitespaceData<Time> = {
                    time: time as Time, // if i am doing `new Date(time).toUTCString()` then after this the live candle is getting stop 
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                };
                candlestickSeriesRef.current.update(newCandle);
                lastCandleRef.current = newCandle;
            } else {
                const updatedCandle = {
                    ...lastCandle,
                    close: price,
                    high: Math.max(lastCandle.high, price),
                    low: Math.min(lastCandle.low, price),
                };
                candlestickSeriesRef.current.update(updatedCandle);
                lastCandleRef.current = updatedCandle;
            }
        } catch (error) {
            console.error("error: ", error)
        }
    }, [tick]);

    return (
        <div className="flex-1 relative">
            <div ref={chartElementRef} className="w-full h-full bg-gray-900 flex items-center justify-center" />
        </div>
    )
}

export default Chart;
