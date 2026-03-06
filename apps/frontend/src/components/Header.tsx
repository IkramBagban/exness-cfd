import React from 'react';

interface HeaderProps {
  wsConnected: boolean;
  balance?: { usd_balance?: number };
}

const Header = ({ wsConnected, balance }: HeaderProps) => {
  return (
    <div className="bg-[#1E222D] border-b border-[#2A2E39] px-4 sm:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <div className="text-lg sm:text-xl font-bold text-[#FCD535] tracking-tight">Exness</div>
          <div className="flex items-center">
            <div className="flex items-center gap-2 bg-[#2A2E39] px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}></div>
              <span className="text-[#848E9C] text-xs font-medium">{wsConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[11px] sm:text-xs text-[#848E9C] mb-0.5">Total Balance</div>
          <div className="text-sm sm:text-lg font-bold text-[#EAECEF] font-mono">
            ${balance?.usd_balance ? balance.usd_balance.toFixed(2) : '0.00'} <span className="text-xs sm:text-sm text-[#848E9C] font-sans font-normal">USD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
