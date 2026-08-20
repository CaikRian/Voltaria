"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema, loginSchema } from "@/lib/validators";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/customer-email";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

function verificationCode() {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token.trim().toUpperCase()).digest("hex");
}

async function issueVerification(email: string, name?: string | null) {
  const code = verificationCode();
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({ data: { identifier: email, token: hashToken(code), expires: new Date(Date.now() + 24 * 60 * 60 * 1000) } }),
  ]);
  return sendVerificationEmail({ email, name, code });
}

// --- Cadastro ---
export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    cpf: formData.get("cpf"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender"),
    referralSource: formData.get("referralSource"),
    cep: formData.get("cep"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement") ?? "",
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    state: formData.get("state"),
    allowEmailUpdates: formData.get("allowEmailUpdates") === "on",
    allowWhatsappUpdates: formData.get("allowWhatsappUpdates") === "on",
    captchaChallenge: formData.get("captchaChallenge"),
    captchaAnswer: formData.get("captchaAnswer"),
    botTrap: formData.get("website") ?? "",
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, cpf, phone, email, password, allowEmailUpdates, allowWhatsappUpdates } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }
  const existingCpf = await prisma.user.findUnique({ where: { cpf } });
  if (existingCpf) return { error: "Este CPF já está vinculado a uma conta." };

  // Hash da senha — NUNCA salvamos a senha em texto puro.
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, cpf, phone, email, passwordHash, role: "CLIENTE", dateOfBirth: new Date(`${parsed.data.dateOfBirth}T12:00:00.000Z`), gender: parsed.data.gender, referralSource: parsed.data.referralSource, allowEmailUpdates, allowWhatsappUpdates, communicationConsentAt: new Date() } });
      await tx.address.create({ data: { userId: user.id, label: "Casa", name, cep: parsed.data.cep, street: parsed.data.street, number: parsed.data.number, complement: parsed.data.complement || null, neighborhood: parsed.data.neighborhood, city: parsed.data.city, state: parsed.data.state, isDefault: true } });
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { error: "E-mail ou CPF já cadastrado." };
    throw error;
  }
  const sent = await issueVerification(email, name);
  redirect(`/verificar-email?email=${encodeURIComponent(email)}&enviado=${sent.ok ? "1" : "0"}`);
}

export async function verifyEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!email || !code) return { error: "Informe o e-mail e o código de confirmação." };
  const token = await prisma.verificationToken.findUnique({ where: { token: hashToken(code) } });
  if (!token || token.identifier !== email || token.expires < new Date()) return { error: "Código inválido ou expirado. Solicite um novo código." };
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, emailVerified: true } });
  if (!user) return { error: "Conta não encontrada." };
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: user.emailVerified || new Date() } }),
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
  ]);
  if (!user.emailVerified) await sendWelcomeEmail(user);
  return { success: "E-mail confirmado! Sua conta está pronta e você já pode entrar." };
}

export async function resendVerificationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const generic = "Se a conta estiver aguardando confirmação, enviaremos um novo código.";
  const user = await prisma.user.findUnique({ where: { email }, select: { email: true, name: true, emailVerified: true } });
  if (!user || user.emailVerified) return { success: generic };
  const recent = await prisma.verificationToken.findFirst({ where: { identifier: email, expires: { gt: new Date(Date.now() + 23 * 60 * 60 * 1000) } } });
  if (!recent) await issueVerification(user.email, user.name);
  return { success: generic };
}

// --- Login ---
export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/conta",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "E-mail ou senha incorretos." };
    }
    throw e; // redirect: precisa propagar
  }
  return {};
}
