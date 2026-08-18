/**
 * Constantes e tipos de status de pedido
 * Source of truth para o fluxo de estados do pedido
 */

// Status que o cliente vê e ações disponíveis
export const ORDER_STATUS = {
  // Etapa de pagamento
  AGUARDANDO_PAGAMENTO: "AGUARDANDO_PAGAMENTO",
  PAGAMENTO_RECUSADO: "PAGAMENTO_RECUSADO",
  PAGAMENTO_APROVADO: "PAGAMENTO_APROVADO",

  // Etapa de envio
  PREPARANDO_ENVIO: "PREPARANDO_ENVIO",
  ENVIADO: "ENVIADO",
  ENTREGUE: "ENTREGUE",

  // Etapa de reembolso/cancelamento
  REEMBOLSO_SOLICITADO: "REEMBOLSO_SOLICITADO",
  REEMBOLSADO: "REEMBOLSADO",
  CANCELADO: "CANCELADO",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Transições permitidas de status
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  AGUARDANDO_PAGAMENTO: [
    ORDER_STATUS.PAGAMENTO_APROVADO,
    ORDER_STATUS.PAGAMENTO_RECUSADO,
    ORDER_STATUS.CANCELADO, // cliente cancela antes de pagar
  ],
  PAGAMENTO_RECUSADO: [
    ORDER_STATUS.AGUARDANDO_PAGAMENTO, // cliente tenta de novo
    ORDER_STATUS.CANCELADO,
  ],
  PAGAMENTO_APROVADO: [
    ORDER_STATUS.PREPARANDO_ENVIO,
    ORDER_STATUS.REEMBOLSO_SOLICITADO, // cliente quer devolver antes de envio
    ORDER_STATUS.CANCELADO, // cancelamento de emergência
  ],
  PREPARANDO_ENVIO: [
    ORDER_STATUS.ENVIADO,
    ORDER_STATUS.REEMBOLSO_SOLICITADO,
    ORDER_STATUS.CANCELADO,
  ],
  ENVIADO: [
    ORDER_STATUS.ENTREGUE,
    ORDER_STATUS.REEMBOLSO_SOLICITADO, // cliente quer devolver após envio
  ],
  ENTREGUE: [ORDER_STATUS.REEMBOLSO_SOLICITADO], // só pode pedir reembolso após entrega
  REEMBOLSO_SOLICITADO: [ORDER_STATUS.REEMBOLSADO, ORDER_STATUS.CANCELADO],
  REEMBOLSADO: [], // estado final
  CANCELADO: [], // estado final
};

// Metadata para UI
export const STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    description: string;
    badgeColor: string;
    isTerminal: boolean; // não pode mudar mais de aqui
    clientCanCancel: boolean; // cliente consegue cancelar neste estado
  }
> = {
  AGUARDANDO_PAGAMENTO: {
    label: "Aguardando pagamento",
    description:
      "Seu pedido está aguardando confirmação do pagamento. Você pode cancelar agora se desejar.",
    badgeColor: "bg-yellow-100 text-yellow-800",
    isTerminal: false,
    clientCanCancel: true,
  },
  PAGAMENTO_RECUSADO: {
    label: "Pagamento recusado",
    description:
      "Seu pagamento foi recusado. Verifique os dados e tente novamente ou use outro meio de pagamento.",
    badgeColor: "bg-red-100 text-red-800",
    isTerminal: false,
    clientCanCancel: true,
  },
  PAGAMENTO_APROVADO: {
    label: "Pagamento aprovado",
    description: "Seu pagamento foi confirmado! Estamos preparando seu pedido.",
    badgeColor: "bg-green-100 text-green-800",
    isTerminal: false,
    clientCanCancel: false,
  },
  PREPARANDO_ENVIO: {
    label: "Preparando envio",
    description: "Estamos embalando seu pedido com cuidado. Será enviado em breve!",
    badgeColor: "bg-blue-100 text-blue-800",
    isTerminal: false,
    clientCanCancel: false,
  },
  ENVIADO: {
    label: "Enviado",
    description: "Seu pedido foi despachado! Você pode acompanhar o rastreamento aqui.",
    badgeColor: "bg-blue-100 text-blue-800",
    isTerminal: false,
    clientCanCancel: false,
  },
  ENTREGUE: {
    label: "Entregue",
    description: "Seu pedido foi entregue com sucesso! Deixe uma avaliação.",
    badgeColor: "bg-green-100 text-green-800",
    isTerminal: false,
    clientCanCancel: false,
  },
  REEMBOLSO_SOLICITADO: {
    label: "Reembolso solicitado",
    description: "Estamos processando seu reembolso. Você será informado em breve.",
    badgeColor: "bg-purple-100 text-purple-800",
    isTerminal: false,
    clientCanCancel: false,
  },
  REEMBOLSADO: {
    label: "Reembolsado",
    description: "Seu reembolso foi processado com sucesso.",
    badgeColor: "bg-purple-100 text-purple-800",
    isTerminal: true,
    clientCanCancel: false,
  },
  CANCELADO: {
    label: "Cancelado",
    description: "Este pedido foi cancelado.",
    badgeColor: "bg-gray-100 text-gray-800",
    isTerminal: true,
    clientCanCancel: false,
  },
};

/**
 * Verifica se uma transição de status é válida
 */
export function isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Mapeia status do Mercado Pago para nossos status
 */
export function mapMercadoPagoStatusToOrderStatus(mpStatus: string): OrderStatus {
  switch (mpStatus) {
    case "approved":
      return ORDER_STATUS.PAGAMENTO_APROVADO;
    case "pending":
    case "in_process":
    case "authorized":
      return ORDER_STATUS.AGUARDANDO_PAGAMENTO;
    case "rejected":
      return ORDER_STATUS.PAGAMENTO_RECUSADO;
    case "cancelled":
    case "refunded":
    case "charged_back":
      return ORDER_STATUS.CANCELADO;
    default:
      return ORDER_STATUS.AGUARDANDO_PAGAMENTO;
  }
}

/**
 * Ações disponíveis para o cliente em cada status
 */
export function getClientActions(status: OrderStatus): Array<{
  id: string;
  label: string;
  description: string;
  variant: "primary" | "secondary" | "danger";
}> {
  const actionMap: Record<
    OrderStatus,
    Array<{
      id: string;
      label: string;
      description: string;
      variant: "primary" | "secondary" | "danger";
    }>
  > = {
    AGUARDANDO_PAGAMENTO: [
      {
        id: "retry",
        label: "Continuar pagamento",
        description: "Retomar o pagamento no Mercado Pago",
        variant: "primary",
      },
      {
        id: "changeAddress",
        label: "Mudar endereço",
        description: "Altere o endereço de entrega antes do pagamento",
        variant: "secondary",
      },
      {
        id: "cancel",
        label: "Cancelar compra",
        description: "Desistir desta compra",
        variant: "danger",
      },
    ],
    PAGAMENTO_RECUSADO: [
      {
        id: "retry",
        label: "Tentar novamente",
        description: "Tente pagar novamente com outro meio",
        variant: "primary",
      },
      {
        id: "cancel",
        label: "Cancelar",
        description: "Desistir desta compra",
        variant: "danger",
      },
    ],
    PAGAMENTO_APROVADO: [
      {
        id: "contact",
        label: "Dúvidas?",
        description: "Envie uma mensagem se tiver dúvidas",
        variant: "secondary",
      },
    ],
    PREPARANDO_ENVIO: [
      {
        id: "contact",
        label: "Dúvidas?",
        description: "Envie uma mensagem se tiver dúvidas",
        variant: "secondary",
      },
    ],
    ENVIADO: [
      {
        id: "track",
        label: "Rastrear",
        description: "Acompanhe seu pacote",
        variant: "secondary",
      },
      {
        id: "contact",
        label: "Dúvidas?",
        description: "Envie uma mensagem se tiver dúvidas",
        variant: "secondary",
      },
    ],
    ENTREGUE: [
      {
        id: "review",
        label: "Deixar avaliação",
        description: "Avalie seus produtos",
        variant: "secondary",
      },
      {
        id: "requestRefund",
        label: "Solicitar devolução",
        description: "Se encontrou algum problema",
        variant: "secondary",
      },
    ],
    REEMBOLSO_SOLICITADO: [
      {
        id: "contact",
        label: "Contato",
        description: "Fale conosco sobre seu reembolso",
        variant: "secondary",
      },
    ],
    REEMBOLSADO: [],
    CANCELADO: [],
  };

  return actionMap[status] || [];
}
