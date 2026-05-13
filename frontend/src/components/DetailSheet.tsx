import { useEffect, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { usePanelExclusion } from './PanelExclusion';

interface Props {
  /** Always true when rendered (the route's existence drives open/close) */
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function DetailSheet({ open, onClose, title, children }: Props) {
  const { registerDetailOpen, registerDetailClosed } = usePanelExclusion();

  useEffect(() => {
    if (open) {
      registerDetailOpen();
      return () => registerDetailClosed();
    }
    return undefined;
  }, [open, registerDetailOpen, registerDetailClosed]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-line-strong bg-bg-elev p-0 sm:max-w-md"
        data-testid="detail-sheet"
      >
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-cyan">
            {title}
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
