// ============================================
// EDGE FUNCTION: Consultar Estoque via API
// ============================================
// Endpoint: https://seu-projeto.supabase.co/functions/v1/consultar-estoque
// Método: GET
// Query params: ?tipo=materia_prima ou ?tipo=produto_revenda
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

    // Obter parâmetros da URL
    const url = new URL(req.url)
    const tipo = url.searchParams.get('tipo') // 'materia_prima', 'produto_revenda', ou null (todos)
    const id = url.searchParams.get('id') // ID específico (opcional)
    const criticos = url.searchParams.get('criticos') === 'true' // Apenas itens críticos

    let resultado: any = {}

    // Consultar Matérias-Primas
    if (!tipo || tipo === 'materia_prima') {
      let query = supabaseClient
        .from('materias_primas')
        .select(`
          id,
          nome,
          tipo,
          unidade_estoque,
          estoque_atual,
          estoque_minimo,
          estoque_ponto_reposicao,
          custo_por_unidade,
          ativo
        `)
        .eq('ativo', true)

      if (id) {
        query = query.eq('id', id)
      }

      if (criticos) {
        // Retornar apenas itens com estoque crítico (abaixo do mínimo)
        const { data: todasMateriasPrimas } = await query
        const materiasCriticas = todasMateriasPrimas?.filter(mp =>
          mp.estoque_atual < mp.estoque_minimo
        )
        resultado.materias_primas = materiasCriticas
      } else {
        const { data, error } = await query
        if (error) throw error
        resultado.materias_primas = data?.map(mp => ({
          ...mp,
          nivel_estoque: calcularNivelEstoque(
            mp.estoque_atual,
            mp.estoque_minimo,
            mp.estoque_ponto_reposicao
          )
        }))
      }
    }

    // Consultar Produtos de Revenda
    if (!tipo || tipo === 'produto_revenda') {
      let query = supabaseClient
        .from('produtos')
        .select(`
          id,
          nome,
          codigo_interno,
          unidade_venda,
          estoque_atual,
          estoque_minimo,
          estoque_ponto_reposicao,
          preco_venda_unitario,
          custo_compra,
          ativo
        `)
        .eq('tipo', 'revenda')
        .eq('ativo', true)

      if (id) {
        query = query.eq('id', id)
      }

      if (criticos) {
        const { data: todosProdutos } = await query
        const produtosCriticos = todosProdutos?.filter(p =>
          p.estoque_atual < p.estoque_minimo
        )
        resultado.produtos_revenda = produtosCriticos
      } else {
        const { data, error } = await query
        if (error) throw error
        resultado.produtos_revenda = data?.map(p => ({
          ...p,
          nivel_estoque: calcularNivelEstoque(
            p.estoque_atual,
            p.estoque_minimo,
            p.estoque_ponto_reposicao
          )
        }))
      }
    }

    // Se pediu um ID específico e não encontrou nada
    if (id && !resultado.materias_primas?.length && !resultado.produtos_revenda?.length) {
      return new Response(
        JSON.stringify({ error: 'Item não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Adicionar resumo
    const resumo = {
      total_materias_primas: resultado.materias_primas?.length || 0,
      total_produtos_revenda: resultado.produtos_revenda?.length || 0,
      materias_primas_criticas: resultado.materias_primas?.filter((mp: any) => mp.nivel_estoque === 'critico').length || 0,
      produtos_criticos: resultado.produtos_revenda?.filter((p: any) => p.nivel_estoque === 'critico').length || 0,
    }

    return new Response(
      JSON.stringify({
        success: true,
        resumo,
        dados: resultado
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro ao consultar estoque:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Função auxiliar para calcular nível de estoque
function calcularNivelEstoque(atual: number, minimo: number, pontoReposicao: number): string {
  if (atual <= 0) return 'zerado'
  if (atual < minimo) return 'critico'
  if (atual < pontoReposicao) return 'baixo'
  return 'normal'
}
