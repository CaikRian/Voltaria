import { z } from "zod";
import { SHIPPING_OPTION_IDS } from "@/lib/shipping";
import { ORDER_STATUS } from "@/lib/order-status";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf.slice(0, length).split("").reduce((total, number, index) => total + Number(number) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export const cpfSchema = z.string().transform((value) => value.replace(/\D/g, "")).refine(isValidCpf, "Informe um CPF válido");
export const phoneSchema = z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => /^(?:[1-9]{2})(?:9\d{8}|[2-8]\d{7})$/.test(value), "Informe um telefone com DDD válido");

export const registerSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome"),
    cpf: cpfSchema,
    phone: phoneSchema,
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida").refine((value) => {
      const date = new Date(`${value}T12:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }, "A data de nascimento não pode ser futura"),
    gender: z.enum(["Feminino", "Masculino", "Não binário", "Outro", "Prefiro não informar"], {
      errorMap: () => ({ message: "Escolha uma opção" }),
    }),
    referralSource: z.string().trim().min(1, "Escolha uma opção").max(80),
    cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido").transform((value) => value.replace(/\D/g, "")),
    street: z.string().trim().min(2, "Informe a rua").max(160),
    number: z.string().trim().min(1, "Informe o número").max(20),
    complement: z.string().trim().max(80).optional().or(z.literal("")),
    neighborhood: z.string().trim().min(2, "Informe o bairro").max(100),
    city: z.string().trim().min(2, "Informe a cidade").max(100),
    state: z.string().trim().length(2, "UF inválida").transform((value) => value.toUpperCase()),
    allowEmailUpdates: z.boolean().default(false),
    allowWhatsappUpdates: z.boolean().default(false),
    captchaChallenge: z.coerce.number().int(),
    captchaAnswer: z.coerce.number().int(),
    botTrap: z.string().max(0).optional(),
    email: z.string().email("E-mail inválido"),
    password: z
      .string()
      .min(8, "A senha deve ter ao menos 8 caracteres")
      .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
      .regex(/[0-9]/, "Inclua ao menos um número"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  })
  .refine((d) => d.captchaAnswer === d.captchaChallenge, {
    message: "Resposta do desafio incorreta",
    path: ["captchaAnswer"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// --- Perfil e segurança da conta ---
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120, "Nome muito longo"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  cpf: z.union([cpfSchema, z.literal("")]).optional().default(""),
  phone: z.union([phoneSchema, z.literal("")]).optional().default(""),
  allowEmailUpdates: z.boolean().default(false),
  allowWhatsappUpdates: z.boolean().default(false),
  currentPassword: z.string().optional().default(""),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().optional().default(""),
    newPassword: z.string().min(8, "A senha deve ter ao menos 8 caracteres").regex(/[A-Za-z]/, "Inclua ao menos uma letra").regex(/[0-9]/, "Inclua ao menos um número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  confirmation: z.literal("EXCLUIR", { errorMap: () => ({ message: "Digite EXCLUIR para confirmar" }) }),
  currentPassword: z.string().optional().default(""),
});

// --- Produtos (painel) ---
// Teto sensato em reais — sem isso, um erro de digitação (ex.: "5000000000" num
// campo de preço) vira centavos e estoura o limite do INT de 32 bits no banco
// (priceCents), quebrando até a listagem de produtos até alguém corrigir o dado
// direto no banco. R$ 999.999,99 é bem folgado pra qualquer item desta loja.
const MAX_PRICE_REAIS = 999999.99;

export const variantSchema = z.object({
  name: z.string().min(1, "Nome da variação"),
  sku: z.string().min(1, "SKU obrigatório"),
  price: z.coerce
    .number()
    .nonnegative()
    .max(MAX_PRICE_REAIS, "Preço muito alto (máx. R$ 999.999,99)")
    .optional(), // em reais; vazio = herda do produto
  stock: z.coerce.number().int().nonnegative().default(0),
});

export const productSchema = z.object({
  name: z.string().min(2, "Informe o nome do produto"),
  description: z.string().min(10, "Descrição muito curta (mín. 10 caracteres)"),
  brand: z.string().optional().or(z.literal("")),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  price: z.coerce
    .number()
    .positive("O preço deve ser maior que zero")
    .max(MAX_PRICE_REAIS, "Preço muito alto (máx. R$ 999.999,99)"), // em reais
  compareAt: z.coerce
    .number()
    .nonnegative()
    .max(MAX_PRICE_REAIS, "Preço muito alto (máx. R$ 999.999,99)")
    .optional(), // preço "de", em reais
  imageUrl: z.string().url("Informe uma URL de imagem válida"),
  gallery: z.array(z.string().url("Uma das imagens adicionais possui URL inválida")).max(8, "Use no máximo 8 imagens adicionais").default([]),
  stock: z.coerce.number().int().nonnegative().default(0),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  variants: z.array(variantSchema).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

// --- Endereços (conta do cliente) ---
export const addressSchema = z.object({
  label: z.string().trim().min(1, "Dê um nome pro endereço (ex.: Casa, Trabalho)").max(40, "Nome muito longo"),
  name: z.string().trim().min(2, "Informe o nome do destinatário").max(120),
  cep: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido")
    .transform((v) => v.replace(/\D/g, "")), // normaliza pra 8 dígitos, sem máscara
  street: z.string().trim().min(2, "Informe a rua").max(160),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z.string().trim().max(80).optional().or(z.literal("")),
  neighborhood: z.string().trim().min(2, "Informe o bairro").max(100),
  city: z.string().trim().min(2, "Informe a cidade").max(100),
  state: z
    .string()
    .trim()
    .length(2, "UF inválida (2 letras)")
    .transform((v) => v.toUpperCase()),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

// --- Checkout ---
export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  variantName: z.string().optional(),
  qty: z.coerce.number().int().positive("Quantidade inválida"),
});

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  email: z.string().email("E-mail inválido"),
  cep: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido")
    .transform((v) => v.replace(/\D/g, "")),
  street: z.string().trim().min(2, "Informe a rua").max(160),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z.string().trim().max(80).optional().or(z.literal("")),
  neighborhood: z.string().trim().min(2, "Informe o bairro").max(100),
  city: z.string().trim().min(2, "Informe a cidade").max(100),
  state: z
    .string()
    .trim()
    .length(2, "UF inválida")
    .transform((v) => v.toUpperCase()),
  shippingOptionId: z.enum(SHIPPING_OPTION_IDS, {
    errorMap: () => ({ message: "Selecione uma opção de frete" }),
  }),
  saveAddress: z.coerce.boolean().optional().default(false),
  addressLabel: z.string().trim().max(40).optional().or(z.literal("")),
  items: z.array(checkoutItemSchema).min(1, "Seu carrinho está vazio"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// --- Pedidos (painel) ---
export const orderStatusSchema = z.object({
  status: z.nativeEnum(ORDER_STATUS),
  note: z
    .string()
    .trim()
    .max(280, "Nota muito longa (máx. 280 caracteres)")
    .optional()
    .or(z.literal("")),
  trackingCode: z.string().trim().max(60).optional().or(z.literal("")),
  trackingUrl: z.string().trim().url("Link inválido").optional().or(z.literal("")),
});

// --- Avaliações (Review) ---
export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Escolha uma nota de 1 a 5").max(5, "Nota inválida"),
  comment: z
    .string()
    .trim()
    .max(600, "Comentário muito longo (máx. 600 caracteres)")
    .optional()
    .or(z.literal("")),
});

// --- Dúvidas (Question) ---
export const questionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "Escreva sua pergunta (mín. 5 caracteres)")
    .max(500, "Pergunta muito longa (máx. 500 caracteres)"),
});

export const questionAnswerSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(2, "Escreva uma resposta")
    .max(800, "Resposta muito longa (máx. 800 caracteres)"),
});

// --- Usuários (painel) ---
export const USER_ROLES = ["CLIENTE", "VENDEDOR", "GERENTE", "ADMIN"] as const;

export const userRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export const createTeamMemberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120, "Nome muito longo"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  role: z.enum(["VENDEDOR", "GERENTE", "ADMIN"]),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").regex(/[A-Za-z]/, "Inclua ao menos uma letra").regex(/[0-9]/, "Inclua ao menos um número"),
});

// --- Chat-bot (widget flutuante) ---
export const CHAT_REASONS = [
  "Dúvida sobre produto",
  "Pedido e entrega",
  "Pagamento",
  "Troca ou devolução",
  "Reclamação",
  "Outro",
] as const;

export const chatEscalationSchema = z.object({
  visitorId: z.string().min(10).max(80),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  reason: z.enum(CHAT_REASONS, { errorMap: () => ({ message: "Escolha um motivo" }) }),
  orderRef: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Conte um pouco mais (mín. 5 caracteres)").max(1000, "Mensagem muito longa (máx. 1000 caracteres)"),
});

export const chatMessageSchema = z.object({
  text: z.string().trim().min(1, "Escreva uma mensagem").max(1000, "Mensagem muito longa (máx. 1000 caracteres)"),
});
