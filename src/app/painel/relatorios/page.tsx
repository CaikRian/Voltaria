import type { Metadata } from "next";
import Link from "next/link";
import { getReports, REPORT_PERIODS, type ReportPeriod } from "@/lib/reports";
import { formatBRL } from "@/lib/format";
import { STATUS_META, type OrderStatus } from "@/lib/order-status";
import { ExportMenu } from "./ExportMenu";

export const metadata: Metadata = { title: "Relatórios · Painel" };
type SearchParams = Promise<{ period?: string }>;
const periodLabels: Record<ReportPeriod, string> = { "7": "7 dias", "30": "30 dias", "90": "90 dias", "365": "12 meses", all: "Todo o histórico" };

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const requested = (await searchParams).period as ReportPeriod;
  const period = REPORT_PERIODS.includes(requested) ? requested : "30";
  const report = await getReports(period); const maxDay = Math.max(...report.daily.map((day) => day.revenueCents), 1); const maxStatus = Math.max(...report.status.map(([, count]) => count), 1);
  const conversion = report.orders.length ? (report.confirmed.length / report.orders.length) * 100 : 0;
  const cards = [
    { label: "Faturamento confirmado", value: formatBRL(report.revenue), detail: `${report.confirmed.length} vendas`, tone: "brand" },
    { label: "Ticket médio", value: formatBRL(report.averageTicket), detail: "por pedido confirmado", tone: "emerald" },
    { label: "Conversão de pedidos", value: `${conversion.toFixed(1)}%`, detail: `${report.orders.length} pedidos criados`, tone: "violet" },
    { label: "Novos clientes", value: String(report.newCustomers), detail: `nos últimos ${periodLabels[period]}`, tone: "amber" },
  ];
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-brand-dark to-brand p-6 text-white shadow-pop sm:p-8"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/55">Inteligência da operação</p><h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Relatórios e desempenho</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Transforme vendas, estoque e atendimento em decisões claras. Todos os números são calculados diretamente dos dados da loja.</p></div><div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur"><p className="text-xs text-white/55">Período analisado</p><p className="font-display text-xl font-semibold">{periodLabels[period]}</p><p className="text-xs text-white/55">Atualizado em {report.generatedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</p></div></div></section>

    <nav className="flex gap-2 overflow-x-auto pb-1">{REPORT_PERIODS.map((value) => <Link key={value} href={`/painel/relatorios?period=${value}`} className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold ${period === value ? "border-brand bg-brand text-white shadow-card" : "border-line bg-paper hover:border-brand hover:text-brand"}`}>{periodLabels[value]}</Link>)}</nav>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{card.label}</p><p className="mt-3 font-display text-3xl font-bold">{card.value}</p><p className="mt-1 text-xs text-ink-muted">{card.detail}</p></div>)}</div>

    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><div><h3 className="font-display text-lg font-semibold">Evolução das vendas</h3><p className="text-xs text-ink-muted">Faturamento confirmado por dia — últimos 31 pontos</p></div>{report.daily.length ? <div className="mt-6 flex h-56 items-end gap-1.5 overflow-hidden border-b border-line px-1">{report.daily.map((day) => <div key={day.date} className="group relative flex h-full min-w-3 flex-1 items-end"><div style={{ height: `${Math.max(5, day.revenueCents / maxDay * 100)}%` }} className="w-full rounded-t-md bg-gradient-to-t from-brand-dark to-brand transition hover:from-violet-700 hover:to-violet-400"><span className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white shadow-pop group-hover:block">{day.date} · {formatBRL(day.revenueCents)} · {day.orders} pedido(s)</span></div></div>)}</div> : <Empty text="Nenhuma venda confirmada neste período." />}</section>
      <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><h3 className="font-display text-lg font-semibold">Situação dos pedidos</h3><p className="text-xs text-ink-muted">Distribuição por status atual</p><div className="mt-5 space-y-4">{report.status.slice(0, 7).map(([status, count]) => <div key={status}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate font-medium">{STATUS_META[status as OrderStatus]?.label ?? status}</span><strong>{count}</strong></div><div className="h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-brand" style={{ width: `${count / maxStatus * 100}%` }} /></div></div>)}</div></section>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><div className="flex items-center justify-between"><div><h3 className="font-display text-lg font-semibold">Produtos campeões</h3><p className="text-xs text-ink-muted">Ordenados pelo faturamento</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">Top 5</span></div><div className="mt-4 space-y-2">{report.topProducts.slice(0, 5).map((product, index) => <div key={product.product} className="flex items-center gap-3 rounded-xl bg-mist p-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand font-display font-bold text-white">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.product}</p><p className="text-xs text-ink-muted">{product.quantity} unidade(s)</p></div><strong className="text-sm">{formatBRL(product.revenueCents)}</strong></div>)}{!report.topProducts.length && <Empty text="Nenhum produto vendido." />}</div></section>
      <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><div className="flex items-center justify-between"><div><h3 className="font-display text-lg font-semibold">Estoque que exige atenção</h3><p className="text-xs text-ink-muted">Produtos ativos com menor saldo</p></div><Link href="/painel/produtos" className="text-xs font-bold text-brand hover:underline">Gerenciar</Link></div><div className="mt-4 space-y-2">{report.inventory.filter((item) => item.active === "Ativo").slice(0, 5).map((item) => <div key={item.product} className="flex items-center gap-3 rounded-xl border border-line p-3"><span className={`grid h-9 min-w-9 place-items-center rounded-xl px-2 text-xs font-bold ${item.stock === 0 ? "bg-red-100 text-red-800" : item.stock <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{item.stock}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.product}</p><p className="text-xs text-ink-muted">{item.category}</p></div><span className="text-xs text-ink-muted">{formatBRL(item.priceCents)}</span></div>)}</div></section>
    </div>

    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><h3 className="font-display text-lg font-semibold">Atendimento e reputação</h3><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Nota média" value={report.ratingAverage ? `${report.ratingAverage.toFixed(1)} ★` : "—"} /><Metric label="Avaliações" value={String(report.reviews)} /><Metric label="Dúvidas" value={String(report.questions)} /><Metric label="Sem resposta" value={String(report.unansweredQuestions)} /><Metric label="Cancelados" value={String(report.cancelled)} /><Metric label="Reembolsos" value={String(report.refunds)} /></div></section>
      <ExportMenu period={period} />
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-mist p-3"><p className="text-xs text-ink-muted">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="mt-5 rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">{text}</div>; }
