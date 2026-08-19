"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { getShippingOptions, normalizeCep } from "@/lib/shipping";
import { formatBRL } from "@/lib/format";

type Bubble = { id: string; from: "bot" | "user"; node: React.ReactNode };
type Screen = "menu" | "produtos" | "frete" | "atendimento";
type Contexto = {
  categories: { name: string; slug: string; icon: string | null }[];
  featured: { name: string; slug: string; priceCents: number; compareCents: number | null }[];
};

const MENU_ITEMS = [
  { id: "produtos", label: "📦 Produtos" },
  { id: "frete", label: "🚚 Frete e prazo" },
  { id: "pagamento", label: "💳 Pagamento" },
  { id: "promocoes", label: "🏷️ Promoções" },
  { id: "trocas", label: "🔄 Trocas, devolução ou reclamação" },
  { id: "empresa", label: "🏢 Sobre a loja" },
  { id: "rastreio", label: "📍 Rastrear pedido" },
  { id: "atendimento", label: "🗣️ Falar com atendente" },
] as const;

let uid = 0;
function nextId() { uid += 1; return `b${uid}`; }

export function BotMenu({
  loggedIn,
  onEscalate,
}: {
  loggedIn: boolean;
  onEscalate: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [transcript, setTranscript] = useState<Bubble[]>([
    { id: nextId(), from: "bot", node: "Oi! Eu sou a Bia 👋 Assistente virtual da Heca - Store. Como posso ajudar?" },
  ]);
  const [ctx, setCtx] = useState<Contexto | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [transcript, screen]);

  function push(entries: Omit<Bubble, "id">[]) {
    setTranscript((t) => [...t, ...entries.map((e) => ({ ...e, id: nextId() }))]);
  }

  async function loadContexto(): Promise<Contexto> {
    if (ctx) return ctx;
    try {
      const res = await fetch("/api/chat/contexto");
      const data = (await res.json()) as Contexto;
      setCtx(data);
      return data;
    } catch {
      const empty = { categories: [], featured: [] };
      setCtx(empty);
      return empty;
    }
  }

  async function handleSelect(item: (typeof MENU_ITEMS)[number]) {
    push([{ from: "user", node: item.label }]);
    switch (item.id) {
      case "pagamento":
        push([{ from: "bot", node: <PagamentoAnswer /> }]);
        return;
      case "trocas":
        push([{ from: "bot", node: <TrocasAnswer onEscalate={() => setScreen("atendimento")} /> }]);
        return;
      case "empresa":
        push([{ from: "bot", node: <EmpresaAnswer /> }]);
        return;
      case "rastreio":
        push([{ from: "bot", node: <RastreioAnswer loggedIn={loggedIn} /> }]);
        return;
      case "produtos":
        setScreen("produtos");
        push([{ from: "bot", node: "Me conta o que você procura (ex.: \"fone bluetooth\") que eu busco pra você." }]);
        return;
      case "frete":
        setScreen("frete");
        push([{ from: "bot", node: "Me diz o CEP de entrega que eu calculo o prazo e o valor certinhos." }]);
        return;
      case "promocoes": {
        const data = await loadContexto();
        push([{ from: "bot", node: <PromocoesAnswer featured={data.featured} /> }]);
        return;
      }
      case "atendimento":
        setScreen("atendimento");
        return;
    }
  }

  async function handleProductSearch(q: string) {
    if (q.trim().length < 2) return;
    push([{ from: "user", node: q }]);
    try {
      const res = await fetch(`/api/produtos/sugestoes?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.products?.length) {
        push([{ from: "bot", node: <ProductResults products={data.products} /> }]);
      } else {
        const data2 = await loadContexto();
        push([{ from: "bot", node: <NoProductResults categories={data2.categories} /> }]);
      }
    } catch {
      push([{ from: "bot", node: "Não consegui buscar agora. Dá uma olhada em todos os produtos:" }, { from: "bot", node: <Link href="/produtos" className="text-sm font-semibold text-brand hover:underline">Ver catálogo completo →</Link> }]);
    }
    setScreen("menu");
  }

  function handleCep(cep: string) {
    push([{ from: "user", node: cep }]);
    const digits = normalizeCep(cep);
    if (!digits) {
      push([{ from: "bot", node: "Esse CEP não parece válido — são 8 dígitos, tipo 01310-100." }]);
      return;
    }
    const options = getShippingOptions(digits, 0);
    if (!options) {
      push([{ from: "bot", node: "Não consegui calcular o frete pra esse CEP." }]);
      return;
    }
    push([{ from: "bot", node: <FreteAnswer options={options} /> }]);
    setScreen("menu");
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {transcript.map((bubble) => (
          <div key={bubble.id} className={`flex ${bubble.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-2xl border p-3 text-sm shadow-sm ${bubble.from === "user" ? "rounded-br-md border-brand/30 bg-brand text-white" : "rounded-bl-md border-line bg-white text-ink"}`}>
              {bubble.node}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line p-3">
        {screen !== "menu" && (
          <button onClick={() => setScreen("menu")} className="mb-2 text-xs font-semibold text-ink-muted hover:text-brand">← Voltar ao menu</button>
        )}

        {screen === "menu" && (
          <div className="flex flex-wrap gap-2">
            {MENU_ITEMS.map((item) => (
              <button key={item.id} onClick={() => handleSelect(item)} className="rounded-xl border border-line bg-mist px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-brand hover:bg-brand-soft hover:text-brand">
                {item.label}
              </button>
            ))}
          </div>
        )}

        {screen === "produtos" && <SimpleInputForm placeholder="O que você procura?" onSubmit={handleProductSearch} />}
        {screen === "frete" && <SimpleInputForm placeholder="Seu CEP" onSubmit={handleCep} />}
        {screen === "atendimento" && (
          <button onClick={onEscalate} className="h-10 w-full rounded-xl bg-brand text-sm font-bold text-white shadow-card hover:bg-brand-dark">
            Continuar para falar com atendente →
          </button>
        )}
      </div>
    </div>
  );
}

function SimpleInputForm({ placeholder, onSubmit }: { placeholder: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!value.trim()) return; onSubmit(value.trim()); setValue(""); }}
      className="flex gap-2"
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="h-10 flex-1 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white" />
      <button type="submit" className="h-10 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark">Enviar</button>
    </form>
  );
}

function PagamentoAnswer() {
  return (
    <div className="space-y-2">
      <p>Você pode pagar com <strong>cartão de crédito</strong> (parcelado) ou <strong>Pix</strong>, processados com segurança pela Mercado Pago. O pedido só é confirmado depois que o pagamento é aprovado.</p>
      <Link href="/ajuda/formas-de-pagamento" className="font-semibold text-brand hover:underline">Ver todos os detalhes →</Link>
    </div>
  );
}

function TrocasAnswer({ onEscalate }: { onEscalate: () => void }) {
  return (
    <div className="space-y-2">
      <p>Você tem até <strong>7 dias</strong> após receber o produto pra desistir da compra (direito de arrependimento, CDC art. 49), e pode pedir troca se o produto chegar com defeito.</p>
      <Link href="/ajuda/trocas-e-devolucoes" className="block font-semibold text-brand hover:underline">Ver como solicitar →</Link>
      <button onClick={onEscalate} className="mt-1 rounded-lg bg-mist px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-line">É sobre um pedido específico? Falar com atendente</button>
    </div>
  );
}

function EmpresaAnswer() {
  return (
    <div className="space-y-2">
      <p>A Heca - Store é uma loja de tecnologia e produtos pro dia a dia, com foco numa experiência de compra clara e segura. Estamos sempre evoluindo!</p>
      <Link href="/sobre" className="font-semibold text-brand hover:underline">Saiba mais sobre nós →</Link>
    </div>
  );
}

function RastreioAnswer({ loggedIn }: { loggedIn: boolean }) {
  if (loggedIn) {
    return (
      <div className="space-y-2">
        <p>Você acompanha tudo em "Meus pedidos" — status, código de rastreio e histórico completo.</p>
        <Link href="/conta/pedidos" className="font-semibold text-brand hover:underline">Ver meus pedidos →</Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p>Pra rastrear seu pedido, você precisa estar logado na sua conta.</p>
      <Link href="/login" className="font-semibold text-brand hover:underline">Entrar →</Link>
    </div>
  );
}

function PromocoesAnswer({ featured }: { featured: Contexto["featured"] }) {
  const discounted = featured.filter((p) => p.compareCents && p.compareCents > p.priceCents);
  return (
    <div className="space-y-2">
      <p>{discounted.length > 0 ? "Olha esses destaques com desconto:" : "Dá uma olhada nos destaques da loja:"}</p>
      <ul className="space-y-1.5">
        {(discounted.length > 0 ? discounted : featured).map((p) => (
          <li key={p.slug}>
            <Link href={`/produtos/${p.slug}`} className="font-semibold text-brand hover:underline">{p.name}</Link>
            {" — "}
            <span className="font-bold">{formatBRL(p.priceCents)}</span>
            {p.compareCents && p.compareCents > p.priceCents && <span className="ml-1 text-ink-muted line-through">{formatBRL(p.compareCents)}</span>}
          </li>
        ))}
      </ul>
      <Link href="/produtos" className="block font-semibold text-brand hover:underline">Ver toda a loja →</Link>
    </div>
  );
}

function ProductResults({ products }: { products: { name: string; slug: string; priceCents: number; compareCents: number | null; inStock: boolean }[] }) {
  return (
    <div className="space-y-2">
      <p>Encontrei estes produtos:</p>
      <ul className="space-y-1.5">
        {products.map((p) => (
          <li key={p.slug}>
            <Link href={`/produtos/${p.slug}`} className="font-semibold text-brand hover:underline">{p.name}</Link>
            {" — "}<span className="font-bold">{formatBRL(p.priceCents)}</span>
            {!p.inStock && <span className="ml-1 text-xs text-deal">(sem estoque)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoProductResults({ categories }: { categories: Contexto["categories"] }) {
  return (
    <div className="space-y-2">
      <p>Não achei nada com esse nome. Que tal navegar por categoria?</p>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <Link key={c.slug} href={`/produtos?categoria=${c.slug}`} className="rounded-lg bg-mist px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-line">
            {c.icon} {c.name}
          </Link>
        ))}
      </div>
      <Link href="/produtos" className="block font-semibold text-brand hover:underline">Ver catálogo completo →</Link>
    </div>
  );
}

function FreteAnswer({ options }: { options: NonNullable<ReturnType<typeof getShippingOptions>> }) {
  return (
    <div className="space-y-2">
      <p>Pra esse CEP, as opções são:</p>
      <ul className="space-y-1">
        {options.map((option) => (
          <li key={option.id}>
            <strong>{option.label}</strong> — {option.free ? <span className="font-bold text-ok">Grátis</span> : formatBRL(option.priceCents)} · {option.etaLabel}
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-muted">O valor final é calculado pela transportadora no checkout.</p>
    </div>
  );
}
