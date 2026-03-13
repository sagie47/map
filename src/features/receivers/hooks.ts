import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReceivers } from './api';
import { useSocketSubscription } from '../connection/hooks';
import { WEBSOCKET_EVENTS } from "@shared/types/websocket";
import { ReceiverStation } from "@shared/types/receivers";

export function useReceivers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['receivers'],
    queryFn: fetchReceivers,
  });

  useSocketSubscription((type, payload) => {
    if (type === WEBSOCKET_EVENTS.RECEIVER_UPDATED) {
      queryClient.setQueryData<ReceiverStation[]>(['receivers'], (old) => {
        if (!old) return [payload];
        const exists = old.find((r) => r.id === payload.id);
        if (exists) {
          return old.map((r) => (r.id === payload.id ? payload : r));
        }
        return [...old, payload];
      });
    }
  });

  return query;
}
