// ============================================
// EDGE FUNCTION: Webhook Asaas
// ============================================
// Recebe webhooks do Asaas sobre pagamentos
// Atualiza pedidos e dispara eventos internos
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    customer: string;
    billingType: string;
    value: number;
    netValue: number;
    status: string;
    dueDate: string;
    description?: string;
    externalReference?: string;
    confirmedDate?: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    transactionReceiptUrl?: string;
  };
}

serve(async (req) => {
  try {
    // Verificar assinatura do webhook (segurança)
    const asaasToken = req.headers.get('asaas-access-token')
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')

    if (expectedToken && asaasToken !== expectedToken) {
      console.error('Token inválido recebido')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload: AsaasWebhookPayload = await req.json()
    console.log('Webhook Asaas recebido:', JSON.stringify(payload))

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { event, payment } = payload

    // Buscar pedido pela referência externa
    if (payment.externalReference) {
      const { data: pedido, error: pedidoError } = await supabaseClient
        .from('pedidos')
        .select('*')
        .eq('id', payment.externalReference)
        .single()

      if (pedidoError) {
        console.error('Erro ao buscar pedido:', pedidoError)
      } else if (pedido) {
        // Atualizar status do pagamento do pedido
        await processarEventoPagamento(supabaseClient, event, payment, pedido)
      }
    }

    // Registrar log do webhook
    await supabaseClient.from('asaas_webhook_logs').insert({
      event,
      payment_id: payment.id,
      external_reference: payment.externalReference,
      payload,
      processed_at: new Date().toISOString(),
    })

    // Disparar webhook para sistemas externos via dispatcher
    await dispararWebhookExterno(event, payment)

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado com sucesso' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro ao processar webhook Asaas:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function processarEventoPagamento(
  supabase: any,
  event: string,
  payment: any,
  pedido: any
) {
  let novoStatus = pedido.status_pagamento
  let statusPedido = pedido.status

  switch (event) {
    case 'PAYMENT_CREATED':
      novoStatus = 'pendente'
      break

    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_RECEIVED_IN_CASH':
      novoStatus = 'pago'
      // Se o pedido estava aguardando pagamento, mudar para em_producao
      if (statusPedido === 'orcamento' || statusPedido === 'aguardando_pagamento') {
        statusPedido = 'em_producao'
      }
      break

    case 'PAYMENT_OVERDUE':
      novoStatus = 'vencido'
      break

    case 'PAYMENT_REFUNDED':
      novoStatus = 'estornado'
      // Considerar cancelar o pedido se estava em produção
      if (statusPedido !== 'finalizado' && statusPedido !== 'cancelado') {
        statusPedido = 'cancelado'
      }
      break

    case 'PAYMENT_DELETED':
      novoStatus = 'cancelado'
      break
  }

  // Atualizar pedido
  const { error: updateError } = await supabase
    .from('pedidos')
    .update({
      status_pagamento: novoStatus,
      status: statusPedido,
      asaas_payment_id: payment.id,
      asaas_payment_url: payment.invoiceUrl || payment.bankSlipUrl,
      data_pagamento: payment.confirmedDate || payment.paymentDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedido.id)

  if (updateError) {
    console.error('Erro ao atualizar pedido:', updateError)
    throw updateError
  }

  console.log(`Pedido ${pedido.numero_pedido} atualizado: ${novoStatus}`)
}

async function dispararWebhookExterno(event: string, payment: any) {
  const WEBHOOK_DISPATCHER_URL = Deno.env.get('WEBHOOK_DISPATCHER_URL')

  if (!WEBHOOK_DISPATCHER_URL) {
    console.log('Webhook dispatcher não configurado')
    return
  }

  // Mapear evento Asaas para evento interno
  let eventoInterno = 'pagamento.atualizado'
  if (event === 'PAYMENT_CREATED') eventoInterno = 'pagamento.criado'
  if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') eventoInterno = 'pagamento.confirmado'
  if (event === 'PAYMENT_OVERDUE') eventoInterno = 'pagamento.vencido'
  if (event === 'PAYMENT_REFUNDED') eventoInterno = 'pagamento.estornado'

  const payload = {
    event: eventoInterno,
    timestamp: new Date().toISOString(),
    data: {
      asaas_event: event,
      payment_id: payment.id,
      external_reference: payment.externalReference,
      value: payment.value,
      status: payment.status,
      payment_date: payment.paymentDate,
    },
    metadata: {
      source: 'asaas',
    },
  }

  try {
    const response = await fetch(WEBHOOK_DISPATCHER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': Deno.env.get('WEBHOOK_SECRET') || '',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('Erro ao disparar webhook externo:', response.statusText)
    } else {
      console.log('Webhook externo disparado com sucesso')
    }
  } catch (error) {
    console.error('Erro ao disparar webhook externo:', error)
  }
}
