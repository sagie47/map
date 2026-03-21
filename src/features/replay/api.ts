import { ReplayResponseDto, ReplayFrameDto } from "@shared/types/replay";

export async function fetchReplay(id: string): Promise<ReplayResponseDto> {
  const response = await fetch(`/api/incidents/${id}/replay`);
  if (!response.ok) throw new Error('Replay not found');
  return response.json();
}

export async function fetchReplayFrames(id: string): Promise<ReplayFrameDto[]> {
  const response = await fetch(`/api/incidents/${id}/replay/frames`);
  if (!response.ok) throw new Error('Frames not found');
  return response.json();
}

export async function fetchReplayIncident(id: string) {
  const response = await fetch(`/api/incidents/${id}`);
  if (!response.ok) throw new Error('Incident not found');
  return response.json();
}

export async function fetchReplayEvents(id: string) {
  const response = await fetch(`/api/incidents/${id}/events`);
  if (!response.ok) throw new Error('Events not found');
  const data = await response.json();
  return data.sort(
    (a: any, b: any) =>
      new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime()
  );
}
