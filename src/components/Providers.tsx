"use client";

import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "motion/react";

// Disponibiliza a sessão para componentes client (ex.: botão de conta no header).
// MotionConfig com reducedMotion="user" faz toda animação motion.* no app respeitar
// o prefers-reduced-motion do SO automaticamente — sem precisar tratar caso a caso.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SessionProvider>
  );
}
