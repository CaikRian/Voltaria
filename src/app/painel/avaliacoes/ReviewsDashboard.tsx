import Link from "next/link";
import { getAdminReviews } from "@/lib/admin";
import { toggleReviewVisibility } from "@/lib/actions/reviews";
import { StarRating } from "@/components/StarRating";
import { ToggleVisibilityButton } from "../ToggleVisibilityButton";

export type ReviewFilters = { q?: string; rating?: string; visibility?: string; sort?: string; page?: string; pageSize?: string };

function url(current: ReviewFilters, changes: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries({ ...current, ...changes }).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") query.set(key, String(value));
  });
  return `/painel/avaliacoes?${query}`;
}

function date(value: Date) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export async function ReviewsDashboard({ filters }: { filters: ReviewFilters }) {
  const pageSize = [10, 20, 30].includes(Number(filters.pageSize)) ? Number(filters.pageSize) : 10;
  const rating = ["1", "2", "3", "4", "5"].includes(filters.rating ?? "") ? Number(filters.rating) : undefined;
  const result = await getAdminReviews({
    q: filters.q,
    rating,
    visibility: filters.visibility as never,
    sort: filters.sort as never,
    page: Math.max(Number(filters.page) || 1, 1),
    pageSize,
  });
  const page = Math.min(result.page, result.pageCount);
  const current = { ...filters, pageSize: String(pageSize) };
  const from = result.total ? (page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(page * result.pageSize, result.total);
  const filtered = filters.q || filters.rating || (filters.visibility && filters.visibility !== "all");

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-amber-700 p-6 text-white shadow-pop sm:p-7">
        <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-white/50">Reputação da loja</p>
            <h1 className="mt-2 font-display text-3xl font-bold">Avaliações</h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">Modere comentários, encontre notas baixas rapidamente e acompanhe a média geral da loja.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Nota média" value={result.avgRating.toFixed(1)} />
            <Metric label="Total" value={String(result.totalAll)} />
            <Metric label="Ocultas" value={String(result.hiddenCount)} />
          </div>
        </div>
      </section>

      <section className="rounded-xl2 border border-line bg-paper p-4 shadow-card sm:p-5">
        <form className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(2,minmax(150px,1fr))_auto]">
          <input name="q" defaultValue={filters.q} placeholder="Comentário, produto ou cliente..." className="h-11 w-full rounded-xl border border-line bg-mist px-4 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10" />
          <select name="rating" defaultValue={filters.rating ?? ""} className="h-11 rounded-xl border border-line bg-white px-3 text-sm">
            <option value="">Todas as notas</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrela{n === 1 ? "" : "s"}</option>)}
          </select>
          <select name="visibility" defaultValue={filters.visibility ?? "all"} className="h-11 rounded-xl border border-line bg-white px-3 text-sm">
            <option value="all">Visíveis e ocultas</option>
            <option value="visible">Só visíveis</option>
            <option value="hidden">Só ocultas</option>
          </select>
          <button className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-dark">Filtrar</button>
          <div className="flex flex-wrap items-center gap-2 lg:col-span-4">
            <span className="mr-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Ordenar:</span>
            {[["recent", "Recentes"], ["oldest", "Antigas"], ["highest", "Maior nota"], ["lowest", "Menor nota"]].map(([value, label]) => (
              <Link key={value} href={url(current, { sort: value, page: 1 })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${(filters.sort ?? "recent") === value ? "bg-slate-900 text-white" : "bg-mist text-ink-soft hover:bg-line"}`}>{label}</Link>
            ))}
            {filtered && <Link href="/painel/avaliacoes" className="ml-auto text-xs font-semibold text-brand hover:underline">Limpar filtros</Link>}
          </div>
        </form>
      </section>

      {!result.reviews.length ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line bg-paper py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-mist text-xl">★</div>
          <p className="mt-3 font-semibold">Nenhuma avaliação encontrada</p>
          <p className="mt-1 text-sm text-ink-muted">Tente remover algum filtro ou buscar por outro termo.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.reviews.map((r) => (
            <li key={r.id} className="rounded-xl2 border border-line bg-paper p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/produtos/${r.product.slug}`} className="text-sm font-medium text-brand hover:underline">{r.product.name}</Link>
                  <p className="text-xs text-ink-muted">
                    {r.user.name ?? r.user.email} · {date(r.createdAt)}
                    {r.hidden && <span className="ml-2 rounded bg-deal/10 px-1.5 py-0.5 text-[10px] font-medium text-deal">oculta</span>}
                  </p>
                </div>
                <ToggleVisibilityButton id={r.id} hidden={r.hidden} action={toggleReviewVisibility} />
              </div>
              <div className="mt-2"><StarRating value={r.rating} /></div>
              {r.comment && <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>}
            </li>
          ))}
        </ul>
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

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-[10px] uppercase tracking-wide text-white/55">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  return <Link aria-label={label} href={href} className={`grid h-9 w-9 place-items-center rounded-lg border border-line ${disabled ? "pointer-events-none opacity-35" : "hover:border-brand hover:text-brand"}`}>{children}</Link>;
}
