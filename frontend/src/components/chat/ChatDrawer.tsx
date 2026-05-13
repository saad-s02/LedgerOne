import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { ChatPanel } from './ChatPanel';
import { usePanelExclusion } from '../PanelExclusion';

export function ChatDrawer() {
  const { active, isChatOpen, openChat, closeChat } = usePanelExclusion();
  const [localOpen, setLocalOpen] = useState(false);

  // Mirror context state into local for the shadcn Sheet's `open` prop.
  useEffect(() => {
    setLocalOpen(isChatOpen);
  }, [isChatOpen]);

  // When detail takes over, ensure chat closes.
  useEffect(() => {
    if (active === 'detail' && localOpen) {
      setLocalOpen(false);
    }
  }, [active, localOpen]);

  const onOpenChange = (next: boolean) => {
    setLocalOpen(next);
    if (next) openChat();
    else closeChat();
  };

  return (
    <Sheet open={localOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-testid="chat-toggle"
          className="rounded-[3px] border border-cyan/40 bg-cyan/[0.08] px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-cyan transition-colors duration-[120ms] hover:bg-cyan/[0.15]"
        >
          Chat
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col border-l border-line-strong bg-bg-elev p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-line px-4 py-3">
          <SheetTitle className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-cyan">
            Ask about transactions
          </SheetTitle>
          <SheetDescription className="font-mono text-[10px] text-text-dim">
            Powered by Claude Haiku 4.5 · Read-only access
          </SheetDescription>
        </SheetHeader>
        <ChatPanel isOpen={localOpen} />
      </SheetContent>
    </Sheet>
  );
}
