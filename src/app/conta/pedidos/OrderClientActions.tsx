"use client";

import { useState } from "react";
import { cancelOrderAction, requestRefundAction, retryPaymentAction } from "@/lib/actions/orders";
import { getClientActions, ORDER_STATUS } from "@/lib/order-status";
import { Button } from "@/components/ui/Button";

type ClientOrderActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

export function OrderClientActions({
  orderId,
  status,
  reviewLinks = [],
  trackingNote,
}: {
  orderId: string;
  status: string;
  reviewLinks?: Array<{ id: string; label: string; href: string }>;
  trackingNote?: string | null;
}) {
  const [showModal, setShowModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ClientOrderActionState>({});

  const actions = getClientActions(status as any);

  if (actions.length === 0) return null;

  const handleCancelOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await cancelOrderAction(orderId, {}, formData);
    setState(result);
    setLoading(false);
    if (result.success) setShowModal(null);
  };

  const handleRequestRefund = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await requestRefundAction(orderId, {}, formData);
    setState(result);
    setLoading(false);
    if (result.success) setShowModal(null);
  };

  const handleRetryPayment = async () => {
    setLoading(true);
    const result = await retryPaymentAction(orderId);
    setState(result);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => {
            if (action.id === "review" && reviewLinks.length > 0) {
              setShowModal("review");
              return;
            }
            setShowModal(action.id);
          }}
          className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
            action.variant === "primary"
              ? "bg-brand text-white hover:bg-brand-dark"
              : action.variant === "danger"
                ? "bg-red-100 text-red-800 hover:bg-red-200"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          {action.label}
        </button>
      ))}

      {/* Modal para cancelar */}
      {showModal === "cancel" && (
        <Modal title="Cancelar pedido" onClose={() => setShowModal(null)}>
          <form onSubmit={handleCancelOrder} className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">Você deseja realmente cancelar este pedido?</p>
            <textarea
              name="reason"
              placeholder="Motivo do cancelamento (opcional)"
              className="rounded border border-gray-300 p-2 text-sm"
              rows={3}
            />
            {state.fieldErrors?.reason && (
              <p className="text-xs text-red-600">{state.fieldErrors.reason[0]}</p>
            )}
            {state.error && <p className="text-xs text-red-600">{state.error}</p>}
            {state.success && <p className="text-xs text-green-600">Pedido cancelado com sucesso!</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Cancelando..." : "Cancelar pedido"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowModal(null)}
                className="flex-1"
              >
                Voltar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal para reembolso */}
      {showModal === "requestRefund" && (
        <Modal title="Solicitar reembolso" onClose={() => setShowModal(null)}>
          <form onSubmit={handleRequestRefund} className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">Por que deseja devolver este pedido?</p>
            <textarea
              name="reason"
              placeholder="Motivo do reembolso"
              className="rounded border border-gray-300 p-2 text-sm"
              rows={3}
            />
            {state.fieldErrors?.reason && (
              <p className="text-xs text-red-600">{state.fieldErrors.reason[0]}</p>
            )}
            {state.error && <p className="text-xs text-red-600">{state.error}</p>}
            {state.success && (
              <p className="text-xs text-green-600">
                Reembolso solicitado! Você será contatado em breve.
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Enviando..." : "Solicitar reembolso"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowModal(null)}
                className="flex-1"
              >
                Voltar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal para tentar de novo */}
      {showModal === "retry" && (
        <Modal title="Tentar novamente" onClose={() => setShowModal(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">Você será redirecionado para tentar o pagamento novamente.</p>
            {state.error && <p className="text-xs text-red-600">{state.error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleRetryPayment} disabled={loading} className="flex-1">
                {loading ? "Redirecionando..." : "Continuar para pagamento"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowModal(null)}
                className="flex-1"
              >
                Voltar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal para rastreio */}
      {showModal === "track" && (
        <Modal title="Rastrear pedido" onClose={() => setShowModal(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              {trackingNote ||
                "Seu pedido foi enviado e está em trânsito. Você pode acompanhar com a transportadora ou entrar em contato com a nossa equipe."}
            </p>
            <Button variant="secondary" onClick={() => setShowModal(null)} className="w-full">
              Fechar
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal para avaliação */}
      {showModal === "review" && (
        <Modal title="Avaliar produto" onClose={() => setShowModal(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Selecione o produto para abrir a página de avaliação.
            </p>
            <div className="space-y-2">
              {reviewLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  className="block rounded border border-line bg-gray-50 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <Button variant="secondary" onClick={() => setShowModal(null)} className="w-full">
              Fechar
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal para contato */}
      {showModal === "contact" && (
        <Modal title="Fale conosco" onClose={() => setShowModal(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Você pode nos contatar via WhatsApp, email ou pelo chat interno do pedido.
            </p>
            <div className="space-y-2 text-sm">
              <p>
                <strong>WhatsApp:</strong> <a href="tel:+55" className="text-blue-600 hover:underline">Clicar aqui</a>
              </p>
              <p>
                <strong>Email:</strong> <a href="mailto:contato@loja.com" className="text-blue-600 hover:underline">contato@loja.com</a>
              </p>
            </div>
            <Button variant="secondary" onClick={() => setShowModal(null)} className="w-full">
              Fechar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
