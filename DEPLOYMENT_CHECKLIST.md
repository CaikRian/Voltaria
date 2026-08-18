# ✅ Checklist — Deploy Gratuito (Vercel + Supabase)

Use este checklist para acompanhar o progresso do seu deployment.

## 📋 Fase 1: Preparação do Banco (Supabase)

- [ ] Criar conta em https://supabase.com (com GitHub é mais rápido)
- [ ] Criar novo projeto Supabase
- [ ] Copiar a string de conexão PostgreSQL (Connection Pooling → Prisma)
- [ ] Anotar a senha do banco em local seguro

## 🔧 Fase 2: Configurar Prisma para PostgreSQL

- [ ] Editar `prisma/schema.prisma`
  - Mudar `provider = "sqlite"` → `provider = "postgresql"`
- [ ] Testar localmente (opcional):
  ```bash
  DATABASE_URL="postgresql://..." npx prisma db push
  npx prisma studio  # verificar se conectou
  ```
- [ ] Se funcionou localmente, apagar o `prisma/dev.db` (não será mais usado)

## 📤 Fase 3: Versionamento no GitHub

- [ ] Ter Git instalado e configurado localmente
- [ ] Executar:
  ```bash
  cd minha-loja_v3
  git init
  git add .
  git commit -m "Initial commit: Voltaria e-commerce"
  ```
- [ ] Criar repositório em https://github.com/new
- [ ] Conectar e fazer push:
  ```bash
  git remote add origin https://github.com/[usuario]/[repo].git
  git branch -M main
  git push -u origin main
  ```
- [ ] Verificar se código está no GitHub (https://github.com/[usuario]/[repo])

## 🌐 Fase 4: Deploy na Vercel

### Conectar repositório
- [ ] Ir para https://vercel.com
- [ ] Clicar "Sign Up" → "Continue with GitHub"
- [ ] Clicar "Import Project"
- [ ] Selecionar o repositório `minha-loja` (ou colar URL)
- [ ] Clicar "Import"

### Adicionar variáveis de ambiente
Na tela de configuração, adicionar TODAS estas variáveis:

- [ ] `DATABASE_URL` = [string Supabase PostgreSQL]
- [ ] `AUTH_SECRET` = [gerar com `npx auth secret`]
- [ ] `AUTH_GOOGLE_ID` = [opcional, deixar em branco se não usar]
- [ ] `AUTH_GOOGLE_SECRET` = [opcional]
- [ ] `MP_ACCESS_TOKEN` = [seu token Mercado Pago PRODUÇÃO]
- [ ] `MP_PUBLIC_KEY` = [sua chave pública Mercado Pago PRODUÇÃO]
- [ ] `MP_WEBHOOK_SECRET` = [seu webhook secret Mercado Pago]
- [ ] `APP_URL` = `https://[nome-do-seu-app].vercel.app`

### Deploy
- [ ] Clicar em "Deploy"
- [ ] Aguardar 3-5 minutos até terminar
- [ ] Copiar URL gerada: `https://[seu-app].vercel.app`

## ✅ Fase 5: Validação

### Testes básicos
- [ ] Acessar https://[seu-app].vercel.app
- [ ] Página inicial carrega sem erros
- [ ] Pode navegar pelos produtos
- [ ] Carrinho funciona (adicionar/remover itens)
- [ ] Login funciona com `cliente@voltaria.com` / `Senha123`
- [ ] Painel do vendedor funciona com `vendedor@voltaria.com` / `Senha123`

### Testar checkout (opcional)
- [ ] Ir para um produto
- [ ] Adicionar ao carrinho
- [ ] Clicar em "Checkout"
- [ ] Preencher formulário
- [ ] Verificar se redireciona para Mercado Pago
- [ ] Usar cartão de teste: `4111 1111 1111 1111`

### Verificar logs
- [ ] No painel Vercel, clicar em "Deployments"
- [ ] Clicar no deployment mais recente
- [ ] Ir para "Logs" e verificar se não há erros
- [ ] Se houver erro, anotar a mensagem para debugar

## 🔗 Fase 6: Configurar Webhook Mercado Pago (importante!)

- [ ] Ir para https://www.mercadopago.com.br/developers/panel
- [ ] Ir para **Webhooks**
- [ ] Adicionar URL: `https://[seu-app].vercel.app/api/webhooks/mercadopago`
- [ ] Selecionar eventos:
  - `payment.created`
  - `payment.updated`
- [ ] Clicar em "Salvar"
- [ ] Testar com uma compra real (será cobrado, depois pode reembolsar)

## 🎯 Fase 7: Publicar para testar

- [ ] Compartilhar URL com amigos/beta-testers
- [ ] Coletar feedback
- [ ] Notar bugs ou melhorias necessárias
- [ ] Se encontrar problema, editar código localmente → `git push` → Vercel redeploy automático

## 🚀 Fase 8: Melhorias (opcional)

- [ ] Adicionar domínio personalizado (ver `DEPLOYMENT.md`)
- [ ] Trocar credenciais Mercado Pago de teste para produção (ver nota abaixo)
- [ ] Ativar Google OAuth (criar credenciais em Google Cloud Console)
- [ ] Monitorar Analytics no Vercel

---

## ⚠️ Notas Importantes

### Sobre Mercado Pago
- **TESTE**: Use credenciais de sandbox. Compras NÃO serão cobradas.
- **PRODUÇÃO**: Troque para credenciais reais quando quiser receber dinheiro de verdade.
- **Como trocar**: No Vercel → Settings → Environment Variables, atualize `MP_ACCESS_TOKEN` e `MP_PUBLIC_KEY`.

### Segurança
- ✅ `.env` não faz commit (está no `.gitignore`)
- ✅ Variáveis sensíveis ficam só no Vercel (nunca no Git)
- ✅ Banco de dados em Supabase (seguro, backups automáticos)

### Suporte
Se encontrar erro:
1. Verifique os logs no Vercel (Deployments → Logs)
2. Rode localmente: `npm run dev` e reproduza o erro
3. Confira o arquivo `DEPLOYMENT.md` na seção "Troubleshooting"

---

**Quando completar este checklist, seu projeto estará rodando GRATUITAMENTE na internet!** 🎉

Boa sorte! Qualquer dúvida, volte aqui.
