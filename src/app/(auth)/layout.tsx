import Link from "next/link";

// Layout enxuto para telas de auth: cartão centralizado, sem distrações.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-x flex min-h-[calc(100vh-7rem)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-display font-bold text-white">
            V
          </span>
          <span className="font-display text-xl font-semibold">Voltaria</span>
        </Link>
        <div className="rounded-xl2 border border-line bg-paper p-6 shadow-card sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
