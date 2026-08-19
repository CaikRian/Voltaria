"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cpfSchema } from "@/lib/validators";

export type RecoveryState = { error?: string; success?: string; maskedEmail?: string; fieldErrors?: Record<string, string[]> };

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

export async function findAccountEmailAction(_previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const parsed = cpfSchema.safeParse(String(formData.get("cpf") ?? ""));
  if (!parsed.success) return { fieldErrors: { cpf: [parsed.error.issues[0]?.message ?? "CPF inválido"] } };
  const user = await prisma.user.findUnique({ where: { cpf: parsed.data }, select: { email: true } });
  if (!user) return { success: "Se houver uma conta vinculada a esse CPF, o e-mail será apresentado de forma protegida." };
  return { success: "Conta localizada com segurança.", maskedEmail: maskEmail(user.email) };
}

export async function requestPasswordResetAction(_previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { error: "A recuperação por e-mail ainda não foi configurada pela loja. Entre em contato pelo canal de atendimento." };
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  if (!identifier) return { fieldErrors: { identifier: ["Informe seu e-mail ou CPF"] } };
  const digits = identifier.replace(/\D/g, "");
  const user = await prisma.user.findFirst({ where: digits.length === 11 ? { cpf: digits } : { email: identifier }, select: { id: true, email: true, name: true } });
  const generic = { success: "Se os dados estiverem cadastrados, enviaremos as instruções para o e-mail da conta." };
  if (!user) return generic;
  const recent = await prisma.passwordResetToken.findFirst({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recent) return generic;
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.$transaction([prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }), prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000) } })]);
  const resetUrl = `${process.env.APP_URL}/redefinir-senha?token=${token}`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [user.email], subject: "Redefinição de senha — Voltaria", html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Redefina sua senha</h2><p>Olá, ${user.name ?? "cliente"}. Recebemos uma solicitação para redefinir a senha da sua conta.</p><p><a href="${resetUrl}" style="display:inline-block;background:#5b3df5;color:white;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Criar nova senha</a></p><p>Este link expira em 30 minutos e só pode ser usado uma vez. Se você não solicitou, ignore este e-mail.</p></div>` }) });
  if (!response.ok) { console.error("Falha ao enviar recuperação de senha", response.status); return { error: "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos." }; }
  return generic;
}

export async function resetPasswordAction(token: string, _previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return { fieldErrors: { password: ["Use ao menos 8 caracteres, com letra e número"] } };
  if (password !== confirm) return { fieldErrors: { confirm: ["As senhas não coincidem"] } };
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!reset || reset.expiresAt < new Date()) return { error: "Este link é inválido ou expirou. Solicite uma nova recuperação." };
  await prisma.$transaction([prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }), prisma.passwordResetToken.deleteMany({ where: { userId: reset.userId } })]);
  return { success: "Senha atualizada com sucesso. Você já pode entrar na sua conta." };
}
