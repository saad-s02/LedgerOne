import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { ChatPanel } from './ChatPanel';

export function ChatDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-testid="chat-toggle"
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Chat
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full max-w-md flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-200 px-4 py-3">
          <SheetTitle>Ask about transactions</SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Powered by Claude Haiku 4.5. Read-only access.
          </SheetDescription>
        </SheetHeader>
        <ChatPanel isOpen={open} />
      </SheetContent>
    </Sheet>
  );
}
