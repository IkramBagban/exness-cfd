import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { calculatePnL } from './helpers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';


// this are the keys that i want to use for react query to manage orders and balance
// to invalidate and refetch them when needed
export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (type: 'open' | 'closed') => [...ordersKeys.lists(), type] as const,
};

export const balanceKeys = {
  all: ['balance'] as const,
};

const fetchOrders = async (tradeType: 'open' | 'closed') => {
  const url = `${API_URL}/api/v1/trades/${tradeType}`;
  const response = await axios.get(url);
  const data = response.data;
  return Array.isArray(data) ? data : [];
};

const fetchBalance = async () => {
  const response = await axios.get(`${API_URL}/api/v1/balance`);
  return response.data;
};

const closeOrderApi = async (orderId: string) => {
  const response = await axios.post(`${API_URL}/api/v1/trade/close/${orderId}`);
  return response.data;
};

const createOrderApi = async (order: {
  type: string;
  symbol: string;
  qty: number;
  margin?: number;
  leverage?: number;
}) => {
  const response = await axios.post(`${API_URL}/api/v1/trade/open`, order);
  return response.data;
};

export const useOrders = (
  tradeType: 'open' | 'closed',
  prices: Record<string, { bid: number; ask: number; time: number }>
) => {
  return useQuery({
    queryKey: ordersKeys.list(tradeType),
    queryFn: () => fetchOrders(tradeType),
    select: (orders) => {
      // Transform orders to include current prices and pnl
      return orders.map((order) => ({
        ...order,
        currentPrice: prices[order.symbol]?.bid || order.openPrice,
        pnl:
          tradeType === 'open'
            ? calculatePnL(order, prices[order.symbol])
            : order.pnl,
      }));
    },
    staleTime: 500, // Refetch every 500ms to get fresh data
  });
};

export const useBalance = () => {
  return useQuery({
    queryKey: balanceKeys.all,
    queryFn: fetchBalance,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
};

export const useCloseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeOrderApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: balanceKeys.all });
    },
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrderApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.list('open') });
      queryClient.invalidateQueries({ queryKey: balanceKeys.all });
    },
  });
};
