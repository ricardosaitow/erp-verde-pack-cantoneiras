// ============================================
// EDGE FUNCTION: Webhook Receiver
// ============================================
// Recebe webhooks de sistemas externos
// (n8n, Zapier, Make, etc.)
// Executa ações no ERP baseado nos eventos recebidos
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface IncomingWebhookPayload {
  action: string;
  data: any;
  metadata?: {
    source?: string;
    trace_id?: string;
  };
}

serve(async (req) => {
  try {
    // Verificar autenticação
    const webhookSecret = req.headers.get('X-Webhook-Secret')
    const expectedSecret = Deno.env.get('WEBHOOK_RECEIVER_SECRET')

    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.error('Webhook secret inválido')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload: IncomingWebhookPayload = await req.json()
    console.log('Webhook recebido de sistema externo:', payload.action)

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Processar ação baseado no tipo
    const result = await processAction(supabaseClient, payload)

    // Registrar log
    await supabaseClient.from('webhook_receiver_logs').insert({
      action: payload.action,
      source: payload.metadata?.source || 'unknown',
      payload,
      result,
      success: result.success,
      created_at: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro ao processar webhook recebido:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function processAction(supabase: any, payload: IncomingWebhookPayload) {
  const { action, data } = payload

  switch (action) {
    // ============================================
    // PEDIDOS
    // ============================================
    case 'criar_pedido':
      return await criarPedido(supabase, data)

    case 'atualizar_pedido':
      return await atualizarPedido(supabase, data)

    case 'cancelar_pedido':
      return await cancelarPedido(supabase, data)

    // ============================================
    // CLIENTES
    // ============================================
    case 'criar_cliente':
      return await criarCliente(supabase, data)

    case 'atualizar_cliente':
      return await atualizarCliente(supabase, data)

    // ============================================
    // ESTOQUE
    // ============================================
    case 'atualizar_estoque':
      return await atualizarEstoque(supabase, data)

    // ============================================
    // PRODUTOS
    // ============================================
    case 'criar_produto':
      return await criarProduto(supabase, data)

    case 'atualizar_produto':
      return await atualizarProduto(supabase, data)

    // ============================================
    // GENÉRICO - QUERY CUSTOMIZADA
    // ============================================
    case 'custom_query':
      return await executarQueryCustomizada(supabase, data)

    default:
      return {
        success: false,
        error: `Ação não reconhecida: ${action}`,
      }
  }
}

// ============================================
// HANDLERS DE PEDIDOS
// ============================================

async function criarPedido(supabase: any, data: any) {
  try {
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: data.cliente_id,
        vendedor_id: data.vendedor_id,
        numero_pedido: data.numero_pedido || `PED-${Date.now()}`,
        status: data.status || 'orcamento',
        data_pedido: data.data_pedido || new Date().toISOString(),
        valor_total: data.valor_total || 0,
        observacoes: data.observacoes,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data: pedido }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function atualizarPedido(supabase: any, data: any) {
  try {
    const { id, ...updates } = data

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: pedido }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function cancelarPedido(supabase: any, data: any) {
  try {
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: pedido }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ============================================
// HANDLERS DE CLIENTES
// ============================================

async function criarCliente(supabase: any, data: any) {
  try {
    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert(data)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: cliente }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function atualizarCliente(supabase: any, data: any) {
  try {
    const { id, ...updates } = data

    const { data: cliente, error } = await supabase
      .from('clientes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: cliente }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ============================================
// HANDLERS DE ESTOQUE
// ============================================

async function atualizarEstoque(supabase: any, data: any) {
  try {
    const { produto_id, quantidade, operacao } = data

    // Buscar produto
    const { data: produto, error: produtoError } = await supabase
      .from('produtos')
      .select('estoque_atual')
      .eq('id', produto_id)
      .single()

    if (produtoError) throw produtoError

    // Calcular novo estoque
    let novoEstoque = produto.estoque_atual || 0
    if (operacao === 'adicionar') {
      novoEstoque += quantidade
    } else if (operacao === 'remover') {
      novoEstoque -= quantidade
    } else if (operacao === 'definir') {
      novoEstoque = quantidade
    }

    // Atualizar estoque
    const { data: produtoAtualizado, error } = await supabase
      .from('produtos')
      .update({ estoque_atual: novoEstoque })
      .eq('id', produto_id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: produtoAtualizado }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ============================================
// HANDLERS DE PRODUTOS
// ============================================

async function criarProduto(supabase: any, data: any) {
  try {
    const { data: produto, error } = await supabase
      .from('produtos')
      .insert(data)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: produto }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function atualizarProduto(supabase: any, data: any) {
  try {
    const { id, ...updates } = data

    const { data: produto, error } = await supabase
      .from('produtos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: produto }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ============================================
// QUERY CUSTOMIZADA
// ============================================

async function executarQueryCustomizada(supabase: any, data: any) {
  try {
    const { table, operation, filters, updates, inserts } = data

    let query = supabase.from(table)

    switch (operation) {
      case 'select':
        query = query.select(data.select || '*')
        break
      case 'insert':
        query = query.insert(inserts).select()
        break
      case 'update':
        query = query.update(updates)
        break
      case 'delete':
        query = query.delete()
        break
      default:
        throw new Error(`Operação não suportada: ${operation}`)
    }

    // Aplicar filtros
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value)
      }
    }

    const { data: result, error } = await query

    if (error) throw error

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
