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
    <div className="min-h-screen bg-[#131722] text-[#EAECEF] font-sans">
      <Header wsConnected={wsConnected} balance={balance} />

      <div className="flex h-[calc(100vh-64px)]">
        <Instruments selectedSymbol={selectedSymbol} prices={prices} setSelectedSymbol={setSelectedSymbol} />

        <div className="flex-1 flex flex-col border-r border-[#2A2E39]">
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
          <div className="h-72 overflow-auto border-t border-[#2A2E39] bg-[#131722]">
            <Orders prices={prices} />
          </div>
        </div>


        <div className="w-80 bg-[#1E222D] border-l border-[#2A2E39] flex flex-col shadow-xl z-10">
          {/* Current Symbol Info */}
          <div className="p-5 border-b border-[#2A2E39]">
            <div className="text-xs font-medium text-[#848E9C] mb-1 uppercase tracking-wider">{selectedInstrument?.name}</div>
            <div className="text-2xl font-mono font-bold text-[#EAECEF] flex items-baseline gap-2">
              {selectedInstrument?.symbol}
              <span className={`text-sm font-normal ${((prices[selectedSymbol!]?.ask || 0) - (prices[selectedSymbol!]?.bid || 0)) >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                 {prices[selectedSymbol!]?.ask?.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Trading Form */}
          <div className="p-5 space-y-6 flex-1 overflow-y-auto">
            <div className="flex bg-[#2A2E39] p-1 rounded-lg">
              <button
                className="flex-1 py-2 text-xs font-bold rounded-md bg-[#474D57] text-white shadow-sm transition-all"
              >
                Market
              </button>
              <button
                disabled={true}
                className="flex-1 py-2 text-xs font-medium text-[#848E9C] hover:text-[#EAECEF] transition-colors cursor-not-allowed"
              >
                Pending
              </button>
            </div>

            {/* Leverage Toggle */}
            <div 
              className="flex items-center justify-between p-3 bg-[#2A2E39]/50 rounded-lg border border-[#2A2E39] hover:border-[#474D57] transition-colors cursor-pointer group"
              onClick={() => setIsTakingLeverage(!isTakingLeverage)}
            >
              <span className="text-sm text-[#EAECEF] font-medium group-hover:text-white transition-colors">
                Use Leverage
              </span>
              <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${isTakingLeverage ? 'bg-[#FCD535]/30' : 'bg-gray-600'}`}>
                <div 
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-200 ease-in-out ${
                    isTakingLeverage 
                      ? 'translate-x-5 bg-[#FCD535]' 
                      : 'translate-x-0 bg-white'
                  }`}
                />
              </div>
            </div>

            {isTakingLeverage && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#848E9C] uppercase">Margin</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={margin}
                      onChange={(e) => setMargin(parseFloat(e.target.value))}
                      className="w-full bg-[#2A2E39] text-[#EAECEF] rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#FCD535] transition-all border border-transparent focus:border-[#FCD535]"
                      step="0.01"
                      placeholder="100"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#848E9C]">USD</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#848E9C] uppercase">Leverage</label>
                  <select 
                    value={leverage} 
                    onChange={(e) => setLeverage(parseInt(e.target.value))} 
                    className="w-full bg-[#2A2E39] text-[#EAECEF] rounded-lg px-2 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#FCD535] cursor-pointer border border-transparent focus:border-[#FCD535]"
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
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <label className="text-[11px] font-medium text-[#848E9C] uppercase">Volume</label>
                  <span className="text-[11px] text-[#848E9C]">Available: <span className="text-[#EAECEF] font-mono">100.00</span></span>
                </div>
                <div className="flex items-center bg-[#2A2E39] rounded-lg overflow-hidden border border-transparent focus-within:border-[#FCD535] transition-colors">
                  <button
                    onClick={() => setVolume(Math.max(0.01, parseFloat(volume) - 0.01).toFixed(2))}
                    className="p-3 hover:bg-[#474D57] transition-colors text-[#848E9C] hover:text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="flex-1 bg-transparent text-center py-2.5 text-[#EAECEF] font-mono font-medium focus:outline-none"
                    step="0.01"
                  />
                  <span className="px-3 text-xs text-[#848E9C] font-medium">Lots</span>
                  <button
                    onClick={() => setVolume((parseFloat(volume) + 0.01).toFixed(2))}
                    className="p-3 hover:bg-[#474D57] transition-colors text-[#848E9C] hover:text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}


                        <div className="flex gap-2 w-full mt-6">
              <button
                onClick={() => { 
                  setOrderType('sell'); 
                  submitOrder('sell');
                }}
                className="flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-[#F6465D] hover:bg-[#D9304E] active:scale-[0.98] transition-all shadow-lg shadow-[#F6465D]/20 group"
              >
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider mb-0.5">Sell</span>
                <span className="text-lg font-bold text-white font-mono leading-tight">{currentAsk?.toFixed(3)}</span>
              </button>
              <button
                onClick={() => { 
                  setOrderType('buy'); 
                  submitOrder('buy');
                }}
                className="flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-[#0ECB81] hover:bg-[#0AB572] active:scale-[0.98] transition-all shadow-lg shadow-[#0ECB81]/20 group"
              >
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider mb-0.5">Buy</span>
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