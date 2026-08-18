# CLAUDE.md — Voltaria (E-commerce)

Este arquivo orienta o Claude Code. Leia antes de qualquer alteração e siga as
convenções abaixo. Quando propuser mudanças grandes, use o **plan mode** e espere aprovação.

## Visão geral

E-commerce de eletrônicos e produtos gerais ("Voltaria"). Loja de escala pequena
(até ~100 produtos, poucos pedidos/dia) com prioridade em **baixo custo** e **fácil manutenção**.
O dono é dev, então o código deve ser limpo e explicado — sem gambiarra.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Prisma** ORM — SQLite em dev, PostgreSQL em produção
- **Auth.js (NextAuth v5)** — e-mail/senha (bcrypt) + Google opcional
- **Tailwind CSS** (design tokens próprios, ver `tailwind.config.ts`)
- **Zustand** — estado do carrinho (persistido no localStorage)
- **Zod** — validação de formulários e server actions

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npm run setup      # prisma generate + db push + seed (primeira vez)
npm run db:seed    # repopula produtos e usuários de teste
npm run db:studio  # editor visual do banco
npm run build      # build de produção (roda prisma generate antes)
```

## Estrutura

```
src/
  app/
    (shop)                   páginas públicas: home, produtos, carrinho
    (auth)/login, /cadastro  telas de autenticação
    conta/                   área do cliente (protegida)
    painel/                  área de staff (protegida por papel)
      produtos/              CRUD de produtos
    api/auth/[...nextauth]/  handler do Auth.js
    sitemap.ts, robots.ts    SEO técnico
  components/                Header, Footer, ProductCard, CartDrawer, AuthButton...
    ui/                      design system (Button, Price)
  lib/
    prisma.ts                client singleton
    products.ts              acesso a dados da LOJA (leitura pública)
    admin.ts                 acesso a dados do PAINEL (inclui inativos)
    format.ts                moeda, desconto, parcelamento
    permissions.ts           matriz RBAC — can(role, capability)
    auth-helpers.ts          requireUser / requireStaff / requireCapability
    validators.ts            schemas Zod
    actions/                 server actions (auth.ts, products.ts)
  store/cart.ts              carrinho (Zustand)
  middleware.ts              protege /conta e /painel
prisma/
  schema.prisma              modelo do banco (fonte da verdade)
  seed.ts                    dados de exemplo
```

## Convenções que DEVEM ser mantidas

1. **Dinheiro sempre em centavos (Int).** Nunca `Float` para valores monetários.
   Converte para reais só na exibição (`formatBRL`). Campos: `priceCents`, `compareCents`.
2. **Toda query de leitura passa por `lib/products.ts` (loja) ou `lib/admin.ts` (painel).**
   Não espalhar `prisma.*` pelas páginas.
3. **Arquitetura: monólito modular.** Não introduzir microserviços, filas ou complexidade
   sem necessidade real de escala. Manter módulos desacoplados por pasta.
4. **Server Components por padrão.** Só usar `"use client"` quando houver interação/estado.
5. **Validação com Zod** em toda entrada de formulário e server action.
6. **Segurança no servidor, não só na UI** (ver abaixo).

## Segurança e permissões (RBAC)

Papéis: `CLIENTE`, `VENDEDOR`, `GERENTE`, `ADMIN`. A matriz vive em `lib/permissions.ts`
com a função `can(role, capability)`. Regras-chave:

- **Vendedor** gerencia produtos e estoque, mas **NÃO altera preço** (`product:price`).
- **Gerente/Admin** alteram preço, excluem produtos e gerenciam usuários.
- Rotas `/conta` e `/painel` são protegidas no `middleware.ts`; o papel específico do
  painel é checado no servidor com `requireStaff()` / `requireCapability()`.
- **NUNCA confiar só no front.** Toda server action revalida a permissão. Exemplo real:
  `updateProduct` ignora mudança de preço se o papel não tiver `product:price`, mesmo
  que o formulário seja forjado.
- Senhas com **bcrypt** (custo 12) — nunca em texto puro.

## Autenticação

- Auth.js v5 com estratégia **JWT** (Credentials exige JWT; não é possível session no banco
  com login e senha). Papel e id do usuário vão no token e na sessão.
- Config dividida: `auth.config.ts` (edge-safe, sem Prisma/bcrypt, usada no middleware)
  e `auth.ts` (completa, com adapter e provedores).
- Google só ativa se `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` existirem no `.env`.

### Usuários de teste (senha: `Senha123`)

- `admin@voltaria.com` (ADMIN), `gerente@voltaria.com` (GERENTE),
  `vendedor@voltaria.com` (VENDEDOR), `cliente@voltaria.com` (CLIENTE)

## Limitações conhecidas / gotchas

- **Prisma engine**: na 1ª instalação o Prisma baixa um binário de `binaries.prisma.sh`.
  Se der `ECONNRESET` (firewall/rede), rodar `npx prisma generate` de novo, trocar de rede
  ou usar `PRISMA_ENGINES_MIRROR`.
- **Imagens de produto**: por enquanto via URL (sem upload de arquivo). Migrar para
  Supabase Storage ou UploadThing quando necessário.
- **Variações**: no `updateProduct` são apagadas e recriadas (nada referencia o id delas ainda).
- **Papel via JWT**: alterar o `role` de um usuário no painel (`/painel/usuarios`) não afeta
  a sessão já aberta dela — o papel só é gravado no token no login (`jwt()` em
  `auth.config.ts`), nunca relido do banco depois. Só vale no próximo login da pessoa.
- **Status de pedidos**: SEMPRE usar as constantes em `lib/order-status.ts` — nunca hardcode
  strings de status. Permitir transições apenas via `ALLOWED_STATUS_TRANSITIONS`.

## Fluxo de Pedidos e Status (v2)

A partir de **[data da implementação]**, o sistema de status de pedidos foi redesenhado:

### Novo Fluxo de Status

- `AGUARDANDO_PAGAMENTO` — pedido criado, aguardando confirmação do pagamento na MP
- `PAGAMENTO_APROVADO` — pagamento confirmado pelo webhook da MP
- `PAGAMENTO_RECUSADO` — pagamento recusado; cliente pode tentar novamente
- `PREPARANDO_ENVIO` — entre aprovação e saída do armazém
- `ENVIADO` — pedido despachado
- `ENTREGUE` — cliente recebeu
- `REEMBOLSO_SOLICITADO` — cliente pediu devolução/reembolso
- `REEMBOLSADO` — reembolso processado
- `CANCELADO` — pedido cancelado (pode ser por cliente ou erro)

### Mudanças Implementadas

1. **Schema Prisma**:
   - `Order.status` agora segue enum em `lib/order-status.ts`
   - Novos campos: `reasonCancelled`, `refundReason`, `refundRequestedAt`, `canChangeAddress`, `abandonedAt`

2. **Server Actions** (`lib/actions/orders.ts`):
   - `cancelOrderAction()` — cliente cancela AGUARDANDO ou RECUSADO
   - `requestRefundAction()` — cliente pede reembolso ENTREGUE/ENVIADO
   - `retryPaymentAction()` — tenta pagar novamente após recusa

3. **Cleanup** (`lib/cleanup-orders.ts`):
   - `cleanupAbandonedOrders()` identifica AGUARDANDO > 30 min
   - Marca com `abandonedAt` (não cancela automaticamente)
   - Executável via cron job `/api/cron/cleanup-orders`

4. **Webhook Melhorado** (`app/api/webhooks/mercadopago/route.ts`):
   - Logging detalhado com prefixo `[MP Webhook]`
   - Idempotente (não duplica eventos)
   - Busca dados reais da MP (nunca confia no corpo)

5. **UI/UX**:
   - `OrderStatusBadge` com cores semânticas
   - `OrderClientActions` com modais de confirmação
   - Dashboard `/painel/pedidos/abandonados` para gerentes

### Como Usar

- **Criar pedido**: automaticamente status `AGUARDANDO_PAGAMENTO`
- **Webhook MP**: atualiza para `PAGAMENTO_APROVADO` ou `PAGAMENTO_RECUSADO`
- **Cliente quer cancelar**: `cancelOrderAction()` → transição validada
- **Cleanup automático**: via cron `/api/cron/cleanup-orders?token=CRON_SECRET`

Veja `NOVO_SISTEMA_STATUS.md` e `CHECKLIST_IMPLEMENTACAO.md` para detalhes completos.

## Roadmap (ordem sugerida)

1. **Pagamentos — Mercado Pago** (PIX, cartão, boleto + webhook). Gera `Order` de verdade.
   O checkout já tem o ponto de integração preparado.
2. **Gestão de pedidos no painel** — listar pedidos, atualizar status de envio,
   histórico de status (`OrderStatusEvent` com timestamp para a linha do tempo).
3. **Área do cliente** — histórico de pedidos + linha do tempo de status.
4. **Avaliações e dúvidas** — `Review` (com regra de compra verificada) e `Question`
   (pergunta + resposta do vendedor). Sanitizar conteúdo do usuário (XSS) e moderar.
5. **Camada de animações/loading** — `motion` (Framer Motion) para transições, skeletons
   e UI otimista. Respeitar `prefers-reduced-motion` (já configurado no CSS).

## O que NÃO fazer

- Não usar `localStorage` para dados sensíveis nem para estado que precise do servidor.
- Não colocar preço/estoque em `Float`.
- Não pular a validação Zod nem a checagem de permissão no servidor.
- Não adicionar dependências pesadas sem necessidade (foco em custo baixo).
- Não expor produtos inativos na loja pública (`active: false`).

## LGPD

Ao evoluir a área do cliente, implementar exportação e exclusão de dados da conta,
consentimento de cookies e política de privacidade.
