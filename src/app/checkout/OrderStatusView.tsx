import { getOrderById } from "@/lib/orders";
import { formatBRL } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { STATUS_META, ORDER_STATUS } from "@/lib/order-status";
import { ClearCartOnMount } from "./ClearCartOnMount";

// Mapeamento simples pra páginas de retorno do checkout
const CHECKOUT_MESSAGES: Record<string, { title: string; desc: string }> = {
  [ORDER_STATUS.PAGAMENTO_APROVADO]: {
    title: "Pagamento aprovado!",
    desc: "Seu pedido foi confirmado e já está sendo preparado.",
  },
  [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: {
    title: "Pagamento em processamento",
    desc: "PIX e boleto podem levar um tempo para confirmar — atualizamos seu pedido automaticamente assim que a Mercado Pago nos avisar.",
  },
  [ORDER_STATUS.PAGAMENTO_RECUSADO]: {
    title: "Pagamento não aprovado",
    desc: "Não foi possível concluir o pagamento. Você pode tentar novamente.",
  },
  [ORDER_STATUS.CANCELADO]: {
    title: "Pedido cancelado",
    desc: "Este pedido foi cancelado.",
  },
};

// Mostra o estado do pedido gravado no BANCO (fonte de verdade = webhook),
// nunca o status vindo pela query string do redirecionamento da Mercado Pago.
export async function OrderStatusView({
  orderId,
  clearCart,
}: {
  orderId?: string;
  clearCart?: boolean;
}) {
  const order = orderId ? await getOrderById(orderId) : null;

  if (!order) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-2 font-display text-2xl font-semibold">Pedido não encontrado</h1>
        <p className="mb-6 text-sm text-ink-soft">Verifique o link ou tente novamente.</p>
        <ButtonLink href="/produtos">Continuar comprando</ButtonLink>
      </div>
    );
  }

  const message = CHECKOUT_MESSAGES[order.status] ?? {
    title: STATUS_META[order.status as keyof typeof STATUS_META]?.label || "Status do pedido",
    desc: STATUS_META[order.status as keyof typeof STATUS_META]?.description || `Status atual: ${order.status}`,
  };

  return (
    <div className="mx-auto max-w-md text-center">
      {clearCart && <ClearCartOnMount />}
      <h1 className="mb-2 font-display text-2xl font-semibold">{message.title}</h1>
      <p className="mb-6 text-sm text-ink-soft">{message.desc}</p>
      <p className="mb-6 text-sm">
        Pedido #{order.id.slice(-8)} · {formatBRL(order.totalCents)}
      </p>
      <ButtonLink href="/produtos">Continuar comprando</ButtonLink>
    </div>
  );
}
