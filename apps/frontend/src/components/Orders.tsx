import React, { useEffect, useState } from 'react'
import { calculatePnL } from '../utils/helpers';
import axios from 'axios';
import { X } from 'lucide-react';

const Orders = ({ prices, onOrderUpdate, refreshTrigger }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [tradeType, setTradeType] = useState<'open' | 'closed'>('open');

    const loadOrders = async (tradeType: "open" | "closed") => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const url = `${API_URL}/api/v1/trades/${tradeType}`;
            console.log("URL called to load orders:", url);
            const response = await axios.get(url);
            const data = response.data;
            console.log(`${tradeType} orders response:`, data);
            
            const ordersArray = Array.isArray(data) ? data : [];
            setOrders(ordersArray);

            // Convert orders to positions format
            const positionsData = ordersArray.map(order => ({
                ...order,
                currentPrice: prices[order.symbol]?.bid || order.openPrice,
                pnl: tradeType === 'open' ? calculatePnL(order, prices[order.symbol]) : order.pnl
            }));
            setPositions(positionsData);

            // Notify parent component about order updates
            if (onOrderUpdate) {
                onOrderUpdate();
            }

        } catch (error) {
            console.error('Error loading orders:', error);
            // Clear positions on error to avoid showing stale data
            setOrders([]);
            setPositions([]);
        }
    };

    // console.log("Rendering Orders component", { prices, positions, tradeType });
    const closeOrder = async (orderId: string) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/v1/trade/close/${orderId}`);

            if (response.status === 200) {
                // Reload orders to reflect the change
                await loadOrders(tradeType);

                // Notify parent component about order updates
                if (onOrderUpdate) {
                    onOrderUpdate();
                }
            }
        } catch (error) {
            console.error('Error closing order:', error);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (!prices || !positions) return;

            const positionsData = positions.map(order => ({
                ...order,
                currentPrice: prices[order.symbol]?.bid || order.openPrice,
                pnl: tradeType === 'open' ? calculatePnL(order, prices[order.symbol]) : order.pnl
            }));

            setPositions(positionsData);
        }, 100);
        return () => clearInterval(interval);
    }, [prices, positions]);

    useEffect(() => {
        loadOrders(tradeType);
    }, [tradeType]);

    // Refresh orders when parent triggers update
    useEffect(() => {
        if (refreshTrigger > 0) {
            loadOrders(tradeType);
        }
    }, [refreshTrigger, tradeType]);

    // Clear positions when switching tabs to avoid showing stale data
    useEffect(() => {
        setPositions([]);
        setOrders([]);
    }, [tradeType]);

    return (
        <div className="flex-1 flex flex-col">
            <div className="flex border-b border-gray-700">
                <button className={`flex-1 py-3 px-4 text-sm font-medium ${tradeType === 'open' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`} onClick={() => setTradeType('open')}>
                    Open
                </button>
                <button className={`flex-1 py-3 px-4 text-sm font-medium ${tradeType === 'closed' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`} onClick={() => setTradeType('closed')}>
                    Closed
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {positions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        No {tradeType} positions
                    </div>
                ) : (
                    <div className="space-y-2 p-2">
                        {positions.map((position) => {
                            return (
                                <div key={position.orderId} className="bg-gray-700 rounded p-3 text-sm border border-gray-600">
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
                                                    className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition-colors"
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
                            )
                        })}
                    </div>
                )}
            </div>
        </div>)
}

export default Orders