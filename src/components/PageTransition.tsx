"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";

// Fade+slide sutil na troca de rota. Sem AnimatePresence de propósito: com
// mode="wait" a navegação ficaria travada até a página antiga terminar de sair;
// com mode="sync" as duas ficariam sobrepostas por instantes com risco de pulo
// de layout. Animar só a entrada evita os dois problemas e ainda deixa a
// navegação visivelmente mais suave.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
