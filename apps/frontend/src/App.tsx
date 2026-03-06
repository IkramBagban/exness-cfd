import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart3, CandlestickChart, ListOrdered, Wallet } from 'lucide-react';
import { instruments } from './utils/constants';
import Header from './components/Header';
import Instruments from './components/Instruments';
import ChartHeader from './components/ChartHeader';
import Orders from './components/Orders';
import Chart from './components/Chart';
import { IChartApi } from 'lightweight-charts';
import { useBalance, useCreateOrder } from './utils/queries';
import TradingPanel from './components/TradingPanel';

type MobileView = 'chart' | 'markets' | 'trade' | 'orders';

const mobileSections: { id: MobileView; label: string; icon: React.ReactNode }[] = [
  { id: 'chart', label: 'Chart', icon: <CandlestickChart className="w-4 h-4" /> },
  { id: 'markets', label: 'Markets', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'trade', label: 'Trade', icon: <Wallet className="w-4 h-4" /> },
  { id: 'orders', label: 'Orders', icon: <ListOrdered className="w-4 h-4" /> },
];

const App = () => {
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
  const [timeWindow, setTimeWindow] = useState<'1m' | '5m' | '1h' | '1d'>('1m');
  const [isTakingLeverage, setIsTakingLeverage] = useState(false);
  const [leverage, setLeverage] = useState(5);
  const [margin, setMargin] = useState(100);
  const [mobileView, setMobileView] = useState<MobileView>('chart');
  const chartElementRef = useRef(null);
  const ws = useRef<WebSocket | null>(null);

  const { data: balance = {} } = useBalance();
  const createOrderMutation = useCreateOrder();

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
        ws.current = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:8080');

        ws.current.onopen = () => {
          setWsConnected(true);
          toast.success('Connected to live price feed', { duration: 2000 });
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setPrices((prev) => ({
              ...prev,
              [data.symbol]: { bid: data.bid, ask: data.ask, time: data.time },
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

      const confirmed = confirm('Do you want to execute order?');
      if (!confirmed) return;

      const tradeType = type || orderType;

      await createOrderMutation.mutateAsync({
        type: tradeType,
        symbol: selectedSymbol,
        qty: volumeNum,
        ...(isTakingLeverage && { margin, leverage }),
      });
    } catch (error) {
      console.error('Error submitting order:', error);
    }
  };

  const getDisplayPrice = (symbol: string | null, type: 'bid' | 'ask') => {
    if (!symbol) return undefined;
    const instrument = instruments.find((i) => i.symbol === symbol);
    const livePrice = prices[symbol];

    if (livePrice) {
      return type === 'bid' ? livePrice.bid : livePrice.ask;
    }
    return type === 'bid' ? instrument?.bid : instrument?.ask;
  };

  const selectedInstrument = instruments.find((i) => i.symbol === selectedSymbol);
  const currentBid = getDisplayPrice(selectedSymbol, 'bid');
  const currentAsk = getDisplayPrice(selectedSymbol, 'ask');
  const spread = (prices[selectedSymbol || '']?.ask || 0) - (prices[selectedSymbol || '']?.bid || 0);
  const chartRef = useRef<IChartApi | null>(null);

  return (
    <div className="min-h-screen bg-[#131722] text-[#EAECEF] font-sans">
      <Header wsConnected={wsConnected} balance={balance} />

      <div className="lg:hidden sticky top-0 z-20 bg-[#1E222D] border-y border-[#2A2E39] px-2 py-2">
        <div className="grid grid-cols-4 gap-2">
          {mobileSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setMobileView(section.id)}
              className={`flex flex-col items-center justify-center py-2 rounded-md text-[11px] font-semibold transition-colors ${
                mobileView === section.id ? 'bg-[#FCD535] text-[#131722]' : 'bg-[#2A2E39] text-[#848E9C]'
              }`}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-64px)]">
        <div className={`${mobileView === 'markets' ? 'block' : 'hidden'} lg:block lg:w-[340px] lg:min-w-[300px] border-r border-[#2A2E39]`}>
          <Instruments
            selectedSymbol={selectedSymbol}
            prices={prices}
            setSelectedSymbol={(symbol) => {
              setSelectedSymbol(symbol);
              setMobileView('chart');
            }}
          />
        </div>

        <div className={`${mobileView === 'chart' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col border-r border-[#2A2E39] min-h-[420px] lg:min-h-0`}>
          <ChartHeader
            selectedInstrument={selectedInstrument}
            currentAsk={currentAsk}
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
          />

          <div className="h-[52vh] sm:h-[58vh] lg:h-auto lg:flex-1">
            <Chart
              chartElementRef={chartElementRef}
              window={timeWindow}
              chartRef={chartRef}
              tick={{ price: prices[selectedSymbol || '']?.ask, time: new Date(prices[selectedSymbol || '']?.time).getTime() }}
              selectedSymbol={selectedSymbol}
            />
          </div>

          <div className="hidden lg:block h-72 overflow-auto border-t border-[#2A2E39] bg-[#131722]">
            <Orders prices={prices} />
          </div>
        </div>

        <TradingPanel
          selectedInstrument={selectedInstrument}
          currentBid={currentBid}
          currentAsk={currentAsk}
          spread={spread}
          isTakingLeverage={isTakingLeverage}
          setIsTakingLeverage={setIsTakingLeverage}
          margin={margin}
          setMargin={setMargin}
          leverage={leverage}
          setLeverage={setLeverage}
          volume={volume}
          setVolume={setVolume}
          onSell={() => {
            setOrderType('sell');
            submitOrder('sell');
          }}
          onBuy={() => {
            setOrderType('buy');
            submitOrder('buy');
          }}
          className={`${mobileView === 'trade' ? 'flex' : 'hidden'} lg:flex lg:w-80 lg:border-l`}
        />

        <div className={`${mobileView === 'orders' ? 'block' : 'hidden'} lg:hidden border-t border-[#2A2E39] bg-[#131722] min-h-[300px]`}>
          <Orders prices={prices} />
        </div>
      </div>
    </div>
  );
};

export default App;
