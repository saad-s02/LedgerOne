export const API_BASE = 'http://localhost:5000';

export async function seedFixture(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/seed`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to seed: ${res.status}`);
}

export async function clearFixture(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/clear`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to clear: ${res.status}`);
}
