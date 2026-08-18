"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

// Limpa o carrinho quando o comprador chega numa tela de retorno cujo pedido
// já foi criado no servidor (sucesso/pendente). Roda uma vez, silencioso.
export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
