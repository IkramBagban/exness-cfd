import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000, // Consider data stale after 1 second
      refetchOnWindowFocus: false, // Don't refetch on window focus for trading UI
      retry: 1, // Only retry once on failure
    },
  },
});
