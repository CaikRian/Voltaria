"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema, loginSchema } from "@/lib/validators";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// --- Cadastro ---
export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    cpf: formData.get("cpf"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
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
      const user = await tx.user.create({ data: { name, cpf, phone, email, passwordHash, role: "CLIENTE", dateOfBirth: new Date(`${parsed.data.dateOfBirth}T12:00:00.000Z`), referralSource: parsed.data.referralSource, allowEmailUpdates, allowWhatsappUpdates, communicationConsentAt: new Date() } });
      await tx.address.create({ data: { userId: user.id, label: "Casa", name, cep: parsed.data.cep, street: parsed.data.street, number: parsed.data.number, complement: parsed.data.complement || null, neighborhood: parsed.data.neighborhood, city: parsed.data.city, state: parsed.data.state, isDefault: true } });
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { error: "E-mail ou CPF já cadastrado." };
    throw error;
  }

  // Loga automaticamente após cadastrar e leva para a área do cliente.
  // (redirectTo lança um redirect que deve propagar — por isso o try/catch abaixo.)
  try {
    await signIn("credentials", { email, password, redirectTo: "/conta" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Conta criada, mas falha ao entrar. Tente o login." };
    throw e; // redirect: precisa propagar
  }
  return {};
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
