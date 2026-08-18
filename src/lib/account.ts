import { prisma } from "@/lib/prisma";

export async function getAccountOverview(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true, image: true, passwordHash: true, createdAt: true,
      accounts: { select: { provider: true } },
      _count: { select: { orders: true, reviews: true, addresses: true } },
    },
  });
}
