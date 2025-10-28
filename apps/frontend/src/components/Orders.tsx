import React, { useState } from 'react'
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
        try {
            await closeOrderMutation.mutateAsync(orderId);
        } catch (error) {
            console.error('Error closing order:', error);
        }
    };

    return (
        <div className="flex-1 flex flex-col">
            <div className="flex border-b border-gray-700">
                <button 
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${tradeType === 'open' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`} 
                    onClick={() => handleTradeTypeChange('open')}
                >
                    Open
                </button>
                <button 
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${tradeType === 'closed' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`} 
                    onClick={() => handleTradeTypeChange('closed')}
                >
                    Closed
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-4 text-center text-gray-400">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <div className="mt-2">Loading {tradeType} positions...</div>
                    </div>
                ) : error ? (
                    <div className="p-4 text-center text-red-400">
                        Error loading orders: {error.message}
                    </div>
                ) : positions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        No {tradeType} positions
                    </div>
                ) : (
                    <div className="space-y-2 p-2">
                        {positions.map((position) => (
                            <div key={position.orderId} className="bg-gray-800 rounded p-3 text-sm border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${position.type === 'buy' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                                        <span className="font-medium">{position.symbol}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                                            {position.pnl >= 0 ? '+' : ''}{position.pnl?.toFixed(2) || '0.00'}
                                        </span>
                                        {tradeType === 'open' && (
                                            <button
                                                onClick={() => closeOrder(position.orderId)}
                                                disabled={closeOrderMutation.isPending}
                                                className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                                title="Close Position"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
                                    <div className='flex flex-col gap-1'>
                                        <div>Type</div>
                                        <div className={position.type === 'buy' ? 'text-blue-400' : 'text-red-400'}>
                                            {position.type === 'buy' ? 'Buy' : 'Sell'}
                                        </div>
                                    </div>
                                    <div>
                                        <div>Volume, lot</div>
                                        <div className="text-white">{position.qty}</div>
                                    </div>
                                    <div>
                                        <div>Open price</div>
                                        <div className="text-white">{(position.openPrice).toFixed(3)}</div>
                                    </div>
                                    <div>
                                        <div>Current price</div>
                                        <div className="text-white">{position.currentPrice?.toFixed(3) || (position.openPrice).toFixed(3)}</div>
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