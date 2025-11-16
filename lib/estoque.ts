import { supabase } from './supabase';
import type { MovimentacaoEstoque } from './database.types';
import { calcularConsumoMaterial } from './calculos';
import { formatNumber } from './format';

/**
 * Dá baixa no estoque de uma matéria-prima e cria movimentação
 * @param materiaPrimaId ID da matéria-prima
 * @param quantidadeKg Quantidade a dar baixa (em kg)
 * @param motivo Motivo da movimentação
 * @param documentoReferencia Documento de referência (ex: pedido_id, ordem_producao_id)
 * @param observacoes Observações adicionais
 * @returns Resultado da operação
 */
export async function darBaixaMateriaPrima(
  materiaPrimaId: string,
  quantidadeKg: number,
  motivo: 'compra' | 'venda' | 'producao' | 'ajuste_inventario' | 'devolucao',
  documentoReferencia?: string,
  observacoes?: string
): Promise<{ error: string | null }> {
  try {
    // Buscar matéria-prima atual
    const { data: materiaPrima, error: fetchError } = await supabase
      .from('materias_primas')
      .select('*')
      .eq('id', materiaPrimaId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar matéria-prima:', fetchError);
      return { error: 'Erro ao buscar matéria-prima: ' + fetchError.message };
    }

    if (!materiaPrima) {
      return { error: 'Matéria-prima não encontrada' };
    }

    const estoqueAnterior = Number(materiaPrima.estoque_atual) || 0;
    const estoqueAtual = Math.max(0, estoqueAnterior - quantidadeKg);

    // Atualizar estoque da matéria-prima
    const { error: updateError } = await supabase
      .from('materias_primas')
      .update({ estoque_atual: estoqueAtual })
      .eq('id', materiaPrimaId);

    if (updateError) {
      console.error('Erro ao atualizar estoque da matéria-prima:', updateError);
      return { error: 'Erro ao atualizar estoque: ' + updateError.message };
    }

    // Criar movimentação de estoque
    const movimentacao: Omit<MovimentacaoEstoque, 'id' | 'created_at'> = {
      tipo: motivo === 'producao' ? 'producao' : 'saida',
      tipo_item: 'materia_prima',
      item_id: materiaPrimaId,
      quantidade_anterior: estoqueAnterior,
      quantidade_movimentada: -quantidadeKg, // Negativo para saída
      quantidade_atual: estoqueAtual,
      unidade: materiaPrima.unidade_estoque,
      motivo,
      documento_referencia: documentoReferencia,
      observacoes,
    };

    const { error: movError } = await supabase
      .from('movimentacoes_estoque')
      .insert([movimentacao]);

    if (movError) {
      console.error('Erro ao criar movimentação:', movError);
      // Não falhar se movimentação falhar, mas avisar
      console.warn('Movimentação não foi criada, mas estoque foi atualizado');
    }

    console.log(`✅ Baixa de ${quantidadeKg} ${materiaPrima.unidade_estoque} de ${materiaPrima.nome}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao dar baixa no estoque' };
  }
}

/**
 * Dá baixa no estoque de um produto de revenda e cria movimentação
 * @param produtoId ID do produto
 * @param quantidade Quantidade a dar baixa
 * @param motivo Motivo da movimentação
 * @param documentoReferencia Documento de referência (ex: pedido_id)
 * @param observacoes Observações adicionais
 * @returns Resultado da operação
 */
export async function darBaixaProdutoRevenda(
  produtoId: string,
  quantidade: number,
  motivo: 'compra' | 'venda' | 'producao' | 'ajuste_inventario' | 'devolucao',
  documentoReferencia?: string,
  observacoes?: string
): Promise<{ error: string | null }> {
  try {
    // Buscar produto atual
    const { data: produto, error: fetchError } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', produtoId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar produto:', fetchError);
      return { error: 'Erro ao buscar produto: ' + fetchError.message };
    }

    if (!produto) {
      return { error: 'Produto não encontrado' };
    }

    if (produto.tipo !== 'revenda') {
      return { error: 'Produto não é de revenda' };
    }

    const estoqueAnterior = Number(produto.estoque_atual) || 0;
    const estoqueAtual = Math.max(0, estoqueAnterior - quantidade);

    // Atualizar estoque do produto
    const { error: updateError } = await supabase
      .from('produtos')
      .update({ estoque_atual: estoqueAtual })
      .eq('id', produtoId);

    if (updateError) {
      console.error('Erro ao atualizar estoque do produto:', updateError);
      return { error: 'Erro ao atualizar estoque: ' + updateError.message };
    }

    // Criar movimentação de estoque
    const movimentacao: Omit<MovimentacaoEstoque, 'id' | 'created_at'> = {
      tipo: 'saida',
      tipo_item: 'produto_revenda',
      item_id: produtoId,
      quantidade_anterior: estoqueAnterior,
      quantidade_movimentada: -quantidade, // Negativo para saída
      quantidade_atual: estoqueAtual,
      unidade: produto.unidade_venda,
      motivo,
      documento_referencia: documentoReferencia,
      observacoes,
    };

    const { error: movError } = await supabase
      .from('movimentacoes_estoque')
      .insert([movimentacao]);

    if (movError) {
      console.error('Erro ao criar movimentação:', movError);
      // Não falhar se movimentação falhar, mas avisar
      console.warn('Movimentação não foi criada, mas estoque foi atualizado');
    }

    console.log(`✅ Baixa de ${quantidade} ${produto.unidade_venda} de ${produto.nome}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao dar baixa no estoque' };
  }
}

/**
 * Dá baixa no estoque de matérias-primas para uma ordem de produção
 * @param produtoId ID do produto fabricado
 * @param totalMetros Total de metros a produzir
 * @param ordemProducaoId ID da ordem de produção
 * @param pedidoId ID do pedido (opcional)
 * @returns Resultado da operação
 */
export async function darBaixaMateriasPrimasProducao(
  produtoId: string,
  totalMetros: number,
  ordemProducaoId: string,
  pedidoId?: string
): Promise<{ error: string | null; errosDetalhados?: string[] }> {
  try {
    // Buscar receitas do produto
    const { data: receitas, error: receitasError } = await supabase
      .from('receitas')
      .select(`
        *,
        materia_prima:materias_primas(*)
      `)
      .eq('produto_id', produtoId);

    if (receitasError) {
      console.error('Erro ao buscar receitas:', receitasError);
      return { error: 'Erro ao buscar receitas: ' + receitasError.message };
    }

    if (!receitas || receitas.length === 0) {
      return { error: 'Produto não possui receitas cadastradas' };
    }

    const errosDetalhados: string[] = [];
    const documentoReferencia = pedidoId 
      ? `Pedido: ${pedidoId}, OP: ${ordemProducaoId}`
      : `OP: ${ordemProducaoId}`;

    // Dar baixa em cada matéria-prima
    for (const receita of receitas) {
      if (!receita.materia_prima) {
        errosDetalhados.push(`Matéria-prima ${receita.materia_prima_id} não encontrada`);
        continue;
      }

      const consumoKg = calcularConsumoMaterial(totalMetros, receita.consumo_por_metro_g);
      
      if (consumoKg <= 0) {
        continue; // Pular se consumo for zero
      }

      const { error: baixaError } = await darBaixaMateriaPrima(
        receita.materia_prima_id,
        consumoKg,
        'producao',
        documentoReferencia,
        `Produção de ${formatNumber(totalMetros)}m - ${receita.materia_prima.nome}`
      );

      if (baixaError) {
        errosDetalhados.push(`${receita.materia_prima.nome}: ${baixaError}`);
      }
    }

    if (errosDetalhados.length > 0) {
      return { 
        error: 'Erros ao dar baixa em algumas matérias-primas',
        errosDetalhados 
      };
    }

    console.log(`✅ Baixa de matérias-primas para produção de ${formatNumber(totalMetros)}m`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao dar baixa nas matérias-primas' };
  }
}

