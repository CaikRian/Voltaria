"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { createOrderAction, type CheckoutFormState } from "@/lib/actions/orders";
import { getShippingOptions, type ShippingOptionId } from "@/lib/shipping";
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
  contactDefaults: { name: string; email: string };
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
  const [shippingOptionId, setShippingOptionId] = useState<ShippingOptionId | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("");

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
  const shippingOptions = effectiveAddress ? getShippingOptions(effectiveAddress.cep, cartTotal) : null;

  // Reseta/auto-seleciona a opção de frete sempre que o CEP efetivo muda (troca
  // de endereço salvo, edição do CEP novo, ou carrinho muda de valor e deixa de
  // bater o frete grátis) — evita ficar com uma opção de um cálculo antigo.
  useEffect(() => {
    if (!shippingOptions) {
      setShippingOptionId(null);
      return;
    }
    setShippingOptionId((current) =>
      current && shippingOptions.some((o) => o.id === current) ? current : shippingOptions[0].id
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAddress?.cep, cartTotal]);

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
        ...effectiveAddress,
        shippingOptionId,
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

          {shippingOptions && (
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
                        <span className="font-medium">{o.label}</span>
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

        <div className="rounded-xl2 border border-dashed border-line bg-mist p-6 text-center text-sm text-ink-muted">
          <p className="font-medium text-ink">Mercado Pago</p>
          <p className="mt-1">
            Você será redirecionado para pagar com PIX, cartão ou boleto (ambiente de teste).
          </p>
        </div>
      </div>

      <CheckoutSummary
        pending={pending}
        error={state.error}
        shippingCents={selectedOption?.priceCents ?? null}
        shippingLabel={selectedOption?.label ?? null}
      />
    </form>
  );
}
