import React from 'react';
import { Search } from 'lucide-react';
import { instruments } from '../utils/constants';

const Instruments = ({ selectedSymbol, prices, setSelectedSymbol }) => {
  return (
    <div className="w-85 bg-gray-800 border-r border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            className="bg-gray-700 text-white px-3 py-2 rounded text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="text-sm font-medium text-gray-300 mb-2">INSTRUMENTS</div>
      </div>

      <div className="p-2">
        <div className="text-xs text-gray-400 mb-2 px-2">Favorites</div>
        <div className="space-y-1">
          {instruments.map((instrument) => {
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
          })}
        </div>
      </div>
    </div>)
}

export default Instruments