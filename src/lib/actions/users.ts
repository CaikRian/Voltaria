"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-helpers";
import { userRoleSchema } from "@/lib/validators";
import { createTeamMemberSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";

export type UserRoleFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export type TeamMemberFormState = UserRoleFormState & { createdName?: string };

export async function createTeamMemberAction(_previous: TeamMemberFormState, formData: FormData): Promise<TeamMemberFormState> {
  const actingUser = await requireCapability("user:manage");
  if (actingUser.role !== "ADMIN") return { error: "Apenas administradores podem criar contas da equipe." };
  const parsed = createTeamMemberSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), role: formData.get("role"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existing) return { error: "Já existe uma conta com este e-mail." };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash } });
  revalidatePath("/painel/usuarios");
  return { success: true, createdName: parsed.data.name };
}

export async function deleteTeamMemberAction(userId: string): Promise<{ error?: string; success?: boolean }> {
  const actingUser = await requireCapability("user:manage");
  if (actingUser.role !== "ADMIN") return { error: "Apenas administradores podem excluir contas da equipe." };
  if (userId === actingUser.id) return { error: "Você não pode excluir sua própria conta." };
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true, _count: { select: { orders: true } } } });
  if (!target) return { error: "Conta não encontrada." };
  if (target.role === "CLIENTE") return { error: "Esta tela exclui apenas contas da equipe." };
  if (target._count.orders > 0) return { error: "Esta conta possui pedidos vinculados e não pode ser excluída. Altere o papel para Cliente." };
  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return { error: "O último administrador não pode ser excluído." };
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/painel/usuarios");
  return { success: true };
}

// userId vem via .bind na página. Guardas na ORDEM abaixo — existem especificamente
// pra fechar a brecha de "user:manage" ser concedido igualmente a GERENTE e ADMIN
// em lib/permissions.ts (a matriz não distingue os dois pra essa capacidade).
export async function updateUserRoleAction(
  userId: string,
  _prev: UserRoleFormState,
  formData: FormData
): Promise<UserRoleFormState> {
  const actingUser = await requireCapability("user:manage");

  // Ninguém edita o próprio papel por aqui — fecha autopromoção E autoexclusão
  // de acesso por engano (ex.: o único ADMIN se rebaixando sem querer).
  // Checado antes do Zod: a operação já é proibida pelo alvo, não vale validar
  // o payload primeiro.
  if (userId === actingUser.id) {
    return { error: "Você não pode alterar seu próprio papel." };
  }

  const parsed = userRoleSchema.safeParse({ role: formData.get("role") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Papel ATUAL do alvo direto do banco — nunca decidir segurança com base em
  // algo vindo do form/UI.
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { error: "Usuário não encontrado." };

  // Teto de ADMIN: só ADMIN concede OU toca numa conta que já é ADMIN. GERENTE
  // segue livre entre CLIENTE/VENDEDOR/GERENTE, mas não alcança ADMIN por aqui.
  const touchesAdminTier = parsed.data.role === "ADMIN" || target.role === "ADMIN";
  if (touchesAdminTier && actingUser.role !== "ADMIN") {
    return { error: "Apenas administradores podem conceder ou alterar o papel de Administrador." };
  }

  await prisma.user.update({ where: { id: userId }, data: { role: parsed.data.role } });

  // Sessão é JWT (auth.config.ts) — o papel novo só vale no próximo login de
  // quem foi afetado, não muda a sessão já aberta dela.
  revalidatePath("/painel/usuarios");
  return { success: true };
}
