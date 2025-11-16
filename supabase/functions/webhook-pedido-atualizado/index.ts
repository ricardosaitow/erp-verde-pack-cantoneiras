// ============================================
// EDGE FUNCTION: Webhook quando Pedido é Atualizado
// ============================================
// Esta function é chamada automaticamente via Database Webhook
// quando há UPDATE na tabela 'pedidos'
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: any
  old_record: any
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json()

    console.log('Payload recebido:', JSON.stringify(payload))

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const pedido = payload.record
    const oldPedido = payload.old_record

    console.log('Webhook recebido - Pedido ID:', pedido?.id, 'Tipo:', payload.type)

    // Se não temos os dados completos, buscar do banco
    if (!pedido?.numero_pedido) {
      console.log('Payload vazio, buscando dados do banco...')
      return new Response(
        JSON.stringify({ success: true, message: 'Payload vazio ignorado' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se houve mudança de status
    const statusMudou = payload.type === 'UPDATE' && pedido.status !== oldPedido?.status

    if (statusMudou) {
      console.log(`Status mudou de ${oldPedido.status} para ${pedido.status}`)

      // Buscar dados completos do pedido
      const { data: pedidoCompleto, error } = await supabaseClient
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(razao_social, email, celular),
          itens:pedidos_itens(
            *,
            produto:produtos(nome, tipo)
          )
        `)
        .eq('id', pedido.id)
        .single()

      if (error) {
        console.error('Erro ao buscar pedido completo:', error)
        throw error
      }

      // Enviar notificação para sistema externo
      await enviarWebhookExterno(pedidoCompleto, oldPedido.status)

      // NOTA: Criação de OPs e baixa de estoque são gerenciadas pelo frontend (usePedidos.ts)
      // para evitar duplicação e manter lógica centralizada
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// Enviar notificação para sistema externo via webhook
async function enviarWebhookExterno(pedido: any, statusAnterior: string) {
  const WEBHOOK_URL = Deno.env.get('WEBHOOK_SISTEMA_EXTERNO_URL')

  if (!WEBHOOK_URL) {
    console.log('URL do webhook externo não configurada')
    return
  }

  const payload = {
    evento: 'pedido_status_alterado',
    timestamp: new Date().toISOString(),
    pedido: {
      id: pedido.id,
      numero_pedido: pedido.numero_pedido,
      cliente: pedido.cliente.razao_social,
      status_anterior: statusAnterior,
      status_atual: pedido.status,
      valor_total: pedido.valor_total,
      itens: pedido.itens.map((item: any) => ({
        produto: item.produto.nome,
        quantidade: item.quantidade_pecas || item.quantidade_simples,
        subtotal: item.subtotal
      }))
    }
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': Deno.env.get('WEBHOOK_SECRET') || ''
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('Erro ao enviar webhook:', response.statusText)
    } else {
      console.log('Webhook enviado com sucesso para:', WEBHOOK_URL)
    }
  } catch (error) {
    console.error('Erro ao enviar webhook:', error)
  }
}
