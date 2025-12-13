import React from 'react'

interface Props {
  selectedInstrument: string;
  currentAsk: number;
  setTimeWindow: React.Dispatch<React.SetStateAction<("1m" | "5m" | "1h" | "1d")>>;
  timeWindow: ("1m" | "5m" | "1h" | "1d");
}

const ChartHeader = ({
  selectedInstrument,
  currentAsk,
  setTimeWindow,
  timeWindow
}) => {
  return (
    <div className="bg-[#1E222D] border-b border-[#2A2E39] px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-[#EAECEF]">{selectedInstrument?.name}</span>
            <div className="h-4 w-px bg-[#2A2E39]"></div>
            <div className="flex bg-[#2A2E39] rounded p-0.5">
              {['1m', '5m', '1h', '1d'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeWindow(t as any)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    timeWindow === t 
                      ? 'bg-[#474D57] text-white shadow-sm' 
                      : 'text-[#848E9C] hover:text-[#EAECEF]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs font-mono">
            <span className="text-[#848E9C]">O: <span className="text-[#EAECEF]">{currentAsk?.toFixed(3)}</span></span>
            <span className="text-[#848E9C]">H: <span className="text-[#EAECEF]">{(currentAsk * 1.001)?.toFixed(3)}</span></span>
            <span className="text-[#848E9C]">L: <span className="text-[#EAECEF]">{(currentAsk * 0.999)?.toFixed(3)}</span></span>
            <span className="text-[#848E9C]">C: <span className="text-[#EAECEF]">{currentAsk?.toFixed(3)}</span></span>
          </div>
        </div>
      </div>
    </div>)
}

export default ChartHeader