import React from 'react';

interface InstrumentInfo {
  name: string;
  symbol: string;
}

interface Props {
  selectedInstrument?: InstrumentInfo;
  currentAsk?: number;
  setTimeWindow: React.Dispatch<React.SetStateAction<'1m' | '5m' | '1h' | '1d'>>;
  timeWindow: '1m' | '5m' | '1h' | '1d';
}

const ChartHeader = ({ selectedInstrument, currentAsk = 0, setTimeWindow, timeWindow }: Props) => {
  return (
    <div className="bg-[#1E222D] border-b border-[#2A2E39] px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-3">
            <span className="text-base sm:text-lg font-bold text-[#EAECEF]">{selectedInstrument?.name}</span>
            <div className="hidden sm:block h-4 w-px bg-[#2A2E39]"></div>
            <span className="text-xs text-[#848E9C] font-mono">{selectedInstrument?.symbol}</span>
          </div>
          <div className="flex bg-[#2A2E39] rounded p-0.5 w-fit">
            {['1m', '5m', '1h', '1d'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeWindow(t as '1m' | '5m' | '1h' | '1d')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  timeWindow === t ? 'bg-[#474D57] text-white shadow-sm' : 'text-[#848E9C] hover:text-[#EAECEF]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-1 text-xs font-mono">
          <span className="text-[#848E9C]">O: <span className="text-[#EAECEF]">{currentAsk.toFixed(3)}</span></span>
          <span className="text-[#848E9C]">H: <span className="text-[#EAECEF]">{(currentAsk * 1.001).toFixed(3)}</span></span>
          <span className="text-[#848E9C]">L: <span className="text-[#EAECEF]">{(currentAsk * 0.999).toFixed(3)}</span></span>
          <span className="text-[#848E9C]">C: <span className="text-[#EAECEF]">{currentAsk.toFixed(3)}</span></span>
        </div>
      </div>
    </div>
  );
};

export default ChartHeader;
