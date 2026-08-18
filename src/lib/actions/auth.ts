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
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  // Hash da senha — NUNCA salvamos a senha em texto puro.
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { name, email, passwordHash, role: "CLIENTE" },
  });

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
