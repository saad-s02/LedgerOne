/**
 * Minimal types for the slice of OpenAPI 3.1 the docs page actually consumes.
 * Deliberately a subset — we don't try to model every spec construct, just
 * what the backend emits and what we render.
 */

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
export const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

export interface OpenApiDocument {
  openapi: string;
  info: OpenApiInfo;
  servers?: OpenApiServer[];
  tags?: OpenApiTag[];
  paths: Record<string, Record<HttpMethod, OpenApiOperation> & { parameters?: OpenApiParameter[] }>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
}

export interface OpenApiInfo {
  title: string;
  description?: string;
  version: string;
  contact?: { name?: string; email?: string; url?: string };
}

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface OpenApiTag {
  name: string;
  description?: string;
}

export interface OpenApiOperation {
  operationId?: string;
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
}

export interface OpenApiParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: OpenApiSchema;
}

export interface OpenApiRequestBody {
  required?: boolean;
  description?: string;
  content: Record<string, { schema?: OpenApiSchema }>;
}

export interface OpenApiResponse {
  description?: string;
  content?: Record<string, { schema?: OpenApiSchema }>;
}

export interface OpenApiSchema {
  $ref?: string;
  type?: string;
  format?: string;
  description?: string;
  enum?: unknown[];
  nullable?: boolean;
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  default?: unknown;
  example?: unknown;
}

export const openApiKey = ['openapi', 'v1'] as const;

export async function fetchOpenApiSpec(signal?: AbortSignal): Promise<OpenApiDocument> {
  const res = await fetch(`${baseUrl}/openapi/v1.json`, { signal });
  if (!res.ok) {
    throw new Error(`OpenAPI spec request failed (${res.status})`);
  }
  return (await res.json()) as OpenApiDocument;
}

export function resolveRef<T>(
  spec: OpenApiDocument,
  schema: OpenApiSchema | undefined,
): T | undefined {
  if (!schema?.$ref) return schema as T | undefined;
  // Refs look like #/components/schemas/Foo
  const parts = schema.$ref.replace(/^#\//, '').split('/');
  let cursor: unknown = spec;
  for (const part of parts) {
    if (cursor && typeof cursor === 'object' && part in cursor) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cursor as T;
}

export function apiBaseUrl(): string {
  return baseUrl;
}
