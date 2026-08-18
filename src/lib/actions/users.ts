"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-helpers";
import { userRoleSchema } from "@/lib/validators";

export type UserRoleFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

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
