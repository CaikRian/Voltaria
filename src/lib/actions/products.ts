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

type AuditChange = { field: string; label: string; before: string; after: string };
const auditValue = (value: unknown) => value == null || value === "" ? "Não informado" : String(value);
function addChange(changes: AuditChange[], field: string, label: string, before: unknown, after: unknown) {
  const oldValue = auditValue(before);
  const newValue = auditValue(after);
  if (oldValue !== newValue) changes.push({ field, label, before: oldValue, after: newValue });
}
function money(cents: number | null | undefined) {
  return cents == null ? "Não informado" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function gallerySummary(value: string | null | undefined) {
  try { const images = JSON.parse(value ?? "[]"); return Array.isArray(images) ? `${images.length} imagem(ns): ${images.join(" | ") || "nenhuma"}` : "Nenhuma imagem"; } catch { return "Galeria inválida"; }
}
function variantSummary(variants: Array<{ name: string; sku: string; stock: number; priceCents: number | null }>) {
  if (!variants.length) return "Sem variações";
  return variants.map((variant) => `${variant.name} [${variant.sku}] · ${variant.stock} un. · ${variant.priceCents == null ? "herda o preço" : money(variant.priceCents)}`).join(" | ");
}
function actorData(actor: { id: string; name: string | null; email: string; role: string }) {
  return { actorId: actor.id, actorName: actor.name, actorEmail: actor.email, actorRole: actor.role };
}

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
  let gallery: unknown = [];
  try {
    variants = JSON.parse(String(formData.get("variants") ?? "[]"));
  } catch {
    variants = [];
  }
  try {
    gallery = JSON.parse(String(formData.get("gallery") ?? "[]"));
  } catch {
    gallery = [];
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
    gallery,
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
  const actor = await requireCapability("product:create");

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
        gallery: d.gallery.length ? JSON.stringify(d.gallery) : null,
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
        auditEvents: {
          create: {
            action: "CREATED",
            changes: JSON.stringify([{ field: "created", label: "Produto cadastrado", before: "—", after: "Cadastro inicial concluído" }]),
            ...actorData(actor),
          },
        },
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
  const actor = await requireCapability("product:update");
  const user = await getCurrentUser();

  const parsed = productSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { id },
    include: { category: { select: { name: true } }, variants: { orderBy: { name: "asc" } } },
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
  const nextCategory = d.categoryId === existing.categoryId
    ? existing.category
    : await prisma.category.findUnique({ where: { id: d.categoryId }, select: { name: true } });
  const nextGallery = d.gallery.length ? JSON.stringify(d.gallery) : null;
  const nextVariants = d.variants.map((variant) => ({ name: variant.name, sku: variant.sku, stock: variant.stock, priceCents: variant.price ? toCents(variant.price) : null })).sort((a, b) => a.name.localeCompare(b.name));
  const changes: AuditChange[] = [];
  addChange(changes, "name", "Nome", existing.name, d.name);
  addChange(changes, "description", "Descrição", existing.description, d.description);
  addChange(changes, "brand", "Marca", existing.brand, d.brand || null);
  addChange(changes, "category", "Categoria", existing.category.name, nextCategory?.name ?? d.categoryId);
  addChange(changes, "price", "Preço", money(existing.priceCents), money(priceCents));
  addChange(changes, "comparePrice", "Preço anterior", money(existing.compareCents), money(compareCents));
  addChange(changes, "image", "Imagem principal", existing.imageUrl, d.imageUrl);
  addChange(changes, "gallery", "Galeria", gallerySummary(existing.gallery), gallerySummary(nextGallery));
  addChange(changes, "stock", "Estoque simples", `${existing.stock} un.`, `${d.stock} un.`);
  addChange(changes, "active", "Visibilidade", existing.active ? "Ativo" : "Inativo", d.active ? "Ativo" : "Inativo");
  addChange(changes, "featured", "Destaque", existing.featured ? "Sim" : "Não", d.featured ? "Sim" : "Não");
  addChange(changes, "variants", "Variações", variantSummary(existing.variants), variantSummary(nextVariants));

  const inventoryChanged = existing.stock !== d.stock ||
    variantSummary(existing.variants) !== variantSummary(nextVariants);
  if (inventoryChanged) {
    const reservedOrders = await prisma.order.count({
      where: {
        stockReservationStatus: "RESERVED",
        items: { some: { productId: id } },
      },
    });
    if (reservedOrders > 0) {
      return { error: "Há pedidos com estoque reservado para este produto. Aguarde o pagamento ou cancelamento antes de alterar estoque e variações." };
    }
  }

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
          gallery: d.gallery.length ? JSON.stringify(d.gallery) : null,
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
      ...(changes.length ? [prisma.productAuditEvent.create({ data: { productId: id, action: "UPDATED", changes: JSON.stringify(changes), ...actorData(actor) } })] : []),
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
  const reservedOrders = await prisma.order.count({
    where: { stockReservationStatus: "RESERVED", items: { some: { productId: id } } },
  });
  if (reservedOrders > 0) {
    throw new Error("Não é possível excluir um produto com estoque reservado em pedidos pendentes.");
  }
  await prisma.product.delete({ where: { id } }); // variações caem em cascata
  revalidatePath("/painel/produtos");
  revalidatePath("/produtos");
  redirect("/painel/produtos");
}
