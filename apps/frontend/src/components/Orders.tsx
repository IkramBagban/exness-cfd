import React from 'react'

const Orders = ({ positions }) => {
    return (
        <div className="flex-1 flex flex-col">
            <div className="flex border-b border-gray-700">
                <button className="flex-1 py-3 px-4 text-sm font-medium bg-gray-700 text-white">
                    Open
                </button>
                <button className="flex-1 py-3 px-4 text-sm font-medium text-gray-400 hover:text-white">
                    Pending
                </button>
                <button className="flex-1 py-3 px-4 text-sm font-medium text-gray-400 hover:text-white">
                    Closed
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {positions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No open positions</div>
                ) : (
                    <div className="space-y-1 p-2">
                        {positions.map((position, index) => (
                            <div key={index} className="bg-gray-700/50 rounded p-3 text-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${position.type === 'buy' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                                        <span className="font-medium">{position.symbol}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-400">Add</span>
                                        <button className="text-xs text-blue-400 hover:text-blue-300">✏️</button>
                                        <button className="text-xs text-gray-400 hover:text-white">ℹ️</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
                                    <div>
                                        <div>Type</div>
                                        <div className={position.type === 'buy' ? 'text-blue-400' : 'text-red-400'}>
                                            {position.type === 'buy' ? '● Buy' : '● Sell'}
                                        </div>
                                    </div>
                                    <div>
                                        <div>Volume, lot</div>
                                        <div className="text-white">{position.qty}</div>
                                    </div>
                                    <div>
                                        <div>Open price</div>
                                        <div className="text-white">{position.entryPrice}</div>
                                    </div>
                                    <div>
                                        <div>Current price</div>
                                        <div className="text-white">{position.currentPrice?.toFixed(3) || position.entryPrice}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-600">
                                    <div className="text-xs">
                                        <span className="text-gray-400">T/P: </span>
                                        <span className="text-blue-400">Add</span>
                                    </div>
                                    <div className="text-xs">
                                        <span className="text-gray-400">P/L: </span>
                                        <span className={position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                                            {position.pnl >= 0 ? '+' : ''}{position.pnl?.toFixed(2) || '0.00'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>)
}

export default Orders