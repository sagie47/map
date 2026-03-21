import { ReplayFrameDto, ReplayResponseDto } from "@shared/types/replay";

export function selectFrameAtIndex(
  frames: ReplayFrameDto[],
  index: number
): ReplayFrameDto | null {
  if (!frames || frames.length === 0) return null;
  return frames[Math.min(Math.max(0, index), frames.length - 1)] || null;
}

export function selectCurrentFrame(
  replay: ReplayResponseDto | undefined,
  frames: ReplayFrameDto[] | undefined,
  currentIndex: number
): ReplayFrameDto | null {
  if (!replay || !frames || frames.length === 0) return null;
  return selectFrameAtIndex(frames, currentIndex);
}
