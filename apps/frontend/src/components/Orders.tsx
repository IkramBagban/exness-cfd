import React, { useState } from 'react'
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { useOrders, useCloseOrder } from '../utils/queries';

interface OrdersProps {
    prices: Record<string, { bid: number; ask: number; time: number }>;
}

const Orders = ({ prices }: OrdersProps) => {
    const [tradeType, setTradeType] = useState<'open' | 'closed'>('open');

    const { data: positions = [], isLoading, error } = useOrders(tradeType, prices);
    const closeOrderMutation = useCloseOrder();

    const handleTradeTypeChange = (newTradeType: 'open' | 'closed') => {
        if (newTradeType === tradeType) return;
        setTradeType(newTradeType);
    };

    const closeOrder = async (orderId: string) => {
        const confirmed = confirm('Are you sure you want to close this position?');
        if (!confirmed) return;

        try {
            await closeOrderMutation.mutateAsync(orderId);
        } catch (error) {
            console.error('Error closing order:', error);
        }
    };

    const positionsList = Array.isArray(positions) ? positions : [];

    return (
        <div className="flex-1 flex flex-col bg-[#131722]">
            <div className="flex border-b border-[#2A2E39]">
                <button
                    className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                        tradeType === 'open' 
                            ? 'border-[#FCD535] text-[#EAECEF] bg-[#1E222D]' 
                            : 'border-transparent text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#1E222D]/50'
                    }`}
                    onClick={() => handleTradeTypeChange('open')}
                >
                    Open Positions
                </button>
                <button
                    className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                        tradeType === 'closed' 
                            ? 'border-[#FCD535] text-[#EAECEF] bg-[#1E222D]' 
                            : 'border-transparent text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#1E222D]/50'
                    }`}
                    onClick={() => handleTradeTypeChange('closed')}
                >
                    History
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                {isLoading ? (
                    <div className="p-8 text-center text-[#848E9C]">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#FCD535] border-t-transparent"></div>
                        <div className="mt-3 text-xs font-medium">Loading positions...</div>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-[#F6465D] text-sm">
                        Error: {(error as Error).message}
                    </div>
                ) : positionsList.length === 0 ? (
                    <div className="p-12 text-center text-[#848E9C] flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-[#2A2E39] flex items-center justify-center mb-3">
                            <span className="text-xl opacity-50">📝</span>
                        </div>
                        <span className="text-sm">No {tradeType} positions found</span>
                    </div>
                ) : (
                    <div className="space-y-2 p-3">
                        {positionsList.map((position: any) => (
                            <div key={position.orderId} className="bg-[#1E222D] rounded-lg p-4 text-sm border border-[#2A2E39] hover:border-[#474D57] transition-colors shadow-sm group">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-1.5 h-8 rounded-full ${position.type === 'buy' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}></div>
                                        <div>
                                            <div className="font-bold text-[#EAECEF]">{position.symbol}</div>
                                            <div className={`text-xs font-medium uppercase ${position.type === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                                                {position.type === 'buy' ? 'Buy' : 'Sell'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="text-right">
                                            <div className={`text-sm font-mono font-bold ${position.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                                                {position.pnl >= 0 ? '+' : ''}{position.pnl?.toFixed(2) || '0.00'} <span className="text-xs text-[#848E9C] font-sans font-normal">USD</span>
                                            </div>
                                        </div>
                                        {tradeType === 'open' && (
                                            <button
                                                onClick={() => closeOrder(position.orderId)}
                                                disabled={closeOrderMutation.isPending}
                                                className="p-2 hover:bg-[#2A2E39] rounded-md text-[#848E9C] hover:text-[#F6465D] transition-colors opacity-0 group-hover:opacity-100"
                                                title="Close Position"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-xs border-t border-[#2A2E39] pt-3 mt-2">
                                    <div>
                                        <div className="text-[#848E9C] mb-1">Volume</div>
                                        <div className="text-[#EAECEF] font-mono">{position.qty}</div>
                                    </div>
                                    <div>
                                        <div className="text-[#848E9C] mb-1">Open Price</div>
                                        <div className="text-[#EAECEF] font-mono">{(position.openPrice).toFixed(3)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[#848E9C] mb-1">{tradeType === 'open' ? "Current" : "Closed"}</div>
                                        <div className="text-[#EAECEF] font-mono">{tradeType === 'open' ? position.currentPrice?.toFixed(3) : position.closePrice?.toFixed(3)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Orders