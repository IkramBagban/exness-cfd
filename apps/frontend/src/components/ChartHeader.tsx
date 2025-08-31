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
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className={selectedInstrument?.color}>{selectedInstrument?.icon}</span>
            <span className="text-lg font-semibold">{selectedInstrument?.name}</span>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value as ("1m" | "5m" | "1h" | "1d"))}
              className="bg-gray-700 border border-gray-600 rounded p-1"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="1h">1h</option>
              <option value="1d">1d</option>
            </select>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-blue-400">O: {currentAsk?.toFixed(3)}</span>
            <span className="text-green-400">H: {(currentAsk * 1.001)?.toFixed(3)}</span>
            <span className="text-red-400">L: {(currentAsk * 0.999)?.toFixed(3)}</span>
            <span className="text-white">C: {currentAsk?.toFixed(3)}</span>
          </div>
        </div>
      </div>
    </div>)
}

export default ChartHeader