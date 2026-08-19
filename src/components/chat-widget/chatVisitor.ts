"use client";

// Mesma técnica de WebAnalyticsTracker.tsx (identifier(storage, key)), mas numa
// chave própria e sem depender do consentimento de analytics — isso aqui é
// funcional (precisa existir pro chat funcionar), não é rastreamento.
const CHAT_VISITOR_KEY = "heca-chat-visitor-v1";

export function getChatVisitorId(): string {
  let value = localStorage.getItem(CHAT_VISITOR_KEY);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(CHAT_VISITOR_KEY, value);
  }
  return value;
}
