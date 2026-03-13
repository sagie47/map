import { Incident } from "@shared/types/incidents";
import { SignalEvent } from "@shared/types/events";

export async function fetchReplayIncident(id: string): Promise<Incident> {
  const response = await fetch(`/api/incidents/${id}`);
  if (!response.ok) throw new Error('Incident not found');
  return response.json();
}

export async function fetchReplayEvents(id: string): Promise<SignalEvent[]> {
  const response = await fetch(`/api/incidents/${id}/events`);
  if (!response.ok) throw new Error('Events not found');
  const data = await response.json();
  return data.sort(
    (a: any, b: any) =>
      new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime()
  );
}
