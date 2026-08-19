import type { Prisma } from "@prisma/client";

export type StockItem = {
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  qty: number;
};

export class InsufficientStockError extends Error {
  constructor(public readonly productName: string, public readonly variantName?: string | null) {
    super(`Estoque insuficiente para "${productName}"${variantName ? ` (${variantName})` : ""}.`);
    this.name = "InsufficientStockError";
  }
}

export async function reserveStock(tx: Prisma.TransactionClient, items: StockItem[]) {
  for (const item of items) {
    const result = item.variantId
      ? await tx.variant.updateMany({
          where: { id: item.variantId, productId: item.productId, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        })
      : await tx.product.updateMany({
          where: { id: item.productId, active: true, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
    if (result.count !== 1) throw new InsufficientStockError(item.productName, item.variantName);
  }
}

export async function releaseStock(tx: Prisma.TransactionClient, items: StockItem[]) {
  for (const item of items) {
    if (item.variantId) {
      await tx.variant.updateMany({
        where: { id: item.variantId, productId: item.productId },
        data: { stock: { increment: item.qty } },
      });
    } else {
      await tx.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: item.qty } },
      });
    }
  }
}
