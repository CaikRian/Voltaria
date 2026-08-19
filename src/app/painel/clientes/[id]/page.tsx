import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCustomer } from "@/lib/admin";
import { requireCapability } from "@/lib/auth-helpers";
import { formatBRL, formatPhone, whatsappLink } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { StarRating } from "@/components/StarRating";

export const metadata: Metadata = { title: "Cliente · Painel" };

type Params = Promise<{ id: string }>;

function dateTime(value: Date | string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

function date(value: Date | string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function lastAccessLabel(value: Date | null) {
  if (!value) return "Nunca acessou a conta";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return `Acessou hoje às ${new Date(value).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1) return "Acessou ontem";
  if (days < 30) return `Último acesso há ${days} dias`;
  return `Último acesso em ${date(value)}`;
}

export default async function PainelClientePage({ params }: { params: Params }) {
  await requireCapability("customer:view");
  const { id } = await params;
  const customer = await getAdminCustomer(id);
  if (!customer) notFound();

  const allMessages = customer.orders
    .flatMap((order) => order.messages.map((message) => ({ ...message, orderId: order.id })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  const initial = (customer.name ?? customer.email).trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-brand p-6 text-white shadow-pop sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-400/25 blur-2xl" />
        <div className="relative">
          <Link href="/painel/clientes" className="text-sm font-medium text-white/70 hover:text-white">← Voltar para clientes</Link>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 flex-none place-items-center rounded-3xl bg-white/15 text-2xl font-bold backdrop-blur">{initial}</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Perfil do cliente</p>
                <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{customer.name ?? "Sem nome"}</h2>
                <p className="mt-1 text-sm text-white/70">Cliente desde {date(customer.createdAt)} · {lastAccessLabel(customer.lastLoginAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Pedidos" value={String(customer.totalOrders)} />
        <Stat label="Total gasto" value={formatBRL(customer.totalSpentCents)} />
        <Stat label="Avaliações" value={String(customer.reviews.length)} />
        <Stat label="Dúvidas" value={String(customer.questions.length)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card title="Pedidos">
            {customer.orders.length === 0 ? (
              <Empty text="Este cliente ainda não fez nenhum pedido." />
            ) : (
              <ul className="divide-y divide-line">
                {customer.orders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/painel/pedidos/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 transition hover:opacity-80">
                      <div>
                        <span className="font-mono text-sm font-bold text-brand">#{order.id.slice(-8)}</span>
                        <p className="mt-0.5 text-xs text-ink-muted">{date(order.createdAt)} · {order.items.length} item(ns)</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{formatBRL(order.totalCents)}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Conversas">
            {allMessages.length === 0 ? (
              <Empty text="Nenhuma mensagem trocada com este cliente ainda." />
            ) : (
              <ul className="flex flex-col gap-3">
                {allMessages.map((message) => (
                  <li key={message.id} className="rounded-xl bg-mist p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${message.senderRole === "CLIENTE" ? "text-brand" : "text-ink"}`}>
                        {message.senderRole === "CLIENTE" ? "Cliente" : "Equipe"}
                      </span>
                      <Link href={`/painel/pedidos/${message.orderId}#chat`} className="text-[11px] font-medium text-ink-muted hover:text-brand">
                        Pedido #{message.orderId.slice(-8)} · {dateTime(message.createdAt)}
                      </Link>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{message.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Avaliações">
            {customer.reviews.length === 0 ? (
              <Empty text="Este cliente ainda não avaliou nenhum produto." />
            ) : (
              <ul className="flex flex-col gap-3">
                {customer.reviews.map((review) => (
                  <li key={review.id} className="rounded-xl bg-mist p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/produtos/${review.product.slug}`} className="text-sm font-medium text-brand hover:underline">{review.product.name}</Link>
                      <span className="text-[11px] text-ink-muted">{date(review.createdAt)}{review.hidden && " · oculta"}</span>
                    </div>
                    <div className="mt-1"><StarRating value={review.rating} /></div>
                    {review.comment && <p className="mt-1 text-sm text-ink-soft">{review.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Dúvidas">
            {customer.questions.length === 0 ? (
              <Empty text="Este cliente ainda não fez nenhuma pergunta." />
            ) : (
              <ul className="flex flex-col gap-3">
                {customer.questions.map((question) => (
                  <li key={question.id} className="rounded-xl bg-mist p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/produtos/${question.product.slug}`} className="text-sm font-medium text-brand hover:underline">{question.product.name}</Link>
                      <span className="text-[11px] text-ink-muted">{date(question.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm">{question.question}</p>
                    {question.answer && <p className="mt-1 text-sm text-ink-soft">↳ {question.answer}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <Card title="Contato">
            <div className="flex flex-col gap-2">
              <a href={`mailto:${customer.email}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white hover:bg-ink-soft">
                ✉ E-mail
              </a>
              {customer.phone && (
                <a href={whatsappLink(customer.phone)} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700">
                  ✆ WhatsApp
                </a>
              )}
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="E-mail" value={customer.email} />
              {customer.phone && <Row label="Telefone" value={formatPhone(customer.phone)} />}
              <Row label="Aceita e-mail" value={customer.allowEmailUpdates ? "Sim" : "Não"} />
              <Row label="Aceita WhatsApp" value={customer.allowWhatsappUpdates ? "Sim" : "Não"} />
            </dl>
          </Card>

          <Card title="Cadastro">
            <dl className="space-y-2 text-sm">
              <Row label="Cliente desde" value={date(customer.createdAt)} />
              <Row label="E-mail verificado" value={customer.emailVerified ? "Sim" : "Não"} />
              {customer.referralSource && <Row label="Como conheceu a loja" value={customer.referralSource} />}
              {customer.cpfMasked && <Row label="CPF" value={customer.cpfMasked} />}
            </dl>
          </Card>

          <Card title="Endereços">
            {customer.addresses.length === 0 ? (
              <Empty text="Nenhum endereço salvo." />
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {customer.addresses.map((address) => (
                  <li key={address.id} className="rounded-xl bg-mist p-3">
                    <p className="font-semibold">{address.label}{address.isDefault && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">padrão</span>}</p>
                    <p className="mt-1 text-ink-soft">{address.street}, {address.number}{address.complement ? ` · ${address.complement}` : ""}</p>
                    <p className="text-ink-soft">{address.neighborhood} · {address.city}/{address.state}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl2 border border-line bg-paper p-4 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
      <h3 className="mb-3 font-display text-base font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-ink-muted">{text}</p>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
