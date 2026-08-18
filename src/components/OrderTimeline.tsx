import { STATUS_META, type OrderStatus } from "@/lib/order-status";

type StatusEvent = {
  id: string;
  status: string;
  note?: string | null;
  createdAt: Date | string;
};

const MAIN_FLOW: Array<{
  status: OrderStatus;
  label: string;
  pendingLabel: string;
  description: string;
}> = [
  {
    status: "AGUARDANDO_PAGAMENTO",
    label: "Pedido realizado",
    pendingLabel: "Aguardando pagamento",
    description: "O pedido foi recebido e aguarda a confirmação do Mercado Pago.",
  },
  {
    status: "PAGAMENTO_APROVADO",
    label: "Pagamento confirmado",
    pendingLabel: "Aguardando confirmação",
    description: "Pagamento confirmado com segurança pelo Mercado Pago.",
  },
  {
    status: "PREPARANDO_ENVIO",
    label: "Produto em preparação",
    pendingLabel: "Aguardando preparação",
    description: "Os produtos serão separados, conferidos e embalados.",
  },
  {
    status: "ENVIADO",
    label: "Em rota de entrega",
    pendingLabel: "Aguardando envio",
    description: "O pacote foi entregue à transportadora e está a caminho.",
  },
  {
    status: "ENTREGUE",
    label: "Produto entregue",
    pendingLabel: "Aguardando entrega",
    description: "Entrega concluída no endereço informado.",
  },
];

const NEXT_STEP: Partial<Record<OrderStatus, string>> = {
  AGUARDANDO_PAGAMENTO: "Assim que o Mercado Pago confirmar, iniciaremos a preparação.",
  PAGAMENTO_APROVADO: "Próximo passo: separar, conferir e embalar seus produtos.",
  PREPARANDO_ENVIO: "Próximo passo: entregar o pacote à transportadora.",
  ENVIADO: "Seu pedido está a caminho. A próxima atualização será a entrega.",
  ENTREGUE: "Pedido concluído. Você já pode avaliar os produtos.",
  PAGAMENTO_RECUSADO: "Você pode tentar novamente com outro meio de pagamento.",
  REEMBOLSO_SOLICITADO: "A equipe analisará a solicitação e informará a conclusão.",
  REEMBOLSADO: "O reembolso foi concluído pelo meio de pagamento utilizado.",
  CANCELADO: "Este pedido foi encerrado e não seguirá para preparação.",
};

function formatEventDate(value: Date | string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTimeline({
  status,
  events,
  createdAt,
}: {
  status: string;
  events: StatusEvent[];
  createdAt: Date | string;
}) {
  const currentStatus = status as OrderStatus;
  const currentIndex = MAIN_FLOW.findIndex((step) => step.status === currentStatus);
  const reachedStatuses = new Set(events.map((event) => event.status));
  reachedStatuses.add(currentStatus);

  // Um único horário por etapa deixa a leitura clara mesmo em pedidos antigos
  // que já tenham eventos duplicados.
  const dateByStatus = new Map<string, Date | string>();
  for (const event of events) {
    if (!dateByStatus.has(event.status)) dateByStatus.set(event.status, event.createdAt);
  }
  dateByStatus.set("AGUARDANDO_PAGAMENTO", dateByStatus.get("AGUARDANDO_PAGAMENTO") ?? createdAt);

  const furthestReached = MAIN_FLOW.reduce(
    (furthest, step, index) => (reachedStatuses.has(step.status) ? Math.max(furthest, index) : furthest),
    0
  );
  const isException = currentIndex < 0;
  const progressIndex = currentIndex >= 0
    ? currentIndex
    : Math.min(furthestReached + 1, MAIN_FLOW.length);
  const notes = events.filter(
    (event, index, list) =>
      event.note &&
      list.findIndex((candidate) => candidate.status === event.status && candidate.note === event.note) === index
  );

  return (
    <div className="rounded-xl2 border border-line bg-paper p-5 sm:p-6">
      <div className="mb-6">
        <p className="text-base font-semibold">Acompanhe seu pedido</p>
        <p className="mt-1 text-sm text-ink-muted">Veja o que já aconteceu e quais são os próximos passos.</p>
      </div>

      {isException && (
        <div className="mb-6 rounded-xl border border-line bg-mist px-4 py-3">
          <p className="text-sm font-semibold">
            {STATUS_META[currentStatus]?.label ?? currentStatus}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {STATUS_META[currentStatus]?.description}
          </p>
        </div>
      )}

      <ol>
        {MAIN_FLOW.map((step, index) => {
          const completed = index < progressIndex || (currentStatus === "ENTREGUE" && index === progressIndex);
          const active = !isException && index === progressIndex && !completed;
          const reached = completed || active;
          const date = dateByStatus.get(step.status);

          return (
            <li key={step.status} className="relative grid grid-cols-[32px_1fr] gap-3 pb-7 last:pb-0">
              {index < MAIN_FLOW.length - 1 && (
                <span
                  className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${
                    index < progressIndex ? "bg-brand" : "bg-line"
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  completed
                    ? "border-brand bg-brand text-white"
                    : active
                      ? "border-brand bg-brand-soft text-brand-dark"
                      : "border-line bg-paper text-ink-muted"
                }`}
              >
                {completed ? "✓" : index + 1}
              </span>
              <div className="pt-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={`text-sm font-semibold ${reached ? "text-ink" : "text-ink-muted"}`}>
                    {reached ? step.label : step.pendingLabel}
                  </p>
                  {date && <time className="text-xs text-ink-muted">{formatEventDate(date)}</time>}
                </div>
                <p className={`mt-1 text-sm ${reached ? "text-ink-soft" : "text-ink-muted"}`}>
                  {step.description}
                </p>
                {active && (
                  <span className="mt-2 inline-flex rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">
                    Etapa atual
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {NEXT_STEP[currentStatus] && (
        <div className="mt-6 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          <span className="font-semibold">O que acontece agora? </span>
          {NEXT_STEP[currentStatus]}
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Atualizações</p>
          <ul className="space-y-2 text-sm text-ink-soft">
            {notes.map((event) => (
              <li key={event.id}>
                <span className="font-medium">{STATUS_META[event.status as OrderStatus]?.label ?? event.status}:</span>{" "}
                {event.note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
