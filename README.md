# Heca - Store — E-commerce (Next.js 15 + Prisma)

Loja de eletrônicos e produtos gerais. Base pronta para produção: catálogo,
carrinho persistente, checkout preparado para Mercado Pago, SEO e design responsivo.

## Como rodar (3 passos)

Requisitos: **Node.js 18.18+** e internet liberada (o Prisma baixa o engine na 1ª vez).

```bash
npm install        # instala dependências
npm run setup      # gera o client Prisma, cria o banco (SQLite) e popula com produtos
npm run dev        # sobe em http://localhost:3000
```

Pronto. A loja abre com 12 produtos e 4 usuários de teste.

## Autenticação e papéis

Login por e-mail/senha (hash bcrypt) + Google opcional, via **Auth.js (NextAuth v5)**.

### Usuários de teste (senha: `Senha123`)

| E-mail | Papel | Acessa o painel? |
|---|---|:---:|
| `admin@hecabrasil.com.br` | Administrador | ✅ tudo |
| `gerente@hecabrasil.com.br` | Gerente | ✅ + preços/usuários |
| `vendedor@hecabrasil.com.br` | Vendedor | ✅ produtos/pedidos |
| `cliente@hecabrasil.com.br` | Cliente | ❌ (só área do cliente) |

### Configuração

O `.env` já vem com um `AUTH_SECRET` de desenvolvimento. **Para produção**, gere um novo:

```bash
npx auth secret
```

Para ativar o **login com Google**, preencha `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` no `.env`
(credenciais em https://console.cloud.google.com/apis/credentials). Se ficarem vazios, o botão do
Google simplesmente não aparece.

### Como a segurança está estruturada

- **Rotas protegidas** (`/conta`, `/painel`) pelo `middleware.ts`.
- **Trava de papel no servidor** — o painel checa o papel via `requireStaff()`, não só escondendo o
  link. `src/lib/permissions.ts` tem a matriz de permissões (`can(role, capability)`).
- **Senhas com hash** (bcrypt, custo 12) — nunca em texto puro.
- **Sessão JWT** de 7 dias (Credentials exige JWT no Auth.js). Controle de dispositivos/revogação
  fica como evolução futura.

Páginas: `/login`, `/cadastro`, `/conta` (cliente), `/painel` (staff).

## Painel: gerenciar produtos

Em `/painel/produtos` (login como vendedor, gerente ou admin) você pode:

- **Listar e buscar** produtos, ver estoque e status (ativo/inativo/destaque)
- **Criar** produto novo (`/painel/produtos/novo`) com nome, descrição, categoria, imagem e variações
- **Editar**, **repor estoque** e ativar/desativar
- **Excluir** (apenas Gerente/Admin)

Regra de preço aplicada de verdade: o **Vendedor** edita produtos mas o campo de preço fica travado —
só **Gerente/Admin** alteram preços. E isso é garantido no servidor: mesmo forjando o formulário, o
preço não muda se o papel não tiver a permissão `product:price`.

As imagens usam URL por enquanto (o jeito mais simples e sem custo). Upload de arquivo pode ser
plugado depois com Supabase Storage ou UploadThing.

> Se `npm run setup` falhar no download do Prisma, rode `npx prisma generate`
> novamente com internet aberta. O sandbox onde este projeto foi gerado bloqueia
> o domínio do Prisma, mas na sua máquina funciona normalmente.

## Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:studio` | Abre o Prisma Studio (editor visual do banco) |
| `npm run db:seed` | Repopula os produtos de exemplo |

## Estrutura

```
src/
  app/                    # rotas (App Router)
    page.tsx              # home
    produtos/             # listagem + busca + filtros
    produtos/[slug]/      # detalhe do produto (SEO + Schema.org)
    checkout/             # checkout (pronto p/ Mercado Pago)
    sitemap.ts, robots.ts # SEO técnico
  components/             # Header, Footer, ProductCard, CartDrawer, AddToCart
    ui/                   # design system (Button, Price)
  lib/
    prisma.ts             # client singleton
    products.ts           # camada de acesso a dados (única fonte de queries)
    format.ts             # moeda, desconto, parcelamento
  store/
    cart.ts               # carrinho (Zustand + persist no localStorage)
prisma/
  schema.prisma           # modelo do banco
  seed.ts                 # produtos de exemplo
```

## Decisões de arquitetura

- **Monólito modular** — na escala inicial (100 produtos), microserviços seriam
  over-engineering. Cada módulo é isolado o suficiente para extrair depois se precisar.
- **Dinheiro em centavos (Int)** — nunca `Float`, para evitar erro de arredondamento.
- **Camada `lib/products.ts`** — toda query passa por aqui; trocar de banco muda 1 arquivo.
- **ISR na home** (`revalidate = 60`) — rápida como estática, mas atualiza sozinha.
- **SEO nativo** — metadados dinâmicos por produto, dados estruturados Schema.org,
  sitemap e robots automáticos.

## Migrar para PostgreSQL (produção)

1. Crie um banco grátis no [Neon](https://neon.tech) ou [Supabase](https://supabase.com).
2. Em `.env`, troque `DATABASE_URL` pela string do Postgres.
3. Em `prisma/schema.prisma`, mude `provider = "sqlite"` para `"postgresql"`.
4. Rode `npx prisma db push && npm run db:seed`.

## Próximos passos sugeridos

1. ~~**Autenticação** — Auth.js (login e-mail + Google/Apple)~~ ✅ pronto (só falta Apple).
2. ~~**Pagamentos** — Mercado Pago (PIX, cartão, boleto, webhook)~~ ✅ pronto (sandbox).
3. ~~**Gestão de pedidos no painel** — listar pedidos em `/painel/pedidos`, atualizar status
   de envio, histórico de status (`OrderStatusEvent` com timestamp para a linha do tempo)~~
   ✅ pronto.
4. ~~**Área do cliente** — histórico de pedidos + linha do tempo de status em `/conta`~~
   ✅ pronto.
5. ~~**Avaliações e dúvidas** — `Review` (com regra de compra verificada) e `Question`
   (pergunta + resposta do vendedor)~~ ✅ pronto.
6. ~~**Animações/loading** — `motion` para transições, skeletons e UI otimista,
   respeitando `prefers-reduced-motion`~~ ✅ pronto.
7. **Cálculo de frete** — integração com Correios / Melhor Envio.
