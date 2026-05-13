import type { ChatMessage } from '../../api/chat';
import { MarkdownText } from '../../lib/markdown';
import { ToolCallCard } from './ToolCallCard';

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end" data-testid="message-user">
        <div className="max-w-[85%] rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">
          {message.text}
        </div>
      </div>
    );
  }

  const isError = message.isErrorBubble === true;
  const bubbleClass = isError
    ? 'border border-red-300 bg-red-50 text-red-800'
    : 'bg-slate-100 text-slate-900';

  return (
    <div
      className="flex flex-col items-start gap-2"
      data-testid="message-assistant"
      data-error={isError ? 'true' : 'false'}
    >
      {message.toolCalls.map((tc, i) => (
        <ToolCallCard key={`${message.id}-tc-${i}`} toolCall={tc} />
      ))}
      {message.text && (
        <div className={`max-w-[95%] rounded-lg px-3 py-2 text-sm ${bubbleClass}`}>
          <MarkdownText>{message.text}</MarkdownText>
        </div>
      )}
    </div>
  );
}
