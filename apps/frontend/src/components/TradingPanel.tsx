import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface TradingPanelProps {
  selectedInstrument?: { name: string; symbol: string };
  currentBid?: number;
  currentAsk?: number;
  spread?: number;
  isTakingLeverage: boolean;
  setIsTakingLeverage: React.Dispatch<React.SetStateAction<boolean>>;
  margin: number;
  setMargin: React.Dispatch<React.SetStateAction<number>>;
  leverage: number;
  setLeverage: React.Dispatch<React.SetStateAction<number>>;
  volume: string;
  setVolume: React.Dispatch<React.SetStateAction<string>>;
  onSell: () => void;
  onBuy: () => void;
  className?: string;
}

const TradingPanel = ({
  selectedInstrument,
  currentBid,
  currentAsk,
  spread,
  isTakingLeverage,
  setIsTakingLeverage,
  margin,
  setMargin,
  leverage,
  setLeverage,
  volume,
  setVolume,
  onSell,
  onBuy,
  className = '',
}: TradingPanelProps) => {
  return (
    <div className={`bg-[#1E222D] border-[#2A2E39] flex flex-col shadow-xl z-10 ${className}`}>
      <div className="p-5 border-b border-[#2A2E39]">
        <div className="text-xs font-medium text-[#848E9C] mb-1 uppercase tracking-wider">{selectedInstrument?.name}</div>
        <div className="text-2xl font-mono font-bold text-[#EAECEF] flex items-baseline gap-2">
          {selectedInstrument?.symbol}
          <span className={`text-sm font-normal ${(spread || 0) >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {currentAsk?.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        <div className="flex bg-[#2A2E39] p-1 rounded-lg">
          <button className="flex-1 py-2 text-xs font-bold rounded-md bg-[#474D57] text-white shadow-sm transition-all">Market</button>
          <button
            disabled
            className="flex-1 py-2 text-xs font-medium text-[#848E9C] hover:text-[#EAECEF] transition-colors cursor-not-allowed"
          >
            Pending
          </button>
        </div>

        <div
          className="flex items-center justify-between p-3 bg-[#2A2E39]/50 rounded-lg border border-[#2A2E39] hover:border-[#474D57] transition-colors cursor-pointer group"
          onClick={() => setIsTakingLeverage(!isTakingLeverage)}
        >
          <span className="text-sm text-[#EAECEF] font-medium group-hover:text-white transition-colors">Use Leverage</span>
          <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${isTakingLeverage ? 'bg-[#FCD535]/30' : 'bg-gray-600'}`}>
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-200 ease-in-out ${
                isTakingLeverage ? 'translate-x-5 bg-[#FCD535]' : 'translate-x-0 bg-white'
              }`}
            />
          </div>
        </div>

        {isTakingLeverage ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
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
                onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                className="w-full bg-[#2A2E39] text-[#EAECEF] rounded-lg px-2 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#FCD535] cursor-pointer border border-transparent focus:border-[#FCD535]"
              >
                <option value="5">5x</option>
                <option value="10">10x</option>
                <option value="20">20x</option>
                <option value="100">100x</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <label className="text-[11px] font-medium text-[#848E9C] uppercase">Volume</label>
              <span className="text-[11px] text-[#848E9C]">
                Available: <span className="text-[#EAECEF] font-mono">100.00</span>
              </span>
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
            onClick={onSell}
            className="flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-[#F6465D] hover:bg-[#D9304E] active:scale-[0.98] transition-all shadow-lg shadow-[#F6465D]/20 group"
          >
            <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider mb-0.5">Sell</span>
            <span className="text-lg font-bold text-white font-mono leading-tight">{currentAsk?.toFixed(3)}</span>
          </button>
          <button
            onClick={onBuy}
            className="flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-[#0ECB81] hover:bg-[#0AB572] active:scale-[0.98] transition-all shadow-lg shadow-[#0ECB81]/20 group"
          >
            <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider mb-0.5">Buy</span>
            <span className="text-lg font-bold text-white font-mono leading-tight">{currentBid?.toFixed(3)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradingPanel;
