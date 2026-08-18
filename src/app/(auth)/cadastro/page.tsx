import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold">Criar sua conta</h1>
      <p className="mb-6 text-sm text-ink-soft">É rápido e grátis.</p>
      <RegisterForm />
    </div>
  );
}
