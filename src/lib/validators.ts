import { z } from "zod";
import { SHIPPING_OPTION_IDS } from "@/lib/shipping";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome"),
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
  });

export type RegisterInput = z.infer<typeof registerSchema>;

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
export const ORDER_STATUSES = ["PENDENTE", "PAGO", "ENVIADO", "ENTREGUE", "CANCELADO"] as const;

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z
    .string()
    .trim()
    .max(280, "Nota muito longa (máx. 280 caracteres)")
    .optional()
    .or(z.literal("")),
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
