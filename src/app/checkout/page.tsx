import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getAddressesByUser } from "@/lib/addresses";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const addresses = user ? await getAddressesByUser(user.id) : [];

  return (
    <div className="container-x py-10">
      <h1 className="mb-6 font-display text-3xl font-semibold">Finalizar compra</h1>
      <CheckoutForm
        contactDefaults={{ name: user?.name ?? "", email: user?.email ?? "" }}
        addresses={addresses}
        isLoggedIn={!!user}
      />
    </div>
  );
}
