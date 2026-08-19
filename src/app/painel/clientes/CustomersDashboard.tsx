import Link from "next/link";
import { getAdminCustomers } from "@/lib/admin";
import { formatBRL } from "@/lib/format";

export type CustomerFilters = { q?: string; sort?: string; page?: string; pageSize?: string };

function url(current: CustomerFilters, changes: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries({ ...current, ...changes }).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") query.set(key, String(value));
  });
  return `/painel/clientes?${query}`;
}

function initials(name: string | null, email: string) {
  return (name ?? email).trim().charAt(0).toUpperCase();
}

function lastAccessLabel(value: Date | null) {
  if (!value) return "Nunca acessou";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Acessou hoje";
  if (days === 1) return "Acessou ontem";
  if (days < 30) return `Há ${days} dias`;
  const months = Math.floor(days / 30);
  return `Há ${months} ${months === 1 ? "mês" : "meses"}`;
}

export async function CustomersDashboard({ filters }: { filters: CustomerFilters }) {
  const pageSize = [12, 24, 48].includes(Number(filters.pageSize)) ? Number(filters.pageSize) : 12;
  const result = await getAdminCustomers({
    q: filters.q,
    sort: filters.sort as never,
    page: Math.max(Number(filters.page) || 1, 1),
    pageSize,
  });
  const page = Math.min(result.page, result.pageCount);
  const current = { ...filters, pageSize: String(pageSize) };
  const from = result.total ? (page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(page * result.pageSize, result.total);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-brand p-6 text-white shadow-pop sm:p-7">
        <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-indigo-400/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-white/50">Relacionamento</p>
            <h1 className="mt-2 font-display text-3xl font-bold">Central de clientes</h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              Conheça quem compra na loja, acompanhe o histórico de cada um e encontre um jeito rápido de entrar em contato.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur">
            <p className="text-[10px] uppercase tracking-wide text-white/55">Clientes cadastrados</p>
            <p className="mt-1 text-xl font-bold">{result.total}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl2 border border-line bg-paper p-4 shadow-card sm:p-5">
        <form className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto]">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Nome, e-mail ou telefone..."
            className="h-11 w-full rounded-xl border border-line bg-mist px-4 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
          />
          <button className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-dark">Buscar</button>
          <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
            <span className="mr-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Ordenar:</span>
            {[["recent", "Recentes"], ["orders", "Mais pedidos"], ["lastAccess", "Último acesso"]].map(([value, label]) => (
              <Link
                key={value}
                href={url(current, { sort: value, page: 1 })}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${(filters.sort ?? "recent") === value ? "bg-slate-900 text-white" : "bg-mist text-ink-soft hover:bg-line"}`}
              >
                {label}
              </Link>
            ))}
            {filters.q && <Link href="/painel/clientes" className="ml-auto text-xs font-semibold text-brand hover:underline">Limpar busca</Link>}
          </div>
        </form>
      </section>

      {!result.customers.length ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line bg-paper py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-mist text-xl">☺</div>
          <p className="mt-3 font-semibold">Nenhum cliente encontrado</p>
          <p className="mt-1 text-sm text-ink-muted">Tente buscar por outro nome, e-mail ou telefone.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/painel/clientes/${customer.id}`}
              className="group flex flex-col gap-3 rounded-xl2 border border-line bg-paper p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand hover:shadow-pop"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-gradient-to-br from-brand to-indigo-600 text-base font-bold text-white">
                  {initials(customer.name, customer.email)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{customer.name ?? "Sem nome"}</p>
                  <p className="truncate text-xs text-ink-muted">{customer.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand">{customer._count.orders} pedido{customer._count.orders === 1 ? "" : "s"}</span>
                <span className="rounded-full bg-mist px-2.5 py-1 font-medium text-ink-soft">{lastAccessLabel(customer.lastLoginAt)}</span>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ink-muted">Total gasto</p>
                  <p className="text-sm font-bold text-ink">{formatBRL(customer.totalSpentCents)}</p>
                </div>
                <span className="text-xl text-ink-muted transition group-hover:translate-x-1 group-hover:text-brand">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <nav className="flex flex-col gap-3 rounded-xl2 border border-line bg-paper px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between" aria-label="Paginação">
        <p className="text-sm text-ink-muted">Mostrando <strong className="text-ink">{from}–{to}</strong> de <strong className="text-ink">{result.total}</strong></p>
        <div className="flex items-center justify-between gap-2">
          <PageLink label="Primeira" disabled={page <= 1} href={url(current, { page: 1 })}>«</PageLink>
          <PageLink label="Anterior" disabled={page <= 1} href={url(current, { page: Math.max(1, page - 1) })}>‹</PageLink>
          <span className="min-w-28 text-center text-sm font-semibold">Página {page} de {result.pageCount}</span>
          <PageLink label="Próxima" disabled={page >= result.pageCount} href={url(current, { page: Math.min(result.pageCount, page + 1) })}>›</PageLink>
          <PageLink label="Última" disabled={page >= result.pageCount} href={url(current, { page: result.pageCount })}>»</PageLink>
        </div>
      </nav>
    </div>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  return (
    <Link aria-label={label} href={href} className={`grid h-9 w-9 place-items-center rounded-lg border border-line ${disabled ? "pointer-events-none opacity-35" : "hover:border-brand hover:text-brand"}`}>
      {children}
    </Link>
  );
}
