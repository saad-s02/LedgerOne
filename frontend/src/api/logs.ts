import { apiGet } from './client';

export type LogLevel = 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal';

export interface LogEntryDto {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId: string | null;
  sourceContext: string | null;
  exception: string | null;
}

export interface ListLogsResponse {
  data: LogEntryDto[];
  lastId: number;
  bufferStartId: number;
  capacity: number;
}

export interface ListLogsParams {
  since: number;
  level?: LogLevel;
  limit?: number;
}

export function logsKey(params: ListLogsParams) {
  return ['logs', params] as const;
}

export function fetchLogs(
  params: ListLogsParams,
  signal?: AbortSignal,
): Promise<ListLogsResponse> {
  const qs = new URLSearchParams();
  qs.set('since', String(params.since));
  if (params.level) qs.set('level', params.level);
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  return apiGet<ListLogsResponse>(`/api/logs?${qs}`, signal);
}
