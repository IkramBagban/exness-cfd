import React, { useEffect } from 'react'

import { CandlestickSeries, createChart } from 'lightweight-charts';
import axios from 'axios'

const fetchCandles = async (symbol, interval, limit) => {
    const response = await axios.get(`http://localhost:3000/api/v1/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    return response.data;
}

const Chart = ({ chartRef }) => {

    useEffect(() => {
        (async () => {

            const chartOptions = { layout: { textColor: 'black', background: { type: 'solid', color: 'white' } } };

            const chart = createChart(chartRef.current);
            const candlestickSeries = chart.addSeries(CandlestickSeries, { upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' });

            const data = [{ open: 10, high: 10.63, low: 9.49, close: 9.55, time:1756325100000 }];

            chart.timeScale().fitContent();
            const {candles} = await fetchCandles('BTCUSDT', '1m', 100);
            console.log(candles);
            candlestickSeries.setData(candles   );

        })()

    }, [])
    return (
        // <div className="flex-1 relative">
        <div className="flex-1 relative">
            <div ref={chartRef} className="w-full h-full bg-gray-900 flex items-center justify-center">
                {/* <div className="text-gray-500">Chart will be rendered here</div> */}
            </div>
        </div>)
}

export default Chart