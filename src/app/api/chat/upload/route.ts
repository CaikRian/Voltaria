import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json() as HandleUploadBody;
  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Não autorizado");
        const payload = JSON.parse(clientPayload ?? "{}") as { orderId?: string };
        if (!payload.orderId) throw new Error("Pedido inválido");
        const order = await prisma.order.findUnique({ where: { id: payload.orderId }, select: { userId: true, email: true } });
        if (!order || (!isStaff(user.role) && order.userId !== user.id && order.email !== user.email)) throw new Error("Sem acesso a este pedido");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ orderId: payload.orderId, userId: user.id }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha no upload" }, { status: 400 });
  }
}
