const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { signal });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`API error ${status}`);
    this.status = status;
    this.body = body;
  }
}
