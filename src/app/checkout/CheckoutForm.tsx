"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { createOrderAction, type CheckoutFormState } from "@/lib/actions/orders";
import type { RealShippingOption } from "@/lib/shipping-real";
import { lookupCep } from "@/lib/cep";
import type { getAddressesByUser } from "@/lib/addresses";
import { CheckoutSummary } from "./CheckoutSummary";

const initial: CheckoutFormState = {};

type SavedAddress = Awaited<ReturnType<typeof getAddressesByUser>>[number];

type AddressFields = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const emptyAddress: AddressFields = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

type Props = {
  contactDefaults: { name: string; email: string; phone: string; document: string };
  addresses: SavedAddress[];
  isLoggedIn: boolean;
};

export function CheckoutForm({ contactDefaults, addresses, isLoggedIn }: Props) {
  const { items, totalCents } = useCart();
  const [state, action, pending] = useActionState(createOrderAction, initial);

  const [contact, setContact] = useState(contactDefaults);
  const [addressMode, setAddressMode] = useState<"saved" | "new">(addresses.length > 0 ? "saved" : "new");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null
  );
  const [newAddress, setNewAddress] = useState<AddressFields>(emptyAddress);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [shippingOptionId, setShippingOptionId] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<RealShippingOption[]>([]);
  const [shippingStatus, setShippingStatus] = useState<"idle" | "loading" | "error">("idle");
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CARD_BOLETO">("PIX");

  const savedSelected = addresses.find((a) => a.id === selectedAddressId) ?? null;
  const effectiveAddress: AddressFields | null =
    addressMode === "saved" && savedSelected
      ? {
          cep: savedSelected.cep,
          street: savedSelected.street,
          number: savedSelected.number,
          complement: savedSelected.complement ?? "",
          neighborhood: savedSelected.neighborhood,
          city: savedSelected.city,
          state: savedSelected.state,
        }
      : addressMode === "new"
        ? newAddress
        : null;

  const cartTotal = totalCents();
  const cartItemsKey = JSON.stringify(items.map((item) => ({ productId: item.productId, qty: item.qty })));

  // Reseta/auto-seleciona a opção de frete sempre que o CEP efetivo muda (troca
  // de endereço salvo ou alteração dos itens do carrinho — evita manter uma
  // cotação antiga selecionada.
  useEffect(() => {
    const cep = effectiveAddress?.cep.replace(/\D/g, "") ?? "";
    if (cep.length !== 8 || items.length === 0) {
      setShippingOptions([]);
      setShippingOptionId(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setShippingStatus("loading");
      try {
        const response = await fetch("/api/frete/cotacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cep, items: JSON.parse(cartItemsKey) }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.options)) throw new Error(data.error);
        setShippingOptions(data.options);
        setShippingOptionId((current) => current && data.options.some((option: RealShippingOption) => option.id === current) ? current : data.options[0]?.id ?? null);
        setShippingStatus("idle");
      } catch (error) {
        if (controller.signal.aborted) return;
        setShippingOptions([]); setShippingOptionId(null); setShippingStatus("error");
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAddress?.cep, cartItemsKey]);

  async function handleCepBlur() {
    if (addressMode !== "new") return;
    const digits = newAddress.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepStatus("loading");
    const result = await lookupCep(digits);
    if (!result) {
      setCepStatus("notfound");
      return;
    }
    setCepStatus("found");
    setNewAddress((s) => ({
      ...s,
      street: result.street || s.street,
      neighborhood: result.neighborhood || s.neighborhood,
      city: result.city || s.city,
      state: result.state || s.state,
    }));
  }

  function updateNewAddress(key: keyof AddressFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setNewAddress((s) => ({ ...s, [key]: e.target.value }));
  }

  const selectedOption = shippingOptions?.find((o) => o.id === shippingOptionId) ?? null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveAddress || !shippingOptionId) return;
    // action() precisa rodar dentro de uma transição quando disparada fora de
    // <form action={action}> — é o que dá o estado `pending` correto do useActionState.
    startTransition(() => {
      action({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        document: contact.document,
        ...effectiveAddress,
        shippingOptionId,
        paymentMethod,
        saveAddress: addressMode === "new" ? saveAddress : false,
        addressLabel,
        items: items.map((i) => ({ productId: i.productId, variantName: i.variantName, qty: i.qty })),
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <div className="rounded-xl2 border border-line bg-paper p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold">Contato</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <input
                className="h-11 w-full rounded-xl border border-line px-4 text-sm"
                placeholder="Nome completo"
                required
                value={contact.name}
                onChange={(e) => setContact((s) => ({ ...s, name: e.target.value }))}
              />
              {state.fieldErrors?.name && (
                <p className="mt-1 text-xs text-deal">{state.fieldErrors.name[0]}</p>
              )}
            </div>
            <div>
              <input className="h-11 w-full rounded-xl border border-line px-4 text-sm" placeholder="Telefone com DDD" inputMode="tel" required value={contact.phone} onChange={(e) => setContact((s) => ({ ...s, phone: e.target.value }))} />
              {state.fieldErrors?.phone && <p className="mt-1 text-xs text-deal">{state.fieldErrors.phone[0]}</p>}
            </div>
            <div>
              <input className="h-11 w-full rounded-xl border border-line px-4 text-sm" placeholder="CPF do destinatário" inputMode="numeric" required value={contact.document} onChange={(e) => setContact((s) => ({ ...s, document: e.target.value }))} />
              {state.fieldErrors?.document && <p className="mt-1 text-xs text-deal">{state.fieldErrors.document[0]}</p>}
            </div>
            <div className="sm:col-span-2">
              <input
                className="h-11 w-full rounded-xl border border-line px-4 text-sm"
                placeholder="E-mail"
                type="email"
                required
                value={contact.email}
                onChange={(e) => setContact((s) => ({ ...s, email: e.target.value }))}
              />
              {state.fieldErrors?.email && (
                <p className="mt-1 text-xs text-deal">{state.fieldErrors.email[0]}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl2 border border-line bg-paper p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold">Endereço de entrega</h2>

          {addresses.length > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                    addressMode === "saved" && selectedAddressId === a.id
                      ? "border-brand bg-brand-soft"
                      : "border-line hover:bg-mist"
                  }`}
                >
                  <input
                    type="radio"
                    name="addressChoice"
                    className="mt-1"
                    checked={addressMode === "saved" && selectedAddressId === a.id}
                    onChange={() => {
                      setAddressMode("saved");
                      setSelectedAddressId(a.id);
                    }}
                  />
                  <span>
                    <span className="font-medium">{a.label}</span>{" "}
                    {a.isDefault && (
                      <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand">
                        Padrão
                      </span>
                    )}
                    <br />
                    <span className="text-ink-soft">
                      {a.street}, {a.number}
                      {a.complement ? ` — ${a.complement}` : ""} · {a.neighborhood}, {a.city}/{a.state} · CEP{" "}
                      {a.cep}
                    </span>
                  </span>
                </label>
              ))}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                  addressMode === "new" ? "border-brand bg-brand-soft" : "border-line hover:bg-mist"
                }`}
              >
                <input
                  type="radio"
                  name="addressChoice"
                  checked={addressMode === "new"}
                  onChange={() => setAddressMode("new")}
                />
                <span className="font-medium">Usar um novo endereço</span>
              </label>
            </div>
          )}

          {addressMode === "new" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <input
                  className="h-11 w-full rounded-xl border border-line px-4 text-sm"
                  placeholder="CEP"
                  required
                  value={newAddress.cep}
                  onChange={updateNewAddress("cep")}
                  onBlur={handleCepBlur}
                />
                {cepStatus === "loading" && <p className="mt-1 text-xs text-ink-muted">Buscando endereço...</p>}
                {cepStatus === "notfound" && (
                  <p className="mt-1 text-xs text-ink-muted">CEP não encontrado — preencha manualmente.</p>
                )}
                {state.fieldErrors?.cep && <p className="mt-1 text-xs text-deal">{state.fieldErrors.cep[0]}</p>}
              </div>
              <div>
                <input
                  className="h-11 w-full rounded-xl border border-line px-4 text-sm"
                  placeholder="Número"
                  required
                  value={newAddress.number}
                  onChange={updateNewAddress("number")}
                />
                {state.fieldErrors?.number && (
                  <p className="mt-1 text-xs text-deal">{state.fieldErrors.number[0]}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <input
                  className="h-11 w-full rounded-xl border border-line px-4 text-sm"
                  placeholder="Rua"
                  required
                  value={newAddress.street}
                  onChange={updateNewAddress("street")}
                />
                {state.fieldErrors?.street && (
                  <p className="mt-1 text-xs text-deal">{state.fieldErrors.street[0]}</p>
                )}
              </div>
              <div>
                <input
                  className="h-11 w-full rounded-xl border border-line px-4 text-sm"
                  placeholder="Complemento (opcional)"
                  value={newAddress.complement}
                  onChange={updateNewAddress("complement")}
                />
              </div>
              <div>
                <input
                  className="h-11 w-full rounded-xl border border-line px-4 text-sm"
                  placeholder="Bairro"
                  required
                  value={newAddress.neighborhood}
                  onChange={updateNewAddress("neighborhood")}
                />
                {state.fieldErrors?.neighborhood && (
                  <p className="mt-1 text-xs text-deal">{state.fieldErrors.neighborhood[0]}</p>
                )}
              </div>
              <div>
                <input
                  className="h-11 w-full rounded-xl border border-line px-4 text-sm"
                  placeholder="Cidade"
                  required
                  value={newAddress.city}
                  onChange={updateNewAddress("city")}
                />
                {state.fieldErrors?.city && <p className="mt-1 text-xs text-deal">{state.fieldErrors.city[0]}</p>}
              </div>
              <div>
                <input
                  className="h-11 w-full rounded-xl border border-line px-4 text-sm"
                  placeholder="UF"
                  maxLength={2}
                  required
                  value={newAddress.state}
                  onChange={(e) => setNewAddress((s) => ({ ...s, state: e.target.value.toUpperCase() }))}
                />
                {state.fieldErrors?.state && (
                  <p className="mt-1 text-xs text-deal">{state.fieldErrors.state[0]}</p>
                )}
              </div>

              {isLoggedIn && (
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="h-4 w-4 accent-brand"
                    />
                    Salvar este endereço para as próximas compras
                  </label>
                  {saveAddress && (
                    <input
                      className="mt-2 h-11 w-full rounded-xl border border-line px-4 text-sm"
                      placeholder="Nome pro endereço (ex.: Casa, Trabalho)"
                      value={addressLabel}
                      onChange={(e) => setAddressLabel(e.target.value)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {shippingStatus === "loading" && <p className="mt-6 text-sm text-ink-muted">Consultando Correios e transportadoras...</p>}
          {shippingStatus === "error" && <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">Não foi possível calcular o frete agora. Confira a integração e tente novamente.</p>}
          {shippingOptions.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Opção de frete</p>
              <div className="flex flex-col gap-2">
                {shippingOptions.map((o) => (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${
                      shippingOptionId === o.id ? "border-brand bg-brand-soft" : "border-line hover:bg-mist"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingOption"
                        checked={shippingOptionId === o.id}
                        onChange={() => setShippingOptionId(o.id)}
                      />
                      <span>
                        <span className="font-medium">{o.company} · {o.label}</span>
                        <br />
                        <span className="text-ink-muted">{o.etaLabel}</span>
                      </span>
                    </span>
                    <span className="font-semibold">
                      {o.priceCents === 0 ? "Grátis" : (o.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl2 border border-line bg-paper p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold">Forma de pagamento</h2>
          <div className="grid gap-3">
            <label className={`cursor-pointer rounded-xl border p-4 ${paymentMethod === "PIX" ? "border-brand bg-brand-soft" : "border-line hover:bg-mist"}`}>
              <span className="flex items-start gap-3">
                <input type="radio" name="paymentMethod" value="PIX" checked={paymentMethod === "PIX"} onChange={() => setPaymentMethod("PIX")} className="mt-1" />
                <span><span className="font-semibold text-ink">Pix</span><br /><span className="text-sm text-ink-muted">5% de desconto nos produtos. O frete permanece com o valor integral.</span></span>
              </span>
            </label>
            <label className={`cursor-pointer rounded-xl border p-4 ${paymentMethod === "CARD_BOLETO" ? "border-brand bg-brand-soft" : "border-line hover:bg-mist"}`}>
              <span className="flex items-start gap-3">
                <input type="radio" name="paymentMethod" value="CARD_BOLETO" checked={paymentMethod === "CARD_BOLETO"} onChange={() => setPaymentMethod("CARD_BOLETO")} className="mt-1" />
                <span><span className="font-semibold text-ink">Cartão ou boleto</span><br /><span className="text-sm text-ink-muted">Pagamento pelo valor normal dos produtos.</span></span>
              </span>
            </label>
          </div>
          <p className="mt-4 text-xs text-ink-muted">Você será redirecionado com segurança para o Mercado Pago.</p>
        </div>
      </div>

      <CheckoutSummary
        pending={pending}
        error={state.error}
        shippingCents={selectedOption?.priceCents ?? null}
        shippingLabel={selectedOption?.label ?? null}
        paymentMethod={paymentMethod}
      />
    </form>
  );
}
