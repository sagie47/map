import { useQuery } from '@tanstack/react-query';
import { fetchAnalytics } from './api';

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
    refetchInterval: 10000, // Refetch every 10s for live updates
  });
}
