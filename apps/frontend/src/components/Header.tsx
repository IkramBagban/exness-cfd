import React from 'react'

const Header = ({ wsConnected, balance }) => {
    return (
        <div className="bg-[#1E222D] border-b border-[#2A2E39] px-6 py-3 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <div className="text-xl font-bold text-[#FCD535] tracking-tight">Exness</div>
                    <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2 bg-[#2A2E39] px-3 py-1 rounded-full">
                            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}></div>
                            <span className="text-[#848E9C] text-xs font-medium">{wsConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <div className="text-xs text-[#848E9C] mb-0.5">Total Balance</div>
                        <div className="text-lg font-bold text-[#EAECEF] font-mono">
                            ${balance?.usd_balance ? balance.usd_balance.toFixed(2) : '0.00'} <span className="text-sm text-[#848E9C] font-sans font-normal">USD</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>)
}

export default Header;