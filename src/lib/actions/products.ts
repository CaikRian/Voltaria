"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability, getCurrentUser } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { productSchema } from "@/lib/validators";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// Detecta violação de unicidade (SKU/slug duplicado) sem depender dos tipos do Prisma.
function isUniqueError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

// Reais → centavos (dinheiro sempre em Int).
const toCents = (reais: number) => Math.round(reais * 100);

// Gera slug amigável a partir do nome.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Garante slug único (acrescenta -2, -3... se já existir).
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = base || "produto";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await prisma.product.findUnique({ where: { slug } });
    if (!found || found.id === ignoreId) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

// Lê o FormData e monta o objeto para validação.
function parseForm(formData: FormData) {
  let variants: unknown = [];
  try {
    variants = JSON.parse(String(formData.get("variants") ?? "[]"));
  } catch {
    variants = [];
  }
  const compareRaw = formData.get("compareAt");
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    brand: formData.get("brand") ?? "",
    categoryId: formData.get("categoryId"),
    price: formData.get("price"),
    compareAt: compareRaw ? compareRaw : undefined,
    imageUrl: formData.get("imageUrl"),
    stock: formData.get("stock") ?? 0,
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    variants,
  };
}

// --- Criar ---
export async function createProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireCapability("product:create");

  const parsed = productSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const slug = await uniqueSlug(slugify(d.name));

  try {
    await prisma.product.create({
      data: {
        name: d.name,
        slug,
        description: d.description,
        brand: d.brand || null,
        categoryId: d.categoryId,
        priceCents: toCents(d.price),
        compareCents: d.compareAt ? toCents(d.compareAt) : null,
        imageUrl: d.imageUrl,
        stock: d.stock,
        featured: d.featured,
        active: d.active,
        variants: d.variants.length
          ? {
              create: d.variants.map((v) => ({
                name: v.name,
                sku: v.sku,
                stock: v.stock,
                priceCents: v.price ? toCents(v.price) : null,
              })),
            }
          : undefined,
      },
    });
  } catch (e) {
    if (isUniqueError(e)) {
      return { error: "Já existe um produto ou SKU com esse valor." };
    }
    throw e;
  }

  revalidatePath("/painel/produtos");
  revalidatePath("/produtos");
  redirect("/painel/produtos");
}

// --- Editar (id vem via .bind na página) ---
export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireCapability("product:update");
  const user = await getCurrentUser();

  const parsed = productSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { priceCents: true, compareCents: true },
  });
  if (!existing) return { error: "Produto não encontrado." };

  // TRAVA DE SEGURANÇA: quem não tem "product:price" não altera preço,
  // mesmo que forje o formulário. Mantemos o preço atual do banco.
  const canPrice = can(user?.role, "product:price");
  const priceCents = canPrice ? toCents(d.price) : existing.priceCents;
  const compareCents = canPrice
    ? d.compareAt
      ? toCents(d.compareAt)
      : null
    : existing.compareCents;

  const slug = await uniqueSlug(slugify(d.name), id);

  try {
    // Substitui as variações (apaga e recria) — abordagem simples e confiável.
    await prisma.$transaction([
      prisma.variant.deleteMany({ where: { productId: id } }),
      prisma.product.update({
        where: { id },
        data: {
          name: d.name,
          slug,
          description: d.description,
          brand: d.brand || null,
          categoryId: d.categoryId,
          priceCents,
          compareCents,
          imageUrl: d.imageUrl,
          stock: d.stock,
          featured: d.featured,
          active: d.active,
          variants: d.variants.length
            ? {
                create: d.variants.map((v) => ({
                  name: v.name,
                  sku: v.sku,
                  stock: v.stock,
                  priceCents: v.price ? toCents(v.price) : null,
                })),
              }
            : undefined,
        },
      }),
    ]);
  } catch (e) {
    if (isUniqueError(e)) {
      return { error: "SKU duplicado em uma das variações." };
    }
    throw e;
  }

  revalidatePath("/painel/produtos");
  revalidatePath("/produtos");
  revalidatePath(`/produtos/${slug}`);
  redirect("/painel/produtos");
}

// --- Excluir ---
export async function deleteProduct(id: string) {
  await requireCapability("product:delete");
  await prisma.product.delete({ where: { id } }); // variações caem em cascata
  revalidatePath("/painel/produtos");
  revalidatePath("/produtos");
  redirect("/painel/produtos");
}
