import { useQuery } from '@tanstack/react-query';
import { fetchReplay, fetchReplayFrames } from './api';
import { useState, useEffect, useMemo } from 'react';
import { ReplayResponseDto, ReplayFrameDto } from '@shared/types/replay';

export function useReplayData(id: string | undefined) {
  const replayQuery = useQuery({
    queryKey: ['replay', id],
    queryFn: () => fetchReplay(id!),
    enabled: !!id,
  });

  return {
    data: replayQuery.data as ReplayResponseDto | undefined,
    isLoading: replayQuery.isLoading,
    error: replayQuery.error,
  };
}

export function useReplayFrames(id: string | undefined) {
  const framesQuery = useQuery({
    queryKey: ['replay-frames', id],
    queryFn: () => fetchReplayFrames(id!),
    enabled: !!id,
  });

  return {
    data: framesQuery.data as ReplayFrameDto[] | undefined,
    isLoading: framesQuery.isLoading,
    error: framesQuery.error,
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
