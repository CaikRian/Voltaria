"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { addressSchema } from "@/lib/validators";

export type AddressFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

function parseForm(formData: FormData) {
  return {
    label: formData.get("label"),
    name: formData.get("name"),
    cep: formData.get("cep"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement") ?? "",
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    state: formData.get("state"),
    isDefault: formData.get("isDefault") === "on",
  };
}

export async function createAddress(_prev: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  await prisma.$transaction(async (tx) => {
    if (d.isDefault) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    await tx.address.create({ data: { ...d, complement: d.complement || null, userId: user.id } });
  });

  revalidatePath("/conta/dados");
  return { success: true };
}

// id vem via .bind na página.
export async function updateAddress(
  id: string,
  _prev: AddressFormState,
  formData: FormData
): Promise<AddressFormState> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  // A checagem de dono É a query — não um "if" depois do fetch.
  const owned = await prisma.address.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owned) return { error: "Endereço não encontrado." };

  await prisma.$transaction(async (tx) => {
    if (d.isDefault) {
      await tx.address.updateMany({ where: { userId: user.id, NOT: { id } }, data: { isDefault: false } });
    }
    await tx.address.update({ where: { id }, data: { ...d, complement: d.complement || null } });
  });

  revalidatePath("/conta/dados");
  return { success: true };
}

export async function deleteAddress(id: string) {
  const user = await requireUser();
  // deleteMany com filtro de dono embutido: se o id não for do usuário, é um
  // no-op seguro (0 linhas afetadas) em vez de um delete cego seguido de checagem.
  await prisma.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/conta/dados");
}

export async function setDefaultAddress(id: string) {
  const user = await requireUser();
  const owned = await prisma.address.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owned) return; // não é seu — ignora silenciosamente, mesmo padrão de getOrderForUser

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/conta/dados");
}
