import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware usa a config leve (edge-safe) só para proteger rotas.
export default NextAuth(authConfig).auth;

export const config = {
  // Só roda nas áreas protegidas — não pesa no resto do site.
  matcher: ["/conta/:path*", "/painel/:path*"],
};
