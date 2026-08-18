import type { Metadata } from "next";
import { OrderStatusView } from "../OrderStatusView";

export const metadata: Metadata = { title: "Pagamento não aprovado — Voltaria" };

type SearchParams = Promise<{ order?: string }>;

export default async function CheckoutErroPage({ searchParams }: { searchParams: SearchParams }) {
  const { order } = await searchParams;

  return (
    <div className="container-x py-16">
      {/* Sem clearCart: o comprador pode tentar de novo com os mesmos itens. */}
      <OrderStatusView orderId={order} />
    </div>
  );
}
