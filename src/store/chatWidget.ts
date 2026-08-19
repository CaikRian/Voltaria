"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ChatWidgetState = {
  isOpen: boolean;
  // Sessão de atendimento humano ativa (se houver) — sobrevive a um refresh da
  // página, diferente da navegação pelo menu do bot (que é só estado local).
  sessionId: string | null;
  unread: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSession: (sessionId: string) => void;
  clearSession: () => void;
  setUnread: (unread: boolean) => void;
};

export const useChatWidget = create<ChatWidgetState>()(
  persist(
    (set) => ({
      isOpen: false,
      sessionId: null,
      unread: false,
      open: () => set({ isOpen: true, unread: false }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen, unread: state.isOpen ? state.unread : false })),
      setSession: (sessionId) => set({ sessionId }),
      clearSession: () => set({ sessionId: null, unread: false }),
      setUnread: (unread) => set({ unread }),
    }),
    { name: "heca-chat-widget" }
  )
);
