import React from 'react'

const Header = ({ wsConnected, balance }) => {
    return (
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <div className="text-xl font-bold text-blue-400">Exness</div>
                    <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-gray-400">{wsConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <div className="text-sm text-gray-400">Balance</div>
                        <div className="text-lg font-semibold text-green-400">
                            ${balance?.usd_balance ? balance.usd_balance.toFixed(2) : '0.00'} USD
                        </div>
                    </div>
                </div>
            </div>
        </div>)
}

export default Header;