import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { instruments } from '../utils/constants';

interface InstrumentsProps {
  selectedSymbol: string | null;
  prices: Record<string, { bid: number; ask: number; time: number }>;
  setSelectedSymbol: (symbol: string) => void;
}

const Instruments = ({ selectedSymbol, prices, setSelectedSymbol }: InstrumentsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredInstruments = instruments.filter((instrument) => {
    if (!debouncedSearch) return true;
    const search = debouncedSearch.toLowerCase();
    return (
      instrument.symbol.toLowerCase().includes(search) ||
      instrument.name.toLowerCase().includes(search)
    );
  });

  return (
    <div className="w-85 bg-[#1E222D] border-r border-[#2A2E39] flex flex-col">
      <div className="p-4 border-b border-[#2A2E39]">
        <div className="flex items-center space-x-2 mb-4 bg-[#2A2E39] rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-[#FCD535] transition-all">
          <Search className="w-4 h-4 text-[#848E9C]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-[#EAECEF] text-sm flex-1 focus:outline-none placeholder-[#5E6673]"
          />
        </div>
        <div className="text-xs font-bold text-[#848E9C] mb-2 px-1">MARKETS</div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="text-xs text-[#848E9C] mb-2 px-4 mt-2 font-medium">
          {debouncedSearch ? `Found ${filteredInstruments.length} results` : 'Favorites'}
        </div>
        <div className="space-y-1">
          {filteredInstruments.length === 0 ? (
            <div className="text-center text-gray-500 py-4 text-sm">
              No instruments found
            </div>
          ) : (
            filteredInstruments.map((instrument) => {
            const isSelected = selectedSymbol === instrument.symbol;
            const livePrice = prices[instrument.symbol];
            const currentBid = livePrice?.bid || instrument.bid;
            const currentAsk = livePrice?.ask || instrument.ask;
            const change = instrument.change;

            return (
              <div
                key={instrument.symbol}
                onClick={() => setSelectedSymbol(instrument.symbol)}
                className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-gray-700/50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <div className="font-medium text-sm">{instrument.symbol}</div>
                    <div className="text-xs text-gray-400">{instrument.name}</div>
                  </div>
                </div>
                <div className="text-right flex gap-4 space-y-3">
                  <div className="text-sm font-mono text-green-400 ">{currentBid.toFixed(5)}</div> 
                  <div className="text-sm font-mono text-red-500">{currentAsk.toFixed(5)}</div>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>)
}

export default Instruments