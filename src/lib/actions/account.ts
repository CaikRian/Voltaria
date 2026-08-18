"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { deleteAccountSchema, passwordChangeSchema, profileSchema } from "@/lib/validators";

export type AccountFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
  profile?: { name: string; email: string };
};

export async function updateProfileAction(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const sessionUser = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"), email: formData.get("email"), currentPassword: formData.get("currentPassword") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const account = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { email: true, passwordHash: true } });
  if (!account) return { error: "Conta não encontrada." };
  const emailChanged = parsed.data.email !== account.email;

  if (emailChanged && !account.passwordHash) {
    return { error: "O e-mail desta conta é administrado pelo provedor de login e não pode ser alterado aqui." };
  }
  if (emailChanged && !(await bcrypt.compare(parsed.data.currentPassword, account.passwordHash!))) {
    return { error: "Informe sua senha atual corretamente para alterar o e-mail." };
  }

  try {
    await prisma.user.update({ where: { id: sessionUser.id }, data: { name: parsed.data.name, email: parsed.data.email } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Este e-mail já está vinculado a outra conta." };
    }
    throw error;
  }

  revalidatePath("/conta");
  revalidatePath("/conta/dados");
  return {
    success: emailChanged ? "Dados atualizados. Use o novo e-mail no próximo acesso." : "Nome atualizado com sucesso.",
    profile: { name: parsed.data.name, email: parsed.data.email },
  };
}

export async function changePasswordAction(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const sessionUser = await requireUser();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const account = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { passwordHash: true } });
  if (!account) return { error: "Conta não encontrada." };
  if (account.passwordHash && !(await bcrypt.compare(parsed.data.currentPassword, account.passwordHash))) {
    return { error: "A senha atual está incorreta." };
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });
  return { success: account.passwordHash ? "Senha alterada com sucesso." : "Senha criada. Agora você também pode entrar com e-mail e senha." };
}

export async function deleteAccountAction(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const sessionUser = await requireUser();
  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"), currentPassword: formData.get("currentPassword") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const account = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { passwordHash: true } });
  if (!account) return { error: "Conta não encontrada." };
  if (account.passwordHash && !(await bcrypt.compare(parsed.data.currentPassword, account.passwordHash))) {
    return { error: "A senha atual está incorreta." };
  }

  const activeOrder = await prisma.order.findFirst({
    where: { userId: sessionUser.id, status: { in: ["AGUARDANDO_PAGAMENTO", "PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO", "REEMBOLSO_SOLICITADO"] } },
    select: { id: true },
  });
  if (activeOrder) return { error: "Sua conta possui um pedido em andamento. Aguarde sua conclusão ou cancelamento antes de excluir os dados." };

  await prisma.$transaction(async (tx) => {
    await tx.orderMessage.deleteMany({ where: { userId: sessionUser.id } });
    await tx.order.updateMany({
      where: { userId: sessionUser.id },
      data: {
        userId: null, email: "conta-removida@deleted.invalid", shipName: null, shipCep: null,
        shipStreet: null, shipNumber: null, shipComplement: null, shipNeighborhood: null,
        shipCity: null, shipState: null, trackingCode: null, trackingUrl: null,
      },
    });
    await tx.user.delete({ where: { id: sessionUser.id } });
  });

  await signOut({ redirectTo: "/" });
  return { success: "Conta excluída." };
}
