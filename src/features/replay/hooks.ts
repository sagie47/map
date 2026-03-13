import { useQuery } from '@tanstack/react-query';
import { fetchReplayIncident, fetchReplayEvents } from './api';
import { useState, useEffect } from 'react';

export function useReplayData(id: string | undefined) {
  const incidentQuery = useQuery({
    queryKey: ['replay-incident', id],
    queryFn: () => fetchReplayIncident(id!),
    enabled: !!id,
  });

  const eventsQuery = useQuery({
    queryKey: ['replay-events', id],
    queryFn: () => fetchReplayEvents(id!),
    enabled: !!id,
  });

  return {
    data: incidentQuery.data && eventsQuery.data ? {
      incident: incidentQuery.data,
      events: eventsQuery.data
    } : undefined,
    isLoading: incidentQuery.isLoading || eventsQuery.isLoading,
    error: incidentQuery.error || eventsQuery.error,
  };
}

export function useReplayPlayback(events: any[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isPlaying && currentIndex < events.length) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000); // 1 second per event
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, events.length]);

  const togglePlayback = () => setIsPlaying(!isPlaying);
  const seekTo = (index: number) => setCurrentIndex(index);

  return {
    isPlaying,
    togglePlayback,
    currentIndex,
    seekTo,
  };
}
