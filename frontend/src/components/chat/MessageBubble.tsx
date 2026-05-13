import type { ChatMessage } from '../../api/chat';
import { MarkdownText } from '../../lib/markdown';
import { ToolCallCard } from './ToolCallCard';

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end" data-testid="message-user">
        <div className="max-w-[85%] rounded-lg border border-cyan/40 bg-cyan/[0.08] px-3 py-2 font-mono text-[12px] text-text-bright">
          {message.text}
        </div>
      </div>
    );
  }

  const isError = message.isErrorBubble === true;
  const bubbleClass = isError
    ? 'border-rose-500/40 bg-rose-500/[0.05] text-rose-300'
    : 'border-line bg-bg-elev text-text';

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
        <div className={`max-w-[95%] rounded-lg border px-3 py-2 text-[13px] ${bubbleClass}`}>
          <MarkdownText>{message.text}</MarkdownText>
        </div>
      )}
    </div>
  );
}
