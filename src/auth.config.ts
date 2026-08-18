import type { NextAuthConfig } from "next-auth";

// Config "leve" — SEM Prisma e SEM bcrypt, para poder rodar no Edge (middleware).
// Aqui ficam só páginas e callbacks. Os provedores reais entram em auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    // Grava id e papel do usuário dentro do token JWT no login.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "CLIENTE";
      }
      return token;
    },
    // Expõe id e papel na sessão que o app lê.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "CLIENTE";
      }
      return session;
    },
    // Proteção de rotas no middleware. Retornar false → redireciona ao login.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // Área do cliente e painel do vendedor exigem login.
      // (O papel específico do painel é checado dentro da página.)
      if (path.startsWith("/conta") || path.startsWith("/painel")) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [], // preenchido em auth.ts
} satisfies NextAuthConfig;
