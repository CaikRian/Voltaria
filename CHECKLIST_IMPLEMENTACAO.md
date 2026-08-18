# ✅ Checklist de Implementação - Novo Sistema de Status

## 📝 Resumo das Mudanças

Esta implementação resolve os 3 problemas principais:

1. ✅ **Pagamentos não confirmados**: Webhook melhorado com logging e novo status `PAGAMENTO_APROVADO`
2. ✅ **Compras incompletas no histórico**: Novo campo `abandonedAt` marca pedidos não pagos há 30+ min
3. ✅ **Falta de ações de cliente**: Implementadas: cancelar, reembolso, tentar novamente

---

## 🚀 Etapas de Implementação

### ✅ Etapa 1: Arquivos Criados/Modificados

**Criados:**
- [ ] `src/lib/order-status.ts` - Constantes e lógica de status ✅
- [ ] `src/lib/cleanup-orders.ts` - Função de cleanup de abandonados ✅
- [ ] `src/app/api/cron/cleanup-orders/route.ts` - Rota de cron job ✅
- [ ] `src/app/conta/pedidos/OrderClientActions.tsx` - Componente de ações ✅
- [ ] `src/app/painel/pedidos/abandonados/page.tsx` - Dashboard de abandonados ✅
- [ ] `NOVO_SISTEMA_STATUS.md` - Documentação completa ✅

**Modificados:**
- [ ] `prisma/schema.prisma` - Novos campos no Order ✅
  - `reasonCancelled`, `refundReason`, `refundRequestedAt`, `canChangeAddress`, `abandonedAt`
  - Novo índice em `abandonedAt`

- [ ] `src/lib/order-status.ts` - Novo arquivo com enums e metadata ✅
- [ ] `src/app/api/webhooks/mercadopago/route.ts` - Webhook melhorado ✅
- [ ] `src/components/OrderStatusBadge.tsx` - Componente atualizado ✅
- [ ] `src/app/checkout/OrderStatusView.tsx` - View melhorada ✅
- [ ] `src/lib/actions/orders.ts` - Novas server actions ✅
  - `cancelOrderAction()` - Cancelar pedido
  - `requestRefundAction()` - Solicitar reembolso
  - `retryPaymentAction()` - Tentar pagar novamente

- [ ] `src/app/conta/pedidos/[id]/page.tsx` - Página de detalhes melhorada ✅
  - Integração com `OrderClientActions`
  - Melhor descrição de status

---

### ✅ Etapa 2: Banco de Dados

```bash
# Terminal - Executar migração
cd path/to/minha-loja_v3

# 1. Gerar migração
npx prisma migrate dev --name add_order_status_improvements

# 2. Atualizar dados existentes (no SQL da migration)
# Todos os "PENDENTE" → "AGUARDANDO_PAGAMENTO"
# Todos os "PAGO" → "PAGAMENTO_APROVADO"

# 3. Verificar
npm run db:studio
# Abrir no browser e confirmar que Order tem os novos campos
```

**Checklist do Banco:**
- [ ] Migration executada sem erros
- [ ] Campos `reasonCancelled`, `refundReason`, etc. aparecem no db:studio
- [ ] Status antigos foram migrados corretamente

---

### ✅ Etapa 3: Testes Locais

#### Teste 1: Novo Status na Criação de Pedido

```bash
# 1. Ir ao checkout (http://localhost:3000/checkout)
# 2. Preencher formulário
# 3. Clicar em "Pagar"
# Esperado: Redireciona para MP Sandbox
# Verificar no db:studio: Order.status = "AGUARDANDO_PAGAMENTO" ✅
```

#### Teste 2: Pagamento Aprovado

```bash
# 1. No MP Sandbox, usar dados de teste:
#    Email: test_user@testuser.com
#    CPF: 12345678901
#    Cartão: 4111 1111 1111 1111 (Visa visa)
#    Data: qualquer futura
#    CVC: 123
#    
# 2. Clicar "Pagar"
# 3. MP retorna sucesso
# Esperado: 
#   - Redireciona para /checkout/sucesso?order=ID
#   - Mostra "Pagamento aprovado!"
#   - No db: Order.status = "PAGAMENTO_APROVADO" ✅
#   - No logs: [MP Webhook] Pedido atualizado com sucesso
```

#### Teste 3: Pagamento Recusado

```bash
# 1. No MP Sandbox, usar dados de teste para recusa:
#    Cartão: 4002 2400 3010 0010 (Recusado)
#    
# 2. Clicar "Pagar"
# 3. MP retorna erro
# Esperado:
#   - Redireciona para /checkout/erro?order=ID
#   - Mostra "Pagamento não aprovado"
#   - No db: Order.status = "PAGAMENTO_RECUSADO" ✅
#   - Cliente vê botão "Tentar novamente"
```

#### Teste 4: Ações de Cliente

**Login como cliente:**
```bash
# Email: cliente@voltaria.com
# Senha: Senha123
# Ir a: /conta/pedidos

# Para cada pedido, ver se aparecem botões:
# - AGUARDANDO_PAGAMENTO: "Mudar endereço", "Cancelar compra"
# - PAGAMENTO_RECUSADO: "Tentar novamente", "Cancelar"
# - ENTREGUE: "Deixar avaliação", "Solicitar devolução"
```

**Testar "Cancelar compra":**
```bash
# 1. Selecionar pedido AGUARDANDO_PAGAMENTO
# 2. Clicar "Cancelar compra"
# 3. Preencher motivo (ex: "Não quero mais")
# 4. Confirmar
# Esperado:
#   - Modal fecha
#   - Status muda para CANCELADO
#   - No db: Order.reasonCancelled = "Não quero mais"
#   - Não pode desfazer ✅
```

**Testar "Tentar novamente":**
```bash
# 1. Selecionar pedido PAGAMENTO_RECUSADO
# 2. Clicar "Tentar novamente"
# 3. Confirmar
# Esperado:
#   - Redireciona para MP Sandbox de novo
#   - Cria nova Preference (mesmo ID de pedido)
#   - Status volta a AGUARDANDO_PAGAMENTO ✅
```

#### Teste 5: Cleanup de Abandonados

```bash
# 1. Criar um pedido (vai ficar AGUARDANDO_PAGAMENTO)
# 2. Anotar ID da Order
# 3. No db:studio, abrir a Order
# 4. Executar manualmente:

curl "http://localhost:3000/api/cron/cleanup-orders"

# Esperado:
#   - Response: { "success": true, "count": 1, ... }
#   - Order.abandonedAt agora tem data ✅
#   
# 5. Ir ao painel: /painel/pedidos/abandonados
#    - Ver o pedido listado
```

---

### ✅ Etapa 4: Configuração de Produção

#### Variáveis de Ambiente Necessárias

No seu `.env.local` ou `.env.production`:

```env
# Mercado Pago
MP_ACCESS_TOKEN=seu_token_aqui
MP_WEBHOOK_SECRET=seu_webhook_secret_aqui

# Aplicação
APP_URL=https://seu-dominio.com
DATABASE_URL=postgresql://user:pass@host/db

# Segurança de Cron Job (opcional)
CRON_SECRET=seu_token_secreto_aqui
```

#### Webhook na Mercado Pago

1. Ir a: https://www.mercadopago.com.br/developers
2. Painel → Ferramentas → Webhooks
3. URL: `https://seu-dominio.com/api/webhooks/mercadopago`
4. Copiar o `MP_WEBHOOK_SECRET` → Adicionar ao `.env`
5. Testar webhook em sandbox

#### Cron Job (Cleanup Automático)

**Para Vercel:**

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/cleanup-orders?token=YOUR_CRON_SECRET",
    "schedule": "0 2 * * *"
  }]
}
```

**Para Railway/Render/Outros:**

```bash
# Usar curl cron service:
# https://cron-job.org

# URL: https://seu-dominio.com/api/cron/cleanup-orders?token=YOUR_CRON_SECRET
# Schedule: Daily 2 AM
```

---

### ✅ Etapa 5: Verificação Final

#### Checklist de Segurança

- [ ] `MP_WEBHOOK_SECRET` está configurado
- [ ] `APP_URL` aponta para domínio real (não localhost em produção)
- [ ] `CRON_SECRET` está em `.env` (não commitado no git)
- [ ] Webhook da MP está ativo
- [ ] Testes passaram no Sandbox

#### Checklist de Funcionalidade

- [ ] Pagamentos aprovados atualizam para `PAGAMENTO_APROVADO`
- [ ] Pagamentos recusados aparecem como `PAGAMENTO_RECUSADO`
- [ ] Cliente consegue cancelar pedido AGUARDANDO
- [ ] Cliente consegue pedir reembolso quando ENTREGUE
- [ ] Pedidos abandonados aparecem em /painel/pedidos/abandonados
- [ ] Cron job executa sem erros

#### Checklist de UX

- [ ] Descrição de status é clara
- [ ] Botões de ação aparecem no tempo certo
- [ ] Modais de confirmação funcionam
- [ ] Feedback de sucesso/erro aparecem
- [ ] Status badge tem cores consistentes

---

## 🐛 Troubleshooting

### Problema: Webhook não atualiza status

**Causa 1:** APP_URL está localhost
```bash
# Solução: Use ngrok
ngrok http 3000
# Copie a URL (ex: https://abc123.ngrok.io)
# Configure: APP_URL=https://abc123.ngrok.io
# Re-registre webhook na MP
```

**Causa 2:** MP_WEBHOOK_SECRET não está configurado
```bash
# Solução: 
# 1. Ir a painel MP → Webhooks
# 2. Copiar Secret
# 3. Adicionar ao .env: MP_WEBHOOK_SECRET=seu_secret
# 4. Restart servidor
```

**Causa 3:** Webhook URL não está registrada
```bash
# Solução:
# 1. Painel MP → Adicionar Webhook
# 2. URL: https://seu-site.com/api/webhooks/mercadopago
# 3. Topics: payment
# 4. Testar webhook pelo painel
```

### Problema: Cleanup não roda

**Verificar:**
```bash
# Chamar manualmente:
curl "https://seu-site.com/api/cron/cleanup-orders?token=YOUR_CRON_SECRET"

# Ver resposta:
# { "success": true, "count": 0, ... }

# Verificar logs do servidor
# Deverá ver: [Cron] Iniciando cleanup...
```

### Problema: Erro ao cancelar pedido

**Verificar em db:studio:**
- Order.status é realmente "AGUARDANDO_PAGAMENTO"?
- Há transição permitida? (ver `ALLOWED_STATUS_TRANSITIONS`)

---

## 📚 Arquivos para Revisar

1. **NOVO_SISTEMA_STATUS.md** - Documentação completa
2. **src/lib/order-status.ts** - Fonte de verdade para status
3. **src/lib/cleanup-orders.ts** - Lógica de cleanup
4. **src/app/api/webhooks/mercadopago/route.ts** - Webhook
5. **src/app/conta/pedidos/OrderClientActions.tsx** - UI de ações

---

## 🎯 Próximos Passos (Opcional)

1. **Notificações por Email**:
   - Quando status muda → Email para cliente
   - Quando pedido fica abandonado 24h → Email de recuperação

2. **Chat de Dúvidas**:
   - Integrar com Zendesk, Intercom, ou custom
   - Botão em cada pedido

3. **Rastreamento**:
   - Adicionar campo `trackingCode` em Order
   - Link direto para transportadora

4. **Relatórios**:
   - Dashboard com gráficos de abandono
   - Taxa de conversão por meio de pagamento

---

## ✨ Tudo Pronto?

Se completou todos os checkmarks acima, parabéns! 🎉

Seu sistema de pedidos agora é:
- ✅ Mais claro (status semânticos)
- ✅ Mais confiável (webhook melhorado)
- ✅ Mais amigável (ações de cliente)
- ✅ Melhor rastreado (timeline detalhada)

Qualquer dúvida, revisite **NOVO_SISTEMA_STATUS.md**.
