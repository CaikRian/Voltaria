// Fonte única da verdade sobre "quem pode o quê".
// Começamos simples (papel → capacidades). Se um dia precisar de regras mais
// finas (por loja, por produto), dá pra evoluir sem quebrar quem consome `can()`.

export type Role = "CLIENTE" | "VENDEDOR" | "GERENTE" | "ADMIN";

export type Capability =
  | "product:read"
  | "product:create"
  | "product:update" // editar dados, repor estoque
  | "product:price" // alterar preços/descontos
  | "product:delete"
  | "order:read:own"
  | "order:read:all"
  | "order:update:status"
  | "review:write" // avaliar produto comprado
  | "question:ask"
  | "question:answer"
  | "content:moderate" // ocultar/reexibir avaliações e dúvidas
  | "customer:view" // visualizar perfil/histórico de clientes no painel
  | "user:manage" // gerenciar contas/vendedores
  | "settings:manage";

const MATRIX: Record<Role, Capability[]> = {
  CLIENTE: ["product:read", "order:read:own", "review:write", "question:ask"],
  VENDEDOR: [
    "product:read",
    "product:create",
    "product:update",
    "order:read:all",
    "order:update:status",
    "question:answer",
    "customer:view",
  ],
  GERENTE: [
    "product:read",
    "product:create",
    "product:update",
    "product:price",
    "product:delete",
    "order:read:all",
    "order:update:status",
    "question:answer",
    "content:moderate",
    "customer:view",
    "user:manage",
  ],
  ADMIN: [
    "product:read",
    "product:create",
    "product:update",
    "product:price",
    "product:delete",
    "order:read:all",
    "order:update:status",
    "question:answer",
    "content:moderate",
    "customer:view",
    "user:manage",
    "settings:manage",
  ],
};

// Papéis que têm acesso ao painel administrativo.
export const STAFF_ROLES: Role[] = ["VENDEDOR", "GERENTE", "ADMIN"];

export function can(role: string | undefined, capability: Capability): boolean {
  if (!role) return false;
  return MATRIX[role as Role]?.includes(capability) ?? false;
}

export function isStaff(role: string | undefined): boolean {
  return STAFF_ROLES.includes(role as Role);
}

export const ROLE_LABELS: Record<Role, string> = {
  CLIENTE: "Cliente",
  VENDEDOR: "Vendedor",
  GERENTE: "Gerente",
  ADMIN: "Administrador",
};
