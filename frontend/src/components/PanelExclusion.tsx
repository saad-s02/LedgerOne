import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Channel = 'chat' | 'detail' | null;

interface Value {
  /** Which side-panel is open ('chat', 'detail', or null) */
  active: Channel;
  /** True if the chat drawer is open */
  isChatOpen: boolean;
  /** Open the chat (closes detail). Used by ChatDrawer's onOpenChange. */
  openChat: () => void;
  /** Close the chat. Used by ChatDrawer's onOpenChange. */
  closeChat: () => void;
  /** Called by DetailSheet when it mounts. Closes the chat as a side-effect. */
  registerDetailOpen: () => void;
  /** Called by DetailSheet when it unmounts. */
  registerDetailClosed: () => void;
}

const Ctx = createContext<Value | null>(null);

export function PanelExclusionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Channel>(null);

  const openChat = useCallback(() => setActive('chat'), []);
  const closeChat = useCallback(() => setActive((curr) => (curr === 'chat' ? null : curr)), []);
  const registerDetailOpen = useCallback(() => setActive('detail'), []);
  const registerDetailClosed = useCallback(
    () => setActive((curr) => (curr === 'detail' ? null : curr)),
    [],
  );

  const value = useMemo<Value>(
    () => ({
      active,
      isChatOpen: active === 'chat',
      openChat,
      closeChat,
      registerDetailOpen,
      registerDetailClosed,
    }),
    [active, openChat, closeChat, registerDetailOpen, registerDetailClosed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePanelExclusion(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePanelExclusion must be used inside <PanelExclusionProvider>');
  return v;
}
