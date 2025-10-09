import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, Minus, Search, Settings, BarChart3, Clock, DollarSign, Activity, Orbit } from 'lucide-react';
import { instruments } from './utils/constants';
// import Instruments from './components/Instruments';

import Header from './components/Header';
import Instruments from './components/Instruments';
import ChartHeader from './components/ChartHeader';
import Orders from './components/Orders';
import Chart from './components/Chart';
import { IChartApi } from 'lightweight-charts';

const App = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [orderType, setOrderType] = useState('buy');
  const [volume, setVolume] = useState('0.01');
  const [wsConnected, setWsConnected] = useState(false);
  const [prices, setPrices] = useState<Record<string, { bid: number; ask: number; time: number }>>({});
  const [balance, setBalance] = useState({});
  const [timeWindow, setTimeWindow] = useState<("1m" | "5m" | "1h" | "1d")>("1m");
  const [isTakingLeverage, setIsTakingLeverage] = useState(false);
  const [leverage, setLeverage] = useState(5);
  const [margin, setMargin] = useState(100);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const chartElementRef = useRef(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connectWS = () => {
      try {
        ws.current = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:8080');

        ws.current.onopen = () => {
          setWsConnected(true);
          console.log('Connected to WebSocket');
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setPrices(prev => ({
              ...prev,
              [data.symbol]: { bid: data.bid, ask: data.ask, time: data.time }
            }));
          } catch (error) {
            console.error('Error parsing WebSocket data:', error);
          }
        };

        ws.current.onclose = () => {
          setWsConnected(false);
          setTimeout(connectWS, 3000);
        };

        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setTimeout(connectWS, 3000);
      }
    };

    connectWS();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    loadBalance();
    // loadOrders();
    // const interval = setInterval(() => {
      // loadBalance();
      // loadOrders();
    // }, 5000);

    // return () => clearInterval(interval);
  }, []);

  const loadBalance = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/balance`);
      // console.log("balancer response", response)
      const data = await response.json();
      setBalance(data);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const submitOrder = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/trade/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: orderType,
          symbol: selectedSymbol,
          qty: parseFloat(volume)
        })
      });

      if (response.ok) {
        loadBalance();
        // Trigger refresh of orders
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
    }
  };

  // Function to trigger orders refresh from child component
  const handleOrderUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
    loadBalance(); // Also refresh balance when orders change
  };

  const getDisplayPrice = (symbol, type) => {
    const instrument = instruments.find(i => i.symbol === symbol);
    const livePrice = prices[symbol];

    if (livePrice) {
      return type === 'bid' ? livePrice.bid : livePrice.ask;
    }
    return type === 'bid' ? instrument?.bid : instrument?.ask;
  };

  const selectedInstrument = instruments.find(i => i.symbol === selectedSymbol);
  const currentBid = getDisplayPrice(selectedSymbol, 'bid');
  const currentAsk = getDisplayPrice(selectedSymbol, 'ask');
  // console.log({ selectedSymbol, selectedInstrument })
  const chartRef = useRef<IChartApi | null>(null);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header wsConnected={wsConnected} balance={balance} />

      <div className="flex h-screen">
        <Instruments selectedSymbol={selectedSymbol} prices={prices} setSelectedSymbol={setSelectedSymbol} />

        <div className="flex-1 flex flex-col">
          <ChartHeader
            selectedInstrument={selectedInstrument}
            currentAsk={currentAsk}
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
          />

          <Chart
            chartElementRef={chartElementRef}
            window={timeWindow} chartRef={chartRef}
            tick={{ price: prices[selectedSymbol!]?.ask, time: new Date(prices[selectedSymbol!]?.time)?.getTime() }}
            selectedSymbol={selectedSymbol} />
          <Orders prices={prices} onOrderUpdate={handleOrderUpdate} refreshTrigger={refreshTrigger} />
        </div>


        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* current pric */}
          <div className="p-4 border-b border-gray-700">
            <div className="text-sm text-gray-400 mb-2">{selectedInstrument?.name}</div>
            {/* <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
                <div className="text-xs text-red-400 mb-1">Sell</div>
                <div className="text-lg font-mono font-bold text-red-400">
                  {currentAsk?.toFixed(4)}

                </div>
                <div className="text-xs text-gray-400">36%</div>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                <div className="text-xs text-blue-400 mb-1">Buy</div>
                <div className="text-lg font-mono font-bold text-blue-400">
                  {currentBid?.toFixed(4)}
                </div>
                <div className="text-xs text-gray-400">64%</div>
              </div>
            </div> */}
          </div>

          <div className="p-4 border-b border-gray-700">
            <div className="flex mb-4">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-l  bg-blue-600 text-white`}
              >
                Market
              </button>
              <button
                disabled={true}
                className={`flex-1 py-2 text-sm font-medium rounded-r bg-gray-700 text-gray-300 cursor-not-allowed`}
              >
                Pending
              </button>
            </div>

            <div className=''>
              <div className='flex gap-3 items-center'>
                <span className="text-xs text-gray-400">Leverage</span>
                <input type="checkbox" onClick={() => setIsTakingLeverage(!isTakingLeverage)} />
              </div>

              {
                isTakingLeverage && <div className='flex gap-2'>
                  <div className=" flex flex-col">

                    <span>Margin</span>
                    <input
                      type='number'
                      value={margin}
                      onChange={(e) => setMargin(parseFloat(e.target?.value))}
                      className="bg-gray-700 rounded flex-1 text-center py-2 focus:outline-none"
                      step="0.01"
                    />
                  </div>
                  <div className="">
                    <span>Leverage</span>
                    <select value={leverage} onChange={(e) => setLeverage(parseInt(e.target.value))} className="bg-gray-700 rounded flex-1 text-center py-2 focus:outline-none w-full">
                      <option value="5">5x</option>
                      <option value="10">10x</option>
                      <option value="20">20x</option>
                      <option value="100">100x</option>
                    </select>

                  </div>
                </div>
              }

            </div>

            <div className="space-y-4">
              {
                !isTakingLeverage && <div>
                  <label className="text-xs text-gray-400 mb-2 block">Volume</label>
                  <div className="flex items-center bg-gray-700 rounded">
                    <button
                      onClick={() => setVolume(Math.max(0.01, parseFloat(volume) - 0.01).toFixed(2))} // to prevent volume to go below 0.01
                      className="p-2 hover:bg-gray-600 rounded-l"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      className="flex-1 bg-transparent text-center py-2 focus:outline-none"
                      step="0.01"
                    />
                    <span className="px-2 text-xs text-gray-400">Lots</span>
                    <button
                      onClick={() => setVolume((parseFloat(volume) + 0.01).toFixed(2))}
                      className="p-2 hover:bg-gray-600 rounded-r"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              }

              {/* 
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Take Profit</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Not set"
                    className="flex-1 bg-gray-700 px-3 py-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select className="bg-gray-700 px-2 py-2 rounded text-sm focus:outline-none">
                    <option>Price</option>
                  </select>
                  <button className="p-2 text-blue-400 hover:bg-gray-700 rounded">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-2 block">Stop Loss</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Not set"
                    className="flex-1 bg-gray-700 px-3 py-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select className="bg-gray-700 px-2 py-2 rounded text-sm focus:outline-none">
                    <option>Price</option>
                  </select>
                  <button className="p-2 text-blue-400 hover:bg-gray-700 rounded">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div> */}

              <div className="grid grid-cols-2 gap-2 mt-6">
                <button
                  onClick={() => { setOrderType('sell'); submitOrder(); }}
                  className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded font-medium transition-colors"
                >
                  Sell {currentAsk?.toFixed(3)}
                </button>
                <button
                  onClick={() => { setOrderType('buy'); submitOrder(); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded font-medium transition-colors"
                >
                  Buy {currentBid?.toFixed(3)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;