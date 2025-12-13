import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, Plus, Minus, Search, Settings, BarChart3, Clock, DollarSign, Activity, Orbit } from 'lucide-react';
import { instruments } from './utils/constants';
import Header from './components/Header';
import Instruments from './components/Instruments';
import ChartHeader from './components/ChartHeader';
import Orders from './components/Orders';
import Chart from './components/Chart';
import { IChartApi } from 'lightweight-charts';
import { useBalance, useCreateOrder } from './utils/queries';

const App = () => {
  // Initialize selectedSymbol from URL query param or default to BTCUSDT
  const getInitialSymbol = () => {
    const params = new URLSearchParams(window.location.search);
    const symbolFromUrl = params.get('symbol');
    return symbolFromUrl || 'BTCUSDT';
  };

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(getInitialSymbol());
  const [orderType, setOrderType] = useState('buy');
  const [volume, setVolume] = useState('0.01');
  const [wsConnected, setWsConnected] = useState(false);
  const [prices, setPrices] = useState<Record<string, { bid: number; ask: number; time: number }>>({});
  const [timeWindow, setTimeWindow] = useState<("1m" | "5m" | "1h" | "1d")>("1m");
  const [isTakingLeverage, setIsTakingLeverage] = useState(false);
  const [leverage, setLeverage] = useState(5);
  const [margin, setMargin] = useState(100);
  const chartElementRef = useRef(null);
  const ws = useRef<WebSocket | null>(null);

  const { data: balance = {} } = useBalance();
  const createOrderMutation = useCreateOrder();

  // Update URL when selectedSymbol changes
  useEffect(() => {
    if (selectedSymbol) {
      const url = new URL(window.location.href);
      url.searchParams.set('symbol', selectedSymbol);
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedSymbol]);

  useEffect(() => {
    const connectWS = () => {
      try {
        console.log('Connecting to WebSocket...', import.meta.env.VITE_WS_URL);
        ws.current = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:8080');

        ws.current.onopen = () => {
          setWsConnected(true);
          console.log('Connected to WebSocket');
          toast.success('Connected to live price feed', { duration: 2000 });
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
          toast.error('Disconnected from price feed. Reconnecting...', { duration: 2000 });
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

  const submitOrder = async (type?: string) => {
    try {
      // Validation
      if (!selectedSymbol) {
        toast.error('Please select a symbol first');
        return;
      }

      const volumeNum = parseFloat(volume);
      if (isNaN(volumeNum) || volumeNum <= 0) {
        toast.error('Please enter a valid volume');
        return;
      }

      if (isTakingLeverage) {
        if (!margin || margin <= 0) {
          toast.error('Please enter a valid margin');
          return;
        }
        if (!leverage || leverage <= 0) {
          toast.error('Please select a valid leverage');
          return;
        }
      }

      const _confirm = confirm("Do you want to execute order?");
      if (!_confirm) return;

      const tradeType = type || orderType;
      
      await createOrderMutation.mutateAsync({
        type: tradeType,
        symbol: selectedSymbol!,
        qty: volumeNum,
        ...(isTakingLeverage && { margin, leverage })
      });
    } catch (error) {
      // Error is already handled by the mutation's onError
      console.error('Error submitting order:', error);
    }
  };

  const getDisplayPrice = (symbol: string | null, type: 'bid' | 'ask') => {
    if (!symbol) return undefined;
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
          <div className="h-64 overflow-auto">
            <Orders prices={prices} />
          </div>
        </div>


        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Current Symbol Info */}
          <div className="p-4 border-b border-gray-700">
            <div className="text-sm text-gray-400 mb-1">{selectedInstrument?.name}</div>
            <div className="text-2xl font-mono font-bold text-white">
              {selectedInstrument?.symbol}
            </div>
          </div>

          {/* Trading Form */}
          <div className="p-4 border-b border-gray-700 space-y-4">
            <div className="flex rounded overflow-hidden">
              <button
                className="flex-1 py-2.5 text-sm font-medium bg-blue-600 text-white"
              >
                Market
              </button>
              <button
                disabled={true}
                className="flex-1 py-2.5 text-sm font-medium bg-gray-700 text-gray-400 cursor-not-allowed"
              >
                Pending
              </button>
            </div>

            {/* Leverage Toggle */}
            <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded">
              <input 
                type="checkbox" 
                id="leverage-toggle"
                checked={isTakingLeverage}
                onChange={() => setIsTakingLeverage(!isTakingLeverage)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="leverage-toggle" className="text-sm text-gray-300 cursor-pointer">
                Use Leverage
              </label>
            </div>

            {isTakingLeverage && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-400">Margin</label>
                  <input
                    type="number"
                    value={margin}
                    onChange={(e) => setMargin(parseFloat(e.target.value))}
                    className="bg-gray-700 rounded px-3 py-2.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    placeholder="100"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-400">Leverage</label>
                  <select 
                    value={leverage} 
                    onChange={(e) => setLeverage(parseInt(e.target.value))} 
                    className="bg-gray-700 rounded px-1 py-2.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="5">5x</option>
                    <option value="10">10x</option>
                    <option value="20">20x</option>
                    <option value="100">100x</option>
                  </select>
                </div>
              </div>
            )}


            {!isTakingLeverage && (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400">Volume</label>
                <div className="flex items-center bg-gray-700 rounded overflow-hidden">
                  <button
                    onClick={() => setVolume(Math.max(0.01, parseFloat(volume) - 0.01).toFixed(2))}
                    className="p-2.5 hover:bg-gray-600 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="flex-1 bg-transparent text-center py-2.5 focus:outline-none"
                    step="0.01"
                  />
                  <span className="px-3 text-xs text-gray-400">Lots</span>
                  <button
                    onClick={() => setVolume((parseFloat(volume) + 0.01).toFixed(2))}
                    className="p-2.5 hover:bg-gray-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}


            <div className="flex gap-2 w-full mt-3">
              <button
                onClick={() => { 
                  setOrderType('sell'); 
                  submitOrder('sell');
                }}
                className="flex-1 flex flex-col items-center justify-center py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 transition-colors shadow-md cursor-pointer"
              >
                <span className="text-[10px] font-medium text-red-100 uppercase tracking-wide mb-0.5">Sell</span>
                <span className="text-lg font-bold text-white font-mono leading-tight">{currentAsk?.toFixed(3)}</span>
              </button>
              <button
                onClick={() => { 
                  setOrderType('buy'); 
                  submitOrder('buy');
                }}
                className="flex-1 flex flex-col items-center justify-center py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors shadow-md cursor-pointer"
              >
                <span className="text-[10px] font-medium text-blue-100 uppercase tracking-wide mb-0.5">Buy</span>
                <span className="text-lg font-bold text-white font-mono leading-tight">{currentBid?.toFixed(3)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;