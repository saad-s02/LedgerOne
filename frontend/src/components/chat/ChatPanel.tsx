import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postChat, toWire, type ChatMessage, type ChatResponse } from '../../api/chat';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';
import { SeedPrompts } from './SeedPrompts';

const HISTORY_CAP = 10;

export function ChatPanel({ isOpen }: { isOpen: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ text }: { text: string }): Promise<ChatResponse> => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      // Snapshot the history *before* we append the new user message so we send
      // the same shape the server expects (current message lives in `message`,
      // not `conversationHistory`).
      const history = toWire(messages, HISTORY_CAP);
      return postChat({ message: text, conversationHistory: history }, ctrl.signal);
    },
    onSuccess: (resp) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: resp.response,
          toolCalls: resp.toolCalls,
        },
      ]);
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `Couldn't reach the assistant: ${message}`,
          toolCalls: [],
          isErrorBubble: true,
        },
      ]);
    },
  });

  const send = (text: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text }]);
    mutation.mutate({ text });
  };

  const retry = () => {
    // Find the last user message, re-send it; drop the trailing error bubble first.
    // NOTE: mutation.mutate must be called *outside* the setMessages updater to avoid
    // React StrictMode double-invocation firing two network requests.
    let textToRetry: string | undefined;
    setMessages((prev) => {
      const filtered = [...prev];
      // Pop trailing error bubbles
      while (
        filtered.length > 0 &&
        filtered[filtered.length - 1].role === 'assistant' &&
        (filtered[filtered.length - 1] as { isErrorBubble?: boolean }).isErrorBubble === true
      ) {
        filtered.pop();
      }
      const lastUser = [...filtered].reverse().find((m) => m.role === 'user');
      textToRetry = lastUser?.text;
      return filtered;
    });
    if (textToRetry) {
      mutation.mutate({ text: textToRetry });
    }
  };

  // Cancel in-flight request when the drawer closes
  useEffect(() => {
    if (!isOpen) abortRef.current?.abort();
  }, [isOpen]);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, mutation.isPending]);

  const lastIsErrorBubble =
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    (messages[messages.length - 1] as { isErrorBubble?: boolean }).isErrorBubble === true;

  return (
    <div className="flex h-full flex-col" data-testid="chat-panel">
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        data-testid="message-list"
      >
        {messages.length === 0 && !mutation.isPending ? (
          <SeedPrompts onSend={send} disabled={mutation.isPending} />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {mutation.isPending && (
          <div
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-dim"
            data-testid="thinking-indicator"
          >
            Thinking…
          </div>
        )}
        {lastIsErrorBubble && !mutation.isPending && (
          <button
            type="button"
            onClick={retry}
            data-testid="chat-retry"
            className="rounded-[3px] border border-rose-500/50 bg-rose-500/[0.08] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-rose-400 hover:bg-rose-500/[0.15]"
          >
            Retry
          </button>
        )}
      </div>
      <Composer onSend={send} disabled={mutation.isPending} />
    </div>
  );
}
