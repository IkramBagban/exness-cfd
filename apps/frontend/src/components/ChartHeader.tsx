import { BarChart3, Settings } from 'lucide-react'
import React from 'react'

const ChartHeader = ({
  selectedInstrument,
  currentBid
}) => {
  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className={selectedInstrument?.color}>{selectedInstrument?.icon}</span>
            <span className="text-lg font-semibold">{selectedInstrument?.name}</span>
            <span className="text-sm text-gray-400">• 1m</span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-blue-400">O: {currentBid?.toFixed(3)}</span>
            <span className="text-green-400">H: {(currentBid * 1.001)?.toFixed(3)}</span>
            <span className="text-red-400">L: {(currentBid * 0.999)?.toFixed(3)}</span>
            <span className="text-white">C: {currentBid?.toFixed(3)}</span>
            <span className="text-gray-400">+0.001 (+0.00%)</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-700 rounded">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-gray-700 rounded">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>)
}

export default ChartHeader