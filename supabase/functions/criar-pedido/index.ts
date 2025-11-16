// ============================================
// EDGE FUNCTION: Criar Pedido via API Externa
// ============================================
// Endpoint: https://seu-projeto.supabase.co/functions/v1/criar-pedido
// Método: POST
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parsear body da requisição
    const payload = await req.json()

    // Validar dados obrigatórios
    if (!payload.cliente_id) {
      return new Response(
        JSON.stringify({ error: 'cliente_id é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!payload.itens || payload.itens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'itens é obrigatório e deve ter pelo menos 1 item' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validar se cliente existe
    const { data: cliente, error: clienteError } = await supabaseClient
      .from('clientes')
      .select('id, razao_social')
      .eq('id', payload.cliente_id)
      .single()

    if (clienteError || !cliente) {
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Gerar número do pedido
    const { data: ultimoPedido } = await supabaseClient
      .from('pedidos')
      .select('numero_pedido')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let numeroPedido = 'PED-0001'
    if (ultimoPedido) {
      const numero = parseInt(ultimoPedido.numero_pedido.split('-')[1]) + 1
      numeroPedido = `PED-${numero.toString().padStart(4, '0')}`
    }

    // Calcular valores
    let valorProdutos = 0
    const itensValidados = []

    for (const item of payload.itens) {
      // Validar produto
      const { data: produto, error: produtoError } = await supabaseClient
        .from('produtos')
        .select('id, nome, tipo, preco_venda_unitario, estoque_atual')
        .eq('id', item.produto_id)
        .single()

      if (produtoError || !produto) {
        return new Response(
          JSON.stringify({ error: `Produto ${item.produto_id} não encontrado` }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Verificar estoque (se for revenda)
      if (produto.tipo === 'revenda') {
        const quantidadeNecessaria = item.quantidade_simples || 0
        if (produto.estoque_atual < quantidadeNecessaria) {
          return new Response(
            JSON.stringify({
              error: `Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque_atual}, Necessário: ${quantidadeNecessaria}`
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      }

      // Calcular subtotal
      const precoUnitario = item.preco_unitario || produto.preco_venda_unitario
      let subtotal = 0

      if (produto.tipo === 'fabricado' && item.quantidade_pecas && item.comprimento_cada_mm) {
        const totalMetros = (item.quantidade_pecas * item.comprimento_cada_mm) / 1000
        subtotal = totalMetros * precoUnitario
      } else if (item.quantidade_simples) {
        subtotal = item.quantidade_simples * precoUnitario
      }

      valorProdutos += subtotal

      itensValidados.push({
        produto_id: produto.id,
        tipo_produto: produto.tipo,
        quantidade_pecas: item.quantidade_pecas || null,
        comprimento_cada_mm: item.comprimento_cada_mm || null,
        total_calculado: produto.tipo === 'fabricado' ? (item.quantidade_pecas * item.comprimento_cada_mm) / 1000 : null,
        quantidade_simples: item.quantidade_simples || null,
        unidade_medida: item.unidade_medida || 'metro',
        preco_unitario: precoUnitario,
        subtotal: subtotal,
        observacoes: item.observacoes || null
      })
    }

    const valorFrete = payload.valor_frete || 0
    const valorDesconto = payload.valor_desconto || 0
    const valorTotal = valorProdutos + valorFrete - valorDesconto

    // Criar pedido
    const { data: pedido, error: pedidoError } = await supabaseClient
      .from('pedidos')
      .insert({
        numero_pedido: numeroPedido,
        cliente_id: payload.cliente_id,
        data_pedido: payload.data_pedido || new Date().toISOString().split('T')[0],
        tipo: payload.tipo || 'pedido_confirmado',
        status: payload.status || 'pendente',
        valor_produtos: valorProdutos,
        valor_frete: valorFrete,
        valor_desconto: valorDesconto,
        valor_total: valorTotal,
        prazo_entrega_dias: payload.prazo_entrega_dias || null,
        forma_pagamento: payload.forma_pagamento || null,
        condicoes_pagamento: payload.condicoes_pagamento || null,
        observacoes: payload.observacoes || null,
        observacoes_internas: payload.observacoes_internas || null
      })
      .select()
      .single()

    if (pedidoError) {
      console.error('Erro ao criar pedido:', pedidoError)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar pedido', details: pedidoError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Criar itens do pedido
    const itensComPedidoId = itensValidados.map(item => ({
      ...item,
      pedido_id: pedido.id
    }))

    const { error: itensError } = await supabaseClient
      .from('pedidos_itens')
      .insert(itensComPedidoId)

    if (itensError) {
      console.error('Erro ao criar itens:', itensError)
      // Rollback: deletar pedido criado
      await supabaseClient.from('pedidos').delete().eq('id', pedido.id)

      return new Response(
        JSON.stringify({ error: 'Erro ao criar itens do pedido', details: itensError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        pedido: {
          id: pedido.id,
          numero_pedido: pedido.numero_pedido,
          cliente: cliente.razao_social,
          valor_total: valorTotal,
          status: pedido.status,
          itens: itensValidados.length
        }
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro não tratado:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
