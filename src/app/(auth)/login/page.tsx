import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  const googleEnabled = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold">Bem-vindo de volta</h1>
      <p className="mb-6 text-sm text-ink-soft">Entre para acompanhar seus pedidos.</p>
      <LoginForm googleEnabled={googleEnabled} />
    </div>
  );
}
