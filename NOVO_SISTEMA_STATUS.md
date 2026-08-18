# 📋 Novo Sistema de Status de Pedidos - Documentação

## Visão Geral da Melhoria

Este documento descreve as mudanças implementadas no fluxo de pedidos para resolver os problemas de:
- Pedidos ficando "pendurados" como PENDENTE mesmo após pagamento
- Pedidos incompletos aparecerem no histórico do cliente
- Falta de clareza sobre o status do pedido
- Ausência de ações de cliente (cancelar, reembolso, etc.)

---

## 🔄 Novo Fluxo de Status

### Estados Principais

```
┌─────────────────────┐
│ AGUARDANDO_PAGAMENTO │  ← Cliente clica em "Pagar"
└──────────┬──────────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
┌──────────────┐  ┌─────────────────┐
│   PAGAMENTO  │  │ PAGAMENTO_RECUSADO│  ← MP recusa
│  APROVADO    │  └────────┬─────────┘
└──────┬───────┘           │
       │                   └──► AGUARDANDO_PAGAMENTO (retry)
       │                       │
       ▼                       ▼
┌────────────────────┐  ┌──────────────┐
│ PREPARANDO_ENVIO   │  │  CANCELADO   │
└─────────┬──────────┘  └──────────────┘
          │
          ▼
      ┌────────┐
      │ ENVIADO │
      └────┬───┘
           │
           ▼
     ┌──────────┐
     │ENTREGUE  │
     └────┬─────┘
          │
      ┌───┴────────────────────┐
      │                        │
      ▼                        ▼
┌──────────────────┐  ┌─────────────────┐
│REEMBOLSO_SOLICITADO  REEMBOLSADO
└──────────────────┘  └─────────────────┘
```

### Mudanças Principais

1. **PENDENTE** → **AGUARDANDO_PAGAMENTO**
   - Mais claro: o cliente sabe que está esperando confirmação do pagamento
   - Cliente pode cancelar nesta etapa se desejar

2. **PAGO** → **PAGAMENTO_APROVADO**
   - Mais semântico
   - Prepara para etapas de preparação

3. **Novos Status**:
   - **PREPARANDO_ENVIO**: Entre aprovação e envio
   - **REEMBOLSO_SOLICITADO**: Cliente pediu devolução
   - **REEMBOLSADO**: Reembolso processado

4. **PAGAMENTO_RECUSADO**:
   - Substituiu o uso de CANCELADO para recusas
   - Cliente pode tentar novamente

---

## 🔧 Implementação Técnica

### 1. Schema Prisma Atualizado

```prisma
model Order {
  id                String
  status            String  // Novo enum de status
  
  // Campos novos para rastreamento
  reasonCancelled   String?      // Por que foi cancelado
  refundReason      String?      // Por que foi devolvido
  refundRequestedAt DateTime?    // Quando foi solicitado
  canChangeAddress  Boolean      // Permite mudar endereço
  abandonedAt       DateTime?    // Pedido não pago por 30+ min
  
  // ... resto dos campos
}
```

### 2. Constantes de Status (`lib/order-status.ts`)

Centraliza toda lógica de status:
- `ORDER_STATUS`: enum de todos os status
- `ALLOWED_STATUS_TRANSITIONS`: quais transições são permitidas
- `STATUS_META`: informações de UI (label, cor, descrição)
- `getClientActions()`: ações disponíveis por status

### 3. Webhook Melhorado

✅ Logging detalhado (com prefixo `[MP Webhook]`)
✅ Usa novo mapeamento de status
✅ Idempotente (não duplica eventos)
✅ Busca dados reais da MP (nunca confia no webhook)

### 4. Server Actions de Cliente

Implementadas em `lib/actions/orders.ts`:

#### `cancelOrderAction()`
- Cliente pode cancelar se AGUARDANDO_PAGAMENTO ou PAGAMENTO_RECUSADO
- Requer motivo (opcional mas recomendado)
- Grava `reasonCancelled` no banco

#### `requestRefundAction()`
- Cliente pode solicitar reembolso se ENTREGUE ou ENVIADO
- Requer motivo obrigatório
- Transiciona para REEMBOLSO_SOLICITADO
- Grava `refundReason` e `refundRequestedAt`

#### `retryPaymentAction()`
- Cliente com pagamento recusado pode tentar novamente
- Cria nova Preference na Mercado Pago
- Redireciona para checkout de novo

### 5. Componente de Ações (`OrderClientActions.tsx`)

Interface amigável com:
- Modais para confirmação
- Tratamento de erros
- Feedback de sucesso
- Ações contextuais por status

### 6. Cleanup de Pedidos (`cleanup-orders.ts`)

Função para limpar pedidos abandonados:
- Identifica AGUARDANDO_PAGAMENTO > 30 minutos
- Marca com `abandonedAt`
- Pode ser executada via cron ou manualmente
- Não cancela automaticamente (segurança)

---

## 📱 Experiência do Cliente

### Cenário 1: Pagamento Aprovado ✅

1. Cliente vai ao checkout → Status: **AGUARDANDO_PAGAMENTO**
2. Cliente aprova pagamento no MP Sandbox
3. Webhook atualiza → Status: **PAGAMENTO_APROVADO**
4. Cliente volta ao site e vê: "Pagamento aprovado! Estamos preparando..."

### Cenário 2: Pagamento Recusado ❌

1. Cliente vai ao checkout → Status: **AGUARDANDO_PAGAMENTO**
2. Cliente tenta pagar, MP recusa
3. Webhook atualiza → Status: **PAGAMENTO_RECUSADO**
4. Cliente vê: "Pagamento recusado. Você pode tentar novamente."
5. Cliente clica "Tentar novamente" → Nova tentativa

### Cenário 3: Cliente Desiste (Sai da página)

1. Cliente vai ao checkout → Status: **AGUARDANDO_PAGAMENTO**
2. Cliente fecha/sai do MP Sandbox
3. Não fez nada, order fica em **AGUARDANDO_PAGAMENTO**
4. Após 30 min: `cleanupAbandonedOrders()` marca como `abandonedAt`
5. Cliente volta ao site → Pode cancelar ou tentar pagar

### Cenário 4: Cliente quer Devolver

1. Pedido já entregue → Status: **ENTREGUE**
2. Cliente clica "Solicitar devolução"
3. Preenche motivo (obrigatório)
4. Status → **REEMBOLSO_SOLICITADO**
5. Você recebe notificação no painel
6. Quando processar: **REEMBOLSADO**

---

## 🚀 Como Implementar

### Passo 1: Migração do Banco

```bash
# Gerar migration
npx prisma migrate dev --name add_order_status_improvements

# Se quiser ver o SQL antes
npx prisma migrate status
```

### Passo 2: Atualizar Dados Existentes

```bash
# Via seed ou manual SQL:
UPDATE "Order" SET status = 'AGUARDANDO_PAGAMENTO' WHERE status = 'PENDENTE';
UPDATE "Order" SET status = 'PAGAMENTO_APROVADO' WHERE status = 'PAGO';
UPDATE "Order" SET status = 'CANCELADO' WHERE status = 'CANCELADO'; -- sem mudança
```

### Passo 3: Testar Fluxo

1. **Local (Sandbox)**:
   ```bash
   npm run dev
   # Ir a checkout
   # Pagar com dados de teste
   # Verificar webhook (logs)
   ```

2. **Verificar Novos Status**:
   ```bash
   npm run db:studio
   # Ver a Order com novo status
   ```

3. **Testar Ações de Cliente**:
   ```bash
   # Login como cliente
   # Ir a /conta/pedidos/[id]
   # Clicar em "Cancelar compra" ou "Solicitar devolução"
   ```

### Passo 4: Cron Job para Cleanup

Adicione à sua infra (Vercel, Railway, etc.):

```bash
# Executar todo dia às 2:00 AM UTC
2 * * * * curl https://seu-site.com/api/cron/cleanup-orders
```

Ou crie rota: `src/app/api/cron/cleanup-orders/route.ts`

---

## 🔍 Debugging

### Ver Logs do Webhook

```bash
npm run db:studio
# Ver Order.mpPaymentId, mpStatusDetail
# Verificar OrderStatusEvent para histórico
```

### Testar Sem Webhook

Em dev local, o webhook não funciona (localhost). Teste manualmente:

```bash
# Via db:studio, mude manualmente:
Order.status = "PAGAMENTO_APROVADO"
# Deverá aparecer na UI do cliente
```

### Validar Transições

Se obter erro "status inválido", verifique em `lib/order-status.ts`:
```typescript
ALLOWED_STATUS_TRANSITIONS[currentStatus]
```

---

## 📊 Métricas

Você agora pode acompanhar:
- `Order.abandonedAt`: Quantos pedidos foram abandonados?
- `Order.reasonCancelled`: Por que clientes cancelam?
- `Order.refundReason`: Por que solicitam reembolso?
- `OrderStatusEvent`: Histórico completo de cada pedido

---

## ⚠️ Notas Importantes

1. **Retrocompatibilidade**: Pedidos antigos com status `PENDENTE` continuarão funcionando (não quebra)

2. **Webhook é crítico**: Sem webhook, o cliente precisa voltar manualmente. Configure corretamente!

3. **APP_URL deve ser pública**: Mercado Pago não consegue chamar localhost. Para dev:
   - Use ngrok: `ngrok http 3000`
   - Configure `APP_URL` do ngrok

4. **Teste com Sandbox**: Sempre teste no sandbox da MP antes de produção

5. **Cleanup NÃO é automático**: `cleanupAbandonedOrders()` precisa ser chamado via cron. Configure!

---

## 📞 Suporte

Dúvidas? Verifique:
- `CLAUDE.md`: Contexto geral do projeto
- `lib/order-status.ts`: Lógica de status
- `lib/actions/orders.ts`: Server actions
- `app/conta/pedidos/[id]/page.tsx`: UI do cliente
