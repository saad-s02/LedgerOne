import { apiPost } from './client';

export type WireChatMessage = { role: 'user' | 'assistant'; content: string };

export type ToolCall = {
  tool: 'search_transactions' | 'get_transaction' | string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  isError: boolean;
};

export type ChatResponse = {
  response: string;
  toolCalls: ToolCall[];
};

export type ChatRequest = {
  message: string;
  conversationHistory: WireChatMessage[];
};

export async function postChat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
  return apiPost<ChatResponse>('/api/chat', req, signal);
}

export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      text: string;
      toolCalls: ToolCall[];
      isErrorBubble?: boolean;
    };

export function toWire(messages: ChatMessage[], capLast: number): WireChatMessage[] {
  return messages.slice(-capLast).map((m) => ({ role: m.role, content: m.text }));
}
