import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, isStaff, type Capability, type Role } from "@/lib/permissions";

// Usuário atual (ou null). Use em Server Components.
// Valida o usuário contra o banco para evitar sessões antigas ou IDs obsoletos
// após reset do banco, o que causaria FK inválida em Order.userId.
export async function getCurrentUser() {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  const sessionEmail = session?.user?.email;

  if (!sessionUserId && !sessionEmail) return null;

  const user = sessionUserId
    ? await prisma.user.findUnique({
        where: { id: sessionUserId },
      })
    : await prisma.user.findUnique({
        where: { email: sessionEmail! },
      });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    phone: user.phone,
    cpf: user.cpf,
  };
}

// Exige login. Redireciona ao /login se não houver sessão.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Exige que o usuário tenha acesso de staff (painel). Redireciona se não tiver.
export async function requireStaff() {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect("/");
  return user;
}

// Exige uma capacidade específica (checagem de servidor — a real).
export async function requireCapability(capability: Capability) {
  const user = await requireUser();
  if (!can(user.role, capability)) redirect("/");
  return user;
}

// Exige um dos papéis informados.
export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) redirect("/");
  return user;
}
