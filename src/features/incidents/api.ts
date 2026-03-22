import { Incident } from "@shared/types/incidents";
import { SignalEvent } from "@shared/types/events";

export async function fetchIncidents(): Promise<Incident[]> {
  const response = await fetch('/api/incidents');
  if (!response.ok) throw new Error('Failed to fetch incidents');
  return response.json();
}

export async function fetchIncident(id: string): Promise<Incident> {
  const response = await fetch(`/api/incidents/${id}`);
  if (!response.ok) throw new Error('Failed to fetch incident');
  return response.json();
}

export async function fetchIncidentEvents(id: string): Promise<SignalEvent[]> {
  const response = await fetch(`/api/incidents/${id}/events`);
  if (!response.ok) throw new Error('Failed to fetch incident events');
  return response.json();
}

export async function fetchRecentEvents(limit = 100): Promise<SignalEvent[]> {
  const response = await fetch(`/api/events/recent?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch recent events');
  return response.json();
}
