# 🚀 Guia de Deploy — Vercel + Supabase

Este documento orienta como publicar seu projeto **gratuitamente** usando Vercel (front) e Supabase (banco de dados).

## 📋 Pré-requisitos

- Conta GitHub (https://github.com/signup)
- Projeto já versionado com Git

## 🔧 Passo 1: Preparar o banco de dados (Supabase)

### 1.1 Criar conta Supabase
1. Acesse https://supabase.com
2. Clique em "Sign Up"
3. Escolha "Continue with GitHub" (mais rápido)
4. Autorize a integração

### 1.2 Criar um projeto
1. Clique em "New Project"
2. Escolha a organização padrão
3. Nome: `heca-store` (ou outro)
4. Senha: crie uma senha forte (anote!)
5. Região: deixe a padrão
6. Clique em "Create new project" e aguarde ~2 minutos

### 1.3 Obter a string de conexão PostgreSQL
1. Após criação, vá para **Settings** → **Database** → **Connection Pooling**
2. Escolha **Prisma** no dropdown
3. Copie a string inteira (algo como: `postgresql://postgres:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`)
4. **Substitua** `[PASSWORD]` pela senha que você criou
5. Guarde essa string — será usada como `DATABASE_URL` em produção

## 🔗 Passo 2: Configurar Prisma para PostgreSQL

### 2.1 Atualizar o schema Prisma
Abra `prisma/schema.prisma` e altere:

```prisma
datasource db {
  provider = "postgresql"  // era "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2.2 Fazer push do schema
```bash
# Quando testando localmente com Supabase (opcional)
DATABASE_URL="[sua-string-do-supabase]" npx prisma db push

# OU deixe para o Vercel fazer automaticamente no próximo passo
```

## 📤 Passo 3: Push do código para GitHub

### 3.1 Inicializar repositório (se ainda não fez)
```bash
cd c:\Users\Caik Rian\Downloads\minha-loja_v3\minha-loja_v3

git init
git add .
git commit -m "Initial commit: Heca Store e-commerce"
```

### 3.2 Criar repositório no GitHub
1. Acesse https://github.com/new
2. Nome: `minha-loja` (ou outro)
3. Descrição: "E-commerce de eletrônicos e produtos"
4. Deixe **private** ou **public** (como preferir)
5. Clique em "Create repository"

### 3.3 Conectar repositório local ao GitHub
```bash
git remote add origin https://github.com/[seu-usuario]/[seu-repo].git
git branch -M main
git push -u origin main
```

## 🌐 Passo 4: Deploy na Vercel

### 4.1 Conectar Vercel
1. Acesse https://vercel.com
2. Clique em "Sign Up"
3. Escolha "Continue with GitHub"
4. Autorize a integração Vercel
5. Clique em "Import Project"
6. Cole a URL do seu repositório GitHub ou selecione da lista
7. Clique em "Import"

### 4.2 Configurar variáveis de ambiente
Na tela de configuração do Vercel, adicione as seguintes **Environment Variables**:

| Variável | Valor | Origem |
|----------|-------|--------|
| `DATABASE_URL` | [sua-string-supabase] | Supabase (Passo 1.3) |
| `AUTH_SECRET` | [gerar novo] | Veja abaixo |
| `AUTH_GOOGLE_ID` | (opcional) | Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | (opcional) | Google Cloud Console |
| `MP_ACCESS_TOKEN` | [seu-token-MP] | Mercado Pago (produção) |
| `MP_PUBLIC_KEY` | [sua-chave-publica-MP] | Mercado Pago (produção) |
| `MP_WEBHOOK_SECRET` | [seu-webhook-secret] | Mercado Pago |
| `APP_URL` | `https://[seu-dominio-vercel].vercel.app` | Vercel |

#### Como gerar `AUTH_SECRET`
```bash
npx auth secret
# Copia o valor gerado e cola no Vercel
```

#### Obter credenciais Mercado Pago (Produção)
1. Acesse https://www.mercadopago.com.br/developers/panel
2. Vá para **Credenciais** e mude para **Produção**
3. Copie "Access Token" e "Public Key"
4. Para o webhook, configure em **Webhooks** e gere o segredo

### 4.3 Clicar em "Deploy"
1. Vercel iniciará o build automaticamente
2. Aguarde ~3-5 minutos
3. Quando terminar, verá um link como `https://minha-loja-xxxxx.vercel.app`

## ✅ Passo 5: Validar o deploy

### 5.1 Acessar a URL de produção
Clique no link gerado e teste:
- [ ] Página inicial carrega
- [ ] Pode navegar produtos
- [ ] Carrinho funciona
- [ ] Login funciona
- [ ] Painel do vendedor carrega (com as credenciais de teste)

### 5.2 Verificar logs
Se algo não funcionar:
1. No painel Vercel, clique em "Deployments"
2. Clique no deployment e vá para "Logs"
3. Procure por mensagens de erro

### 5.3 Testar webhook Mercado Pago
1. No painel Mercado Pago, vá para **Webhooks**
2. Configure URL: `https://[seu-dominio].vercel.app/api/webhooks/mercadopago`
3. Selecione eventos: `payment.created`, `payment.updated`
4. Clique em "Salvar"
5. Faça um teste de compra para verificar se o webhook chega

## 🎯 Próximos passos (opcional)

### Adicionar domínio personalizado
1. Compre um domínio em [Namecheap](https://namecheap.com), [Google Domains](https://domains.google), etc.
2. No painel Vercel, vá para **Settings** → **Domains**
3. Cole o domínio
4. Altere os DNS do seu provedor conforme as instruções do Vercel
5. Aguarde propagação (até 48h)

### Configurar variáveis por ambiente
Se quiser usar credenciais de teste no staging:
1. No Vercel, crie ambientes separados para `staging` e `production`
2. Configure diferentes valores de `APP_URL`, `MP_ACCESS_TOKEN`, etc.

### Monitorar performance
1. Vercel tem Analytics built-in
2. Vá para **Settings** → **Analytics** e ative
3. Acompanhe métricas de Web Vitals

## 🚨 Troubleshooting

### "DATABASE_URL não está definida"
- Verifique se adicionou a variável no Vercel → Settings → Environment Variables
- Redeploy após adicionar

### "Prisma não consegue conectar ao banco"
- Verifique se a string Supabase está correta
- Teste localmente: `DATABASE_URL="..." npx prisma studio`
- Confira firewall do Supabase (geralmente aceita qualquer IP por padrão)

### "Build falha com erro de Typescript"
- Rode localmente: `npm run build`
- Corrija os erros
- Faça commit e push novamente

### "Imagens não carregam em produção"
- Se estiver usando URLs externas, isso é normal
- Para uploads próprios, considere Supabase Storage ou Uploadthing

## 📚 Links úteis

- [Docs Vercel + Next.js](https://vercel.com/docs/frameworks/nextjs)
- [Docs Supabase + Prisma](https://supabase.com/docs/guides/database/connecting-to-prisma)
- [Auth.js em produção](https://authjs.dev/getting-started/deployment)
- [Mercado Pago Webhooks](https://developers.mercadopago.com.br/pt-BR/docs/webhooks)

---

**Dúvidas?** Volte aqui após executar os passos. Sucesso! 🎉
