"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { requireCapability, getCurrentUser, requireUser } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { getProductsByIds } from "@/lib/products";
import { resolveShippingCents } from "@/lib/shipping";
import { mpClient } from "@/lib/mercadopago";
import { updateOrderStatus } from "@/lib/orders";
import { isValidStatusTransition, type OrderStatus } from "@/lib/order-status";
import { checkoutSchema, orderStatusSchema, type CheckoutInput } from "@/lib/validators";

export type CheckoutFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// Reais → centavos só na fronteira com a API da Mercado Pago (nunca no banco).
const toReais = (cents: number) => Number((cents / 100).toFixed(2));

// Checkout é fluxo público — SEM requireUser()/requireCapability(). Guest checkout
// é intencional: Order.userId é opcional, Order.email é o contato obrigatório.
export async function createOrderAction(
  _prevState: CheckoutFormState,
  input: CheckoutInput
): Promise<CheckoutFormState> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  // 1) Busca preço/estoque autoritativos — nunca confia no carrinho do client.
  const productIds = [...new Set(d.items.map((i) => i.productId))];
  const products = await getProductsByIds(productIds);

  const orderItemsData: {
    productId: string;
    productName: string;
    variantName?: string;
    unitCents: number;
    qty: number;
  }[] = [];

  for (const it of d.items) {
    const product = products.find((p) => p.id === it.productId);
    if (!product) return { error: "Um dos itens do carrinho não está mais disponível." };

    let unitCents = product.priceCents;
    let stockAvailable = product.stock;

    if (it.variantName) {
      const variant = product.variants.find((v) => v.name === it.variantName);
      if (!variant) return { error: `Variação indisponível: ${it.variantName}.` };
      unitCents = variant.priceCents ?? product.priceCents;
      stockAvailable = variant.stock;
    }

    // Checagem leve de estoque — não reserva/decrementa (ver CLAUDE.md / plano do item 1).
    if (it.qty > stockAvailable) {
      return { error: `Estoque insuficiente para "${product.name}".` };
    }

    orderItemsData.push({
      productId: product.id,
      productName: product.name,
      variantName: it.variantName,
      unitCents,
      qty: it.qty,
    });
  }

  const itemsTotalCents = orderItemsData.reduce((sum, i) => sum + i.unitCents * i.qty, 0);
  if (itemsTotalCents <= 0) return { error: "Carrinho vazio." };

  // Recálculo autoritativo de frete a partir do CEP + opção escolhida. Nunca
  // confiar em preço de frete vindo do client — mesmo princípio do recálculo de
  // preço de item acima (via getProductsByIds).
  const resolved = resolveShippingCents(d.cep, itemsTotalCents, d.shippingOptionId);
  if (!resolved) return { error: "Não foi possível calcular o frete para o CEP informado." };
  const shippingCents = resolved.cents;
  const totalCents = itemsTotalCents + shippingCents;

  // 2) Cria o pedido (AGUARDANDO_PAGAMENTO) — precisa existir antes da Preference porque usamos
  // order.id como external_reference (é o que o webhook usa pra correlacionar).
  // IMPORTANTE: a sessão pode ficar stale após reset do banco; neste caso o id
  // pode apontar pra usuário inexistente e quebrar a FK de Order.userId.
  const user = await getCurrentUser(); // pode ser null — checkout de convidado é permitido
  const orderUserId = user?.id ?? null;
  const order = await prisma.order.create({
    data: {
      email: d.email,
      totalCents,
      userId: orderUserId,
      status: "AGUARDANDO_PAGAMENTO", // novo status inicial
      items: { create: orderItemsData },
      statusEvents: { create: [{ status: "AGUARDANDO_PAGAMENTO" }] },
      // Snapshot do endereço de entrega — igual OrderItem.productName já é
      // snapshot de produto, não depende do Address continuar existindo depois.
      shipName: d.name,
      shipCep: d.cep,
      shipStreet: d.street,
      shipNumber: d.number,
      shipComplement: d.complement || null,
      shipNeighborhood: d.neighborhood,
      shipCity: d.city,
      shipState: d.state,
      shippingCents,
      shippingMethod: `${resolved.option.label} — ${resolved.option.etaLabel}`,
    },
  });

  // Salva o endereço como favorito (best-effort). Fora do try/catch da Preference
  // de propósito — uma falha aqui NUNCA deve derrubar o pedido nem acionar o
  // cancelamento que existe pra falha de pagamento. O pedido em si importa mais
  // que o "favorito" salvo.
  if (user && d.saveAddress) {
    try {
      const count = await prisma.address.count({ where: { userId: user.id } });
      await prisma.address.create({
        data: {
          userId: user.id,
          label: d.addressLabel?.trim() || "Endereço",
          name: d.name,
          cep: d.cep,
          street: d.street,
          number: d.number,
          complement: d.complement || null,
          neighborhood: d.neighborhood,
          city: d.city,
          state: d.state,
          isDefault: count === 0, // primeiro endereço do cliente vira padrão automaticamente
        },
      });
    } catch (e) {
      console.error("Falha ao salvar endereço do checkout (não bloqueia o pedido):", e);
    }
  }

  // 3) Cria a Preference no Mercado Pago (Checkout Pro: PIX, cartão e boleto).
  const preferenceClient = new Preference(mpClient);
  let initPoint: string;

  try {
    const items = orderItemsData.map((i) => ({
      id: i.productId,
      title: i.variantName ? `${i.productName} (${i.variantName})` : i.productName,
      quantity: i.qty,
      unit_price: toReais(i.unitCents),
      currency_id: "BRL",
    }));
    if (shippingCents > 0) {
      items.push({
        id: "frete",
        title: `Frete (${resolved.option.label})`,
        quantity: 1,
        unit_price: toReais(shippingCents),
        currency_id: "BRL",
      });
    }

    // auto_return exige que back_urls aponte pra uma URL pública — a MP rejeita
    // (400 "auto_return invalid") quando success/pending/failure são localhost.
    // Em dev local sem túnel (ngrok), o comprador só não volta automaticamente;
    // o webhook continua sendo a fonte de verdade do status do pedido de qualquer forma.
    const isPublicAppUrl = !!process.env.APP_URL && !/localhost|127\.0\.0\.1/.test(process.env.APP_URL);

    const pref = await preferenceClient.create({
      body: {
        items,
        payer: { email: d.email, name: d.name },
        external_reference: order.id,
        back_urls: {
          success: `${process.env.APP_URL}/checkout/sucesso?order=${order.id}`,
          pending: `${process.env.APP_URL}/checkout/pendente?order=${order.id}`,
          failure: `${process.env.APP_URL}/checkout/erro?order=${order.id}`,
        },
        ...(isPublicAppUrl ? { auto_return: "approved" as const } : {}),
        notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
      },
    });

    // Com credenciais de teste, init_point aponta pro checkout de produção (que
    // rejeita a preference com erro genérico) — sandbox_init_point é o correto.
    // Preferir sandbox_init_point aqui é seguro pra produção também: credenciais
    // de produção normalmente não retornam esse campo, então cai em init_point.
    const resolvedInitPoint = pref.sandbox_init_point ?? pref.init_point;
    if (!resolvedInitPoint) throw new Error("Mercado Pago não retornou init_point.");
    initPoint = resolvedInitPoint;

    await prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: pref.id },
    });
  } catch (e) {
    console.error("Falha ao criar Preference na Mercado Pago:", e);
    // Não deixa o pedido pendurado sem nenhuma tentativa de pagamento.
    await updateOrderStatus(order.id, "AGUARDANDO_PAGAMENTO", "CANCELADO", {
      note: "Falha ao criar pagamento na Mercado Pago",
    });
    return { error: "Não foi possível iniciar o pagamento agora. Tente novamente em instantes." };
  }

  // Fora do try/catch: redirect() lança internamente (NEXT_REDIRECT) e precisa
  // propagar, mesmo padrão de signIn(...redirectTo) em actions/auth.ts.
  // Fallback caso redirecionar pra URL externa se mostre instável: trocar por
  // `return { redirectUrl: initPoint }` e navegar no client via useEffect.
  redirect(initPoint);
}

export type OrderStatusFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

// Atualização manual de status pelo staff (VENDEDOR/GERENTE/ADMIN). Ao contrário
// de createProduct/updateProduct, NÃO redireciona: o mesmo pedido é revisitado
// várias vezes ao longo de dias conforme avança PAGO → ENVIADO → ENTREGUE —
// voltar pra listagem a cada clique atrapalharia.
export async function updateOrderStatusAction(
  orderId: string,
  _prev: OrderStatusFormState,
  formData: FormData
): Promise<OrderStatusFormState> {
  await requireCapability("order:update:status");

  const parsed = orderStatusSchema.safeParse({
    status: formData.get("status"),
    note: formData.get("note") ?? "",
    trackingCode: formData.get("trackingCode") ?? "",
    trackingUrl: formData.get("trackingUrl") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return { error: "Pedido não encontrado." };

  // Só bloqueia transições de verdade — resubmeter o mesmo status (ex.: só pra
  // atualizar o código de rastreio) é sempre permitido.
  if (
    parsed.data.status !== order.status &&
    !isValidStatusTransition(order.status as OrderStatus, parsed.data.status)
  ) {
    return { error: "Transição de status inválida." };
  }

  await updateOrderStatus(orderId, order.status, parsed.data.status, {
    note: parsed.data.note || undefined,
    orderData: {
      ...(parsed.data.trackingCode ? { trackingCode: parsed.data.trackingCode } : {}),
      ...(parsed.data.trackingUrl ? { trackingUrl: parsed.data.trackingUrl } : {}),
    },
  });

  revalidatePath("/painel/pedidos");
  revalidatePath("/painel/conversas");
  revalidatePath(`/painel/pedidos/${orderId}`);
  return { success: true };
}

export type ClientOrderActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

export type OrderMessageFormState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

function readMessageAttachment(formData: FormData) {
  const attachmentUrl = String(formData.get("attachmentUrl") ?? "").trim();
  const attachmentType = String(formData.get("attachmentType") ?? "").trim();
  const attachmentName = String(formData.get("attachmentName") ?? "").trim();
  if (!attachmentUrl) return {};
  if (!attachmentUrl.startsWith("https://") || !["IMAGE", "AUDIO"].includes(attachmentType)) return null;
  return { attachmentUrl, attachmentType, attachmentName: attachmentName.slice(0, 160) || null };
}

/**
 * Ação: Cliente cancela um pedido aguardando pagamento ou recusado
 */
export async function cancelOrderAction(
  orderId: string,
  _prev: ClientOrderActionState,
  formData: FormData
): Promise<ClientOrderActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar logado." };

  const reason = formData.get("reason") as string;
  if (!reason || reason.trim().length === 0) {
    return { fieldErrors: { reason: ["Por favor, explique o motivo."] } };
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { status: true, id: true },
  });

  if (!order) return { error: "Pedido não encontrado." };

  // Só pode cancelar se estiver aguardando pagamento ou foi recusado
  if (!["AGUARDANDO_PAGAMENTO", "PAGAMENTO_RECUSADO"].includes(order.status)) {
    return { error: "Este pedido não pode ser cancelado neste momento." };
  }

  await updateOrderStatus(order.id, order.status, "CANCELADO", {
    note: `Cliente cancelou: ${reason}`,
    orderData: { reasonCancelled: reason },
  });

  await prisma.orderMessage.create({
    data: {
      orderId: order.id,
      userId: user.id,
      senderRole: user.role,
      text: `Solicitação de cancelamento: ${reason}`,
    },
  });

  revalidatePath("/conta/pedidos");
  revalidatePath(`/conta/pedidos/${orderId}`);
  return { success: true };
}

/**
 * Ação: Cliente solicita reembolso de um pedido entregue
 */
export async function requestRefundAction(
  orderId: string,
  _prev: ClientOrderActionState,
  formData: FormData
): Promise<ClientOrderActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar logado." };

  const reason = formData.get("reason") as string;
  if (!reason || reason.trim().length === 0) {
    return { fieldErrors: { reason: ["Por favor, explique o motivo do reembolso."] } };
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { status: true, id: true },
  });

  if (!order) return { error: "Pedido não encontrado." };

  // Só pode solicitar reembolso se estiver entregue
  if (!["ENTREGUE", "ENVIADO"].includes(order.status)) {
    return { error: "Reembolsos só podem ser solicitados após receber o pedido." };
  }

  await updateOrderStatus(order.id, order.status, "REEMBOLSO_SOLICITADO", {
    note: `Reembolso solicitado: ${reason}`,
    orderData: {
      refundReason: reason,
      refundRequestedAt: new Date(),
    },
  });

  await prisma.orderMessage.create({
    data: {
      orderId: order.id,
      userId: user.id,
      senderRole: user.role,
      text: `Solicitação de reembolso: ${reason}`,
    },
  });

  revalidatePath("/conta/pedidos");
  revalidatePath(`/conta/pedidos/${orderId}`);
  return { success: true };
}

export async function sendOrderMessageAction(
  orderId: string,
  _prev: OrderMessageFormState,
  formData: FormData
): Promise<OrderMessageFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar logado." };

  const text = (formData.get("text") as string | null)?.trim();
  const attachment = readMessageAttachment(formData);
  if (attachment === null) return { error: "Anexo inválido." };
  if ((!text || text.length < 3) && !attachment.attachmentUrl) {
    return { fieldErrors: { text: ["Escreva uma mensagem para o vendedor."] } };
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true },
  });

  if (!order) return { error: "Pedido não encontrado." };

  await prisma.orderMessage.create({
    data: {
      orderId: order.id,
      userId: user.id,
      senderRole: user.role,
      text: text || (attachment.attachmentType === "AUDIO" ? "Áudio" : "Imagem"),
      ...attachment,
    },
  });
  // Cliente falou: agora quem deve responder é a equipe — sem prazo pra ela.
  // Mensagem nova sempre reabre um chat fechado (manual ou por inatividade).
  await prisma.order.update({
    where: { id: order.id },
    data: { awaitingReplyFrom: "STAFF", chatWaitingSince: null, chatClosedAt: null },
  });

  revalidatePath("/conta/pedidos");
  revalidatePath(`/conta/pedidos/${orderId}`);
  revalidatePath("/painel/pedidos");
  revalidatePath("/painel/conversas");
  revalidatePath(`/painel/pedidos/${orderId}`);
  return { success: true };
}

export async function sendOrderReplyAction(
  orderId: string,
  _prev: OrderMessageFormState,
  formData: FormData
): Promise<OrderMessageFormState> {
  const user = await requireUser();
  if (!can(user.role, "order:update:status")) {
    return { error: "Você não tem permissão para responder neste pedido." };
  }

  const text = (formData.get("text") as string | null)?.trim();
  const attachment = readMessageAttachment(formData);
  if (attachment === null) return { error: "Anexo inválido." };
  if ((!text || text.length < 3) && !attachment.attachmentUrl) {
    return { fieldErrors: { text: ["Escreva uma resposta antes de enviar."] } };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });

  if (!order) return { error: "Pedido não encontrado." };

  await prisma.orderMessage.create({
    data: {
      orderId: order.id,
      userId: user.id,
      senderRole: user.role,
      text: text || (attachment.attachmentType === "AUDIO" ? "Áudio" : "Imagem"),
      ...attachment,
    },
  });
  // Equipe respondeu: agora quem deve responder é o cliente — prazo de 3 dias
  // começa a contar a partir de agora (closeStaleChats cuida do resto).
  await prisma.order.update({
    where: { id: order.id },
    data: { awaitingReplyFrom: "CLIENTE", chatWaitingSince: new Date(), chatClosedAt: null },
  });

  revalidatePath("/painel/pedidos");
  revalidatePath("/painel/conversas");
  revalidatePath(`/painel/pedidos/${orderId}`);
  revalidatePath("/conta/pedidos");
  revalidatePath(`/conta/pedidos/${orderId}`);
  return { success: true };
}

/**
 * Ação: Equipe encerra manualmente o chat de um pedido (ex.: assunto resolvido).
 * Uma nova mensagem de qualquer lado reabre automaticamente.
 */
export async function closeOrderChatAction(
  orderId: string,
  _prev: OrderMessageFormState,
  _formData: FormData
): Promise<OrderMessageFormState> {
  const user = await requireUser();
  if (!can(user.role, "order:update:status")) {
    return { error: "Você não tem permissão para fechar esta conversa." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) return { error: "Pedido não encontrado." };

  await prisma.order.update({
    where: { id: order.id },
    data: { chatClosedAt: new Date() },
  });

  revalidatePath("/painel/pedidos");
  revalidatePath("/painel/conversas");
  revalidatePath(`/painel/pedidos/${orderId}`);
  return { success: true };
}

/**
 * Ação: Cliente tenta pagar novamente um pedido com pagamento recusado
 * Cria uma nova preferência na Mercado Pago e redireciona
 */
export async function retryPaymentAction(orderId: string): Promise<CheckoutFormState> {
  const user = await getCurrentUser();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) return { error: "Pedido não encontrado." };

  // Permite retomar o pagamento tanto de um pedido recusado quanto de um que
  // ficou pendente por sair do checkout antes do fluxo MP terminar.
  if (!["AGUARDANDO_PAGAMENTO", "PAGAMENTO_RECUSADO"].includes(order.status)) {
    return { error: "Este pedido não pode ser pago novamente." };
  }

  // Segurança: se for um pedido de um usuário logado, verifica se é o dono
  if (user && order.userId !== user.id) {
    return { error: "Você não tem permissão para pagar este pedido." };
  }

  const preferenceClient = new Preference(mpClient);

  try {
    const items = order.items.map((i) => ({
      id: i.productId,
      title: i.variantName ? `${i.productName} (${i.variantName})` : i.productName,
      quantity: i.qty,
      unit_price: toReais(i.unitCents),
      currency_id: "BRL",
    }));

    if (order.shippingCents && order.shippingCents > 0) {
      items.push({
        id: "frete",
        title: `Frete${order.shippingMethod ? ` (${order.shippingMethod})` : ""}`,
        quantity: 1,
        unit_price: toReais(order.shippingCents),
        currency_id: "BRL",
      });
    }

    const isPublicAppUrl = !!process.env.APP_URL && !/localhost|127\.0\.0\.1/.test(process.env.APP_URL);

    const pref = await preferenceClient.create({
      body: {
        items,
        payer: { email: order.email },
        external_reference: order.id,
        back_urls: {
          success: `${process.env.APP_URL}/checkout/sucesso?order=${order.id}`,
          pending: `${process.env.APP_URL}/checkout/pendente?order=${order.id}`,
          failure: `${process.env.APP_URL}/checkout/erro?order=${order.id}`,
        },
        ...(isPublicAppUrl ? { auto_return: "approved" as const } : {}),
        notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
      },
    });

    const resolvedInitPoint = pref.sandbox_init_point ?? pref.init_point;
    if (!resolvedInitPoint) throw new Error("Mercado Pago não retornou init_point.");

    // Atualiza preferência (idempotência) e mantém o pedido em aguardando.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        mpPreferenceId: pref.id,
        status: "AGUARDANDO_PAGAMENTO",
      },
    });

    // Cria evento de nova tentativa. Se o pedido já estava aguardando por saída do
    // checkout, o evento deixa claro que foi uma continuidade do fluxo.
    await prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: "AGUARDANDO_PAGAMENTO",
        note:
          order.status === "PAGAMENTO_RECUSADO"
            ? "Cliente tentando novamente após recusa"
            : "Cliente retomou o pagamento no Mercado Pago",
      },
    });

    redirect(resolvedInitPoint);
  } catch (e) {
    console.error("Falha ao tentar pagamento novamente:", e);
    return { error: "Não foi possível gerar nova tentativa de pagamento. Tente novamente." };
  }
}

/**
 * Ação: Cliente altera o endereço de entrega
 * Permitido apenas se: AGUARDANDO_PAGAMENTO, PAGAMENTO_APROVADO, PREPARANDO_ENVIO
 */
export async function updateOrderAddressAction(
  orderId: string,
  _prev: ClientOrderActionState,
  formData: FormData
): Promise<ClientOrderActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar logado." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { status: true, id: true },
  });

  if (!order) return { error: "Pedido não encontrado." };

  // Só pode alterar se estiver nestes status
  const allowedStatuses = ["AGUARDANDO_PAGAMENTO", "PAGAMENTO_APROVADO", "PREPARANDO_ENVIO"];
  if (!allowedStatuses.includes(order.status)) {
    return { error: "Não é possível alterar o endereço após o envio." };
  }

  // Validar dados
  const name = (formData.get("name") as string)?.trim();
  const street = (formData.get("street") as string)?.trim();
  const number = (formData.get("number") as string)?.trim();
  const complement = (formData.get("complement") as string)?.trim() || null;
  const neighborhood = (formData.get("neighborhood") as string)?.trim();
  const city = (formData.get("city") as string)?.trim();
  const state = (formData.get("state") as string)?.trim().toUpperCase();
  const cep = (formData.get("cep") as string)?.trim().replace(/\D/g, "");

  const errors: Record<string, string[]> = {};

  if (!name || name.length < 3) errors.name = ["Nome deve ter pelo menos 3 caracteres"];
  if (!street || street.length < 3) errors.street = ["Rua inválida"];
  if (!number || number.length === 0) errors.number = ["Número obrigatório"];
  if (!neighborhood || neighborhood.length < 2) errors.neighborhood = ["Bairro inválido"];
  if (!city || city.length < 2) errors.city = ["Cidade inválida"];
  if (state?.length !== 2) errors.state = ["UF deve ter 2 caracteres"];
  if (!cep || cep.length !== 8) errors.cep = ["CEP deve ter 8 dígitos"];

  if (Object.keys(errors).length > 0) {
    return { fieldErrors: errors };
  }

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        shipName: name,
        shipStreet: street,
        shipNumber: number,
        shipComplement: complement,
        shipNeighborhood: neighborhood,
        shipCity: city,
        shipState: state,
        shipCep: cep,
      },
    });

    // Adiciona evento na timeline
    await prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: "Cliente alterou endereço de entrega",
      },
    });

    revalidatePath("/conta/pedidos");
    revalidatePath(`/conta/pedidos/${orderId}`);

    return { success: true };
  } catch (e) {
    console.error("Falha ao atualizar endereço:", e);
    return { error: "Erro ao atualizar endereço. Tente novamente." };
  }
}
