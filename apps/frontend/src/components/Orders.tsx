import React, { useEffect, useState } from 'react'
import { calculatePnL } from '../utils/helpers';
import axios from 'axios';

const Orders = ({ prices }) => {
    const [orders, setOrders] = useState([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [tradeType, setTradeType] = useState<'open' | 'closed'>('open');

    const loadOrders = async (tradeType: "open" | "closed") => {
        try {
            const response = await axios.get(`http://localhost:3000/api/v1/trades/${tradeType}`);
            const data = response.data;
            setOrders(Array.isArray(data) ? data : []);

            // Convert orders to positions format
            const positionsData = data.map(order => ({
                ...order,
                currentPrice: prices[order.symbol]?.bid || order.openPrice,
                pnl: calculatePnL(order, prices[order.symbol])
            }));
            setPositions(positionsData);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (!prices || !positions) return;

            const positionsData = positions.map(order => ({
                ...order,
                currentPrice: prices[order.symbol]?.bid || order.openPrice,
                pnl: calculatePnL(order, prices[order.symbol])
            }));
            setPositions(positionsData);
        }, 100);
        return () => clearInterval(interval);
    }, [prices, positions]);

    useEffect(() => {
        loadOrders(tradeType);
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
                                        <span className={position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                                            {position.pnl >= 0 ? '+' : ''}{position.pnl?.toFixed(2) || '0.00'}
                                        </span>
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
        </div>)
}

export default Orders