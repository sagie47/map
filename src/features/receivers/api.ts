import { ReceiverStation } from "@shared/types/receivers";

export async function fetchReceivers(): Promise<ReceiverStation[]> {
  const response = await fetch('/api/receivers');
  if (!response.ok) throw new Error('Failed to fetch receivers');
  return response.json();
}
