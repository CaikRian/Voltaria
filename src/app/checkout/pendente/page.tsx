import type { Metadata } from "next";
import { OrderStatusView } from "../OrderStatusView";

export const metadata: Metadata = { title: "Pagamento em processamento — Voltaria" };

type SearchParams = Promise<{ order?: string }>;

export default async function CheckoutPendentePage({ searchParams }: { searchParams: SearchParams }) {
  const { order } = await searchParams;

  return (
    <div className="container-x py-16">
      <OrderStatusView orderId={order} clearCart />
    </div>
  );
}
