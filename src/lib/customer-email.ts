import "server-only";
import { sendBrevoEmail } from "@/lib/brevo-email";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

function layout(name: string | null | undefined, title: string, message: string, content = "") {
  return `<div style="background:#f6f4f8;padding:28px 12px;font-family:Arial,sans-serif;color:#211a27"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e8e1ec;border-radius:18px;overflow:hidden"><div style="background:#6d28d9;padding:22px 28px;color:#fff"><strong style="font-size:20px">Heca Store</strong></div><div style="padding:28px"><p style="color:#6b6470;margin-top:0">Olá, ${escapeHtml(name || "cliente")}.</p><h1 style="font-size:25px;margin:10px 0">${escapeHtml(title)}</h1><p style="line-height:1.6">${escapeHtml(message)}</p>${content}<p style="font-size:12px;color:#777;margin-top:26px">Este é um aviso automático da Heca Store. Não é uma mensagem promocional.</p></div></div></div>`;
}

function button(url: string, label: string) {
  return `<p style="margin-top:22px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a></p>`;
}

export async function sendVerificationEmail(input: { email: string; name?: string | null; code: string }) {
  const siteUrl = (process.env.APP_URL || "https://voltaria.vercel.app").replace(/\/$/, "");
  const url = `${siteUrl}/verificar-email?email=${encodeURIComponent(input.email)}&codigo=${encodeURIComponent(input.code)}`;
  const content = `<div style="background:#f7f4fa;border-radius:12px;padding:18px;margin:22px 0;text-align:center"><p style="margin:0 0 8px;color:#6b6470">Código de confirmação</p><strong style="font-size:24px;letter-spacing:4px">${escapeHtml(input.code)}</strong><p style="font-size:12px;color:#777;margin-bottom:0">Válido por 24 horas</p></div>${button(url, "Confirmar meu e-mail")}`;
  return sendBrevoEmail({ to: input.email, toName: input.name, subject: "Confirme seu e-mail — Heca Store", html: layout(input.name, "Confirme seu e-mail", "Use o código abaixo ou clique no botão para concluir a criação da sua conta.", content) });
}

export async function sendWelcomeEmail(input: { email: string; name?: string | null }) {
  const siteUrl = (process.env.APP_URL || "https://voltaria.vercel.app").replace(/\/$/, "");
  return sendBrevoEmail({ to: input.email, toName: input.name, subject: "Boas-vindas à Heca Store", html: layout(input.name, "Sua conta está pronta!", "Seu e-mail foi confirmado. Agora você pode entrar, comprar com mais rapidez e acompanhar pedidos e entregas em um só lugar.", button(`${siteUrl}/login`, "Entrar na minha conta")) });
}

export async function sendOrderChatEmail(input: { email: string; name?: string | null; orderId: string; message?: string | null; closed?: boolean }) {
  const siteUrl = (process.env.APP_URL || "https://voltaria.vercel.app").replace(/\/$/, "");
  const title = input.closed ? "Conversa encerrada" : "A equipe respondeu seu pedido";
  const message = input.closed ? "A conversa foi marcada como resolvida. Você pode enviar uma nova mensagem pelo pedido se ainda precisar de ajuda." : "Há uma nova resposta da equipe aguardando você.";
  const excerpt = input.message ? `<div style="background:#f7f4fa;border-radius:12px;padding:16px;margin:20px 0"><strong>Resposta:</strong><p style="margin-bottom:0">${escapeHtml(input.message.slice(0, 500))}</p></div>` : "";
  return sendBrevoEmail({ to: input.email, toName: input.name, subject: `${title} · Pedido #${input.orderId.slice(-8).toUpperCase()}`, html: layout(input.name, title, message, `${excerpt}${button(`${siteUrl}/conta/pedidos/${encodeURIComponent(input.orderId)}#chat`, "Abrir conversa")}`) });
}

export async function sendQuestionAnsweredEmail(input: { email: string; name?: string | null; productName: string; productSlug: string; answer: string }) {
  const siteUrl = (process.env.APP_URL || "https://voltaria.vercel.app").replace(/\/$/, "");
  const content = `<div style="background:#f7f4fa;border-radius:12px;padding:16px;margin:20px 0"><strong>${escapeHtml(input.productName)}</strong><p style="margin-bottom:0">${escapeHtml(input.answer)}</p></div>${button(`${siteUrl}/produtos/${encodeURIComponent(input.productSlug)}`, "Ver resposta no produto")}`;
  return sendBrevoEmail({ to: input.email, toName: input.name, subject: `Sua dúvida sobre ${input.productName} foi respondida`, html: layout(input.name, "Sua dúvida foi respondida", "A equipe publicou uma resposta para sua pergunta sobre o produto.", content) });
}

export async function sendGeneralChatEmail(input: { email: string; name?: string | null; sessionId: string; message?: string | null; closed?: boolean }) {
  const siteUrl = (process.env.APP_URL || "https://voltaria.vercel.app").replace(/\/$/, "");
  const title = input.closed ? "Atendimento encerrado" : "Você recebeu uma resposta";
  const text = input.closed ? "Seu atendimento foi marcado como concluído." : "Nossa equipe respondeu sua conversa no atendimento do site.";
  const excerpt = input.message ? `<div style="background:#f7f4fa;border-radius:12px;padding:16px;margin:20px 0">${escapeHtml(input.message.slice(0, 500))}</div>` : "";
  return sendBrevoEmail({ to: input.email, toName: input.name, subject: `${title} — Heca Store`, html: layout(input.name, title, text, `${excerpt}${button(siteUrl, "Voltar para a loja")}`) });
}
