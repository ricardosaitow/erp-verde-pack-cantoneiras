import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Compra, CompraCompleta, ItemCompra, HistoricoCusto } from '../lib/database.types';
import { criarLoteEstoque } from '../lib/estoque';

// Interface para alertas de diferença de custo
export interface AlertaDiferencaCusto {
  materia_prima_id: string;
  materia_prima_nome: string;
  custo_administrativo_atual: number;
  custo_compra_novo: number;
  diferenca_valor: number;
  diferenca_percentual: number;
  quantidade_kg: number;
  tipo: 'aumento' | 'reducao';
}

export function useCompras() {
  const [compras, setCompras] = useState<CompraCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompras = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('compras')
        .select(`
          *,
          fornecedor:fornecedores(*),
          itens:itens_compra(
            *,
            materia_prima:materias_primas(*),
            produto:produtos(*)
          )
        `)
        .order('data_compra', { ascending: false });

      if (fetchError) throw fetchError;

      setCompras(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar compras:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompras();
  }, []);

  const create = async (compraData: Partial<Compra>, itens: Partial<ItemCompra>[]) => {
    try {
      // Criar a compra
      const { data: compra, error: compraError } = await supabase
        .from('compras')
        .insert([compraData])
        .select()
        .single();

      if (compraError) throw compraError;

      // Criar os itens da compra
      const itensComCompraId = itens.map(item => ({
        ...item,
        compra_id: compra.id,
        subtotal: (item.quantidade || 0) * (item.preco_unitario || 0)
      }));

      const { error: itensError } = await supabase
        .from('itens_compra')
        .insert(itensComCompraId);

      if (itensError) throw itensError;

      await fetchCompras();
      return { data: compra, error: null };
    } catch (err: any) {
      console.error('Erro ao criar compra:', err);
      return { data: null, error: err.message };
    }
  };

  const update = async (id: string, updates: Partial<Compra>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('compras')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchCompras();
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao atualizar compra:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteCompra = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('compras')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchCompras();
      return { error: null };
    } catch (err: any) {
      console.error('Erro ao excluir compra:', err);
      return { error: err.message };
    }
  };

  const updateItemQuantidadeRecebida = async (itemId: string, quantidadeRecebida: number) => {
    try {
      // Buscar item atual com matéria-prima
      const { data: item, error: fetchError } = await supabase
        .from('itens_compra')
        .select('*, materia_prima:materias_primas(*)')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      const quantidadeAnterior = item.quantidade_recebida || 0;
      const quantidadeNova = quantidadeRecebida - quantidadeAnterior;

      // Se a quantidade aumentou e tem matéria-prima, criar lote
      if (quantidadeNova > 0 && item.materia_prima_id && item.materia_prima) {
        const custoUnitario = item.preco_unitario || 0;

        // Criar lote de estoque
        // NOTA: Passando null para compra_item_id pois a FK aponta para compras_itens, não itens_compra
        const { error: loteError, lote_id } = await criarLoteEstoque(
          item.materia_prima_id,
          quantidadeNova,
          custoUnitario,
          null // itemId não funciona pois FK aponta para tabela diferente
        );

        if (loteError) {
          console.error(`Erro ao criar lote:`, loteError);
        } else {
          console.log(`✅ Lote criado: ${quantidadeNova}kg @ R$ ${custoUnitario}/kg`);

          // Calcular estoque baseado na soma dos lotes (mais seguro que incrementar)
          const { data: lotes } = await supabase
            .from('lotes_estoque')
            .select('quantidade_atual_kg')
            .eq('materia_prima_id', item.materia_prima_id)
            .eq('status', 'ativo');

          const novoEstoque = (lotes || []).reduce((sum, l) => sum + (l.quantidade_atual_kg || 0), 0);
          const estoqueAnterior = novoEstoque - quantidadeNova;

          // Verificar se é o PRIMEIRO lote (ou se não tinha custo definido)
          const custoAtual = item.materia_prima.custo_por_unidade || 0;
          const quantidadeLotesAtivos = (lotes || []).length;

          const updateData: any = {
            estoque_atual: novoEstoque,
            custo_por_unidade: custoUnitario, // Sempre atualiza com o custo da última compra
            ultimo_custo_real: custoUnitario,
          };

          console.log(`💰 Custo atualizado para R$ ${custoUnitario}/kg`);

          await supabase
            .from('materias_primas')
            .update(updateData)
            .eq('id', item.materia_prima_id);

          // Recalcular custo das receitas que usam esta matéria-prima
          if (custoAtual !== custoUnitario) {
            await recalcularCustosReceitas(item.materia_prima_id, custoUnitario);
          }

          // Criar movimentação
          await supabase.from('movimentacoes_estoque').insert([{
            tipo: 'entrada',
            tipo_item: 'materia_prima',
            item_id: item.materia_prima_id,
            quantidade_anterior: estoqueAnterior,
            quantidade_movimentada: quantidadeNova,
            quantidade_atual: novoEstoque,
            unidade: item.materia_prima.unidade_estoque || 'kg',
            motivo: 'compra',
            documento_referencia: `Compra - Item ${itemId}`,
            lote_id,
            custo_real_unitario: custoUnitario,
            observacoes: 'Entrada de estoque - Item recebido',
          }]);
        }
      }

      // Atualizar quantidade recebida
      const { error: updateError } = await supabase
        .from('itens_compra')
        .update({ quantidade_recebida: quantidadeRecebida })
        .eq('id', itemId);

      if (updateError) throw updateError;

      await fetchCompras();
      return { error: null };
    } catch (err: any) {
      console.error('Erro ao atualizar quantidade recebida:', err);
      return { error: err.message };
    }
  };

  /**
   * Verifica diferenças de custo entre compra e custo administrativo
   * Retorna alertas para itens com custo diferente
   */
  const verificarDiferencasCusto = async (compraId: string): Promise<{
    alertas: AlertaDiferencaCusto[];
    error: string | null;
  }> => {
    try {
      // Buscar itens da compra com matéria-prima
      const { data: itens, error: itensError } = await supabase
        .from('itens_compra')
        .select('*, materia_prima:materias_primas(*)')
        .eq('compra_id', compraId);

      if (itensError) throw itensError;

      const alertas: AlertaDiferencaCusto[] = [];

      for (const item of itens || []) {
        if (!item.materia_prima_id || !item.materia_prima) continue;

        const custoAdministrativo = item.materia_prima.custo_por_unidade || 0;
        const custoCompra = item.preco_unitario || 0;

        // Se não tem custo administrativo definido, não gerar alerta
        if (custoAdministrativo === 0) continue;

        // Verificar se há diferença significativa (mais de 0.5%)
        const diferenca = custoCompra - custoAdministrativo;
        const diferencaPercentual = (diferenca / custoAdministrativo) * 100;

        if (Math.abs(diferencaPercentual) > 0.5) {
          alertas.push({
            materia_prima_id: item.materia_prima_id,
            materia_prima_nome: item.materia_prima.nome,
            custo_administrativo_atual: custoAdministrativo,
            custo_compra_novo: custoCompra,
            diferenca_valor: diferenca,
            diferenca_percentual: diferencaPercentual,
            quantidade_kg: item.quantidade || 0,
            tipo: diferenca > 0 ? 'aumento' : 'reducao',
          });
        }
      }

      return { alertas, error: null };
    } catch (err: any) {
      console.error('Erro ao verificar diferenças de custo:', err);
      return { alertas: [], error: err.message };
    }
  };

  /**
   * Aplica atualizações de custo administrativo para materiais selecionados
   */
  const aplicarAtualizacoesCusto = async (
    atualizacoes: Array<{
      materia_prima_id: string;
      novo_custo: number;
    }>,
    motivo: string
  ): Promise<{ error: string | null }> => {
    try {
      for (const atualizacao of atualizacoes) {
        const { error } = await aplicarCustoAdministrativo(
          atualizacao.materia_prima_id,
          atualizacao.novo_custo,
          motivo
        );
        if (error) {
          console.error(`Erro ao atualizar custo de ${atualizacao.materia_prima_id}:`, error);
        }
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const receberCompraCompleta = async (compraId: string) => {
    try {
      // Buscar todos os itens da compra com matéria-prima relacionada
      const { data: itens, error: itensError } = await supabase
        .from('itens_compra')
        .select('*, materia_prima:materias_primas(*)')
        .eq('compra_id', compraId);

      if (itensError) throw itensError;

      // Processar cada item - criar lote e dar entrada no estoque
      for (const item of itens || []) {
        // Pular se já foi recebido completamente
        if (item.quantidade_recebida >= item.quantidade) {
          continue;
        }

        // Se for matéria-prima, criar lote PEPS
        if (item.materia_prima_id && item.materia_prima) {
          const quantidadeAReceber = item.quantidade - (item.quantidade_recebida || 0);
          const custoUnitario = item.preco_unitario || 0;

          // Criar lote de estoque
          // NOTA: Passando null para compra_item_id pois a FK aponta para compras_itens, não itens_compra
          const { error: loteError, lote_id } = await criarLoteEstoque(
            item.materia_prima_id,
            quantidadeAReceber,
            custoUnitario,
            null // item.id não funciona pois FK aponta para tabela diferente
          );

          if (loteError) {
            console.error(`Erro ao criar lote para ${item.materia_prima.nome}:`, loteError);
          } else {
            console.log(`✅ Lote criado para ${item.materia_prima.nome}: ${quantidadeAReceber}kg @ R$ ${custoUnitario}/kg`);

            // Calcular estoque baseado na soma dos lotes (mais seguro que incrementar)
            const { data: lotes } = await supabase
              .from('lotes_estoque')
              .select('quantidade_atual_kg')
              .eq('materia_prima_id', item.materia_prima_id)
              .eq('status', 'ativo');

            const novoEstoque = (lotes || []).reduce((sum, l) => sum + (l.quantidade_atual_kg || 0), 0);
            const estoqueAnterior = novoEstoque - quantidadeAReceber;

            // Verificar se é o PRIMEIRO lote (ou se não tinha custo definido)
            // Se sim, atualiza o custo automaticamente
            const custoAtual = item.materia_prima.custo_por_unidade || 0;
            const quantidadeLotesAtivos = (lotes || []).length;

            const updateData: any = {
              estoque_atual: novoEstoque,
              custo_por_unidade: custoUnitario, // Sempre atualiza com o custo da última compra
              ultimo_custo_real: custoUnitario,
            };

            console.log(`💰 Custo atualizado para R$ ${custoUnitario}/kg`);

            await supabase
              .from('materias_primas')
              .update(updateData)
              .eq('id', item.materia_prima_id);

            // Recalcular custo das receitas que usam esta matéria-prima
            if (custoAtual !== custoUnitario) {
              await recalcularCustosReceitas(item.materia_prima_id, custoUnitario);
            }

            // Criar movimentação de entrada
            await supabase.from('movimentacoes_estoque').insert([{
              tipo: 'entrada',
              tipo_item: 'materia_prima',
              item_id: item.materia_prima_id,
              quantidade_anterior: estoqueAnterior,
              quantidade_movimentada: quantidadeAReceber,
              quantidade_atual: novoEstoque,
              unidade: item.materia_prima.unidade_estoque || 'kg',
              motivo: 'compra',
              documento_referencia: `Compra ${compraId}`,
              lote_id,
              custo_real_unitario: custoUnitario,
              observacoes: 'Entrada de estoque - Compra recebida',
            }]);
          }
        }

        // Atualizar quantidade_recebida
        await supabase
          .from('itens_compra')
          .update({ quantidade_recebida: item.quantidade })
          .eq('id', item.id);
      }

      // Atualizar status da compra para 'recebido'
      await update(compraId, { status: 'recebido' });

      return { error: null };
    } catch (err: any) {
      console.error('Erro ao receber compra:', err);
      return { error: err.message };
    }
  };

  /**
   * Recebe item da compra no novo sistema de lotes
   * Cria lote de estoque e dá entrada
   */
  const receberItemComLote = async (
    itemId: string,
    aplicarCusto: boolean = false
  ) => {
    try {
      // Buscar item da compra
      const { data: item, error: fetchError } = await supabase
        .from('compras_itens')
        .select('*, materia_prima:materias_primas(*)')
        .eq('id', itemId)
        .single();

      if (fetchError || !item) {
        throw new Error('Item não encontrado');
      }

      if (item.recebido) {
        throw new Error('Item já foi recebido');
      }

      // Criar lote de estoque
      const { error: loteError, lote_id } = await criarLoteEstoque(
        item.materia_prima_id!,
        item.quantidade_kg,
        item.custo_real_por_kg,
        itemId
      );

      if (loteError) throw new Error(loteError);

      // Atualizar estoque da matéria-prima
      const novoEstoque = (item.materia_prima?.estoque_atual || 0) + item.quantidade_kg;

      const { error: updateEstoqueError } = await supabase
        .from('materias_primas')
        .update({ estoque_atual: novoEstoque })
        .eq('id', item.materia_prima_id);

      if (updateEstoqueError) throw updateEstoqueError;

      // Marcar item como recebido
      const { error: updateItemError } = await supabase
        .from('compras_itens')
        .update({
          recebido: true,
          data_recebimento: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (updateItemError) throw updateItemError;

      // Se aplicar custo, atualizar custo administrativo
      if (aplicarCusto) {
        await aplicarCustoAdministrativo(
          item.materia_prima_id!,
          item.custo_real_por_kg,
          `Compra recebida - Lote ${lote_id}`
        );
      }

      // Criar movimentação
      await supabase.from('movimentacoes_estoque').insert([{
        tipo: 'entrada',
        tipo_item: 'materia_prima',
        item_id: item.materia_prima_id,
        quantidade_anterior: item.materia_prima?.estoque_atual || 0,
        quantidade_movimentada: item.quantidade_kg,
        quantidade_atual: novoEstoque,
        unidade: 'kg',
        motivo: 'compra',
        documento_referencia: `Compra ${item.compra_id}`,
        lote_id,
        custo_real_unitario: item.custo_real_por_kg,
        observacoes: 'Entrada de estoque - Compra recebida',
      }]);

      await fetchCompras();
      return { error: null };
    } catch (error: any) {
      console.error('Erro ao receber item:', error);
      return { error: error.message };
    }
  };

  /**
   * Aplica novo custo administrativo à matéria-prima
   */
  const aplicarCustoAdministrativo = async (
    materiaPrimaId: string,
    novoCusto: number,
    motivo: string
  ) => {
    try {
      // Buscar matéria-prima atual
      const { data: materiaPrima, error: fetchError } = await supabase
        .from('materias_primas')
        .select('*')
        .eq('id', materiaPrimaId)
        .single();

      if (fetchError || !materiaPrima) {
        throw new Error('Matéria-prima não encontrada');
      }

      // Preparar histórico
      const historico: HistoricoCusto[] = materiaPrima.historico_custos || [];
      historico.push({
        data: new Date().toISOString(),
        custo_anterior: materiaPrima.custo_por_unidade,
        custo_novo: novoCusto,
        motivo,
      });

      // Atualizar custo
      const { error: updateError } = await supabase
        .from('materias_primas')
        .update({
          custo_por_unidade: novoCusto,
          historico_custos: historico,
        })
        .eq('id', materiaPrimaId);

      if (updateError) throw updateError;

      // Recalcular custos das receitas que usam esta matéria-prima
      if (materiaPrima.custo_por_unidade !== novoCusto) {
        await recalcularCustosReceitas(materiaPrimaId, novoCusto);
      }

      return { error: null };
    } catch (error: any) {
      console.error('Erro ao aplicar custo:', error);
      return { error: error.message };
    }
  };

  /**
   * Recalcula o custo_por_metro de todas as receitas que usam uma matéria-prima
   * Deve ser chamado sempre que o custo_por_unidade da matéria-prima mudar
   */
  const recalcularCustosReceitas = async (materiaPrimaId: string, novoCustoPorUnidade: number) => {
    try {
      console.log(`🔄 Recalculando custos das receitas para matéria-prima ${materiaPrimaId}...`);

      // Buscar todas as receitas que usam esta matéria-prima
      const { data: receitas, error: receitasError } = await supabase
        .from('receitas')
        .select('id, consumo_por_metro_g, custo_por_metro')
        .eq('materia_prima_id', materiaPrimaId);

      if (receitasError) {
        console.error('Erro ao buscar receitas:', receitasError);
        return { error: receitasError.message, atualizadas: 0 };
      }

      if (!receitas || receitas.length === 0) {
        console.log('Nenhuma receita encontrada para esta matéria-prima');
        return { error: null, atualizadas: 0 };
      }

      let atualizadas = 0;

      // Recalcular custo_por_metro para cada receita
      for (const receita of receitas) {
        // Fórmula: (consumo_g / 1000) * custo_por_kg
        const novoCustoPorMetro = (receita.consumo_por_metro_g / 1000) * novoCustoPorUnidade;

        // Só atualizar se mudou (evitar updates desnecessários)
        if (Math.abs((receita.custo_por_metro || 0) - novoCustoPorMetro) > 0.0001) {
          const { error: updateError } = await supabase
            .from('receitas')
            .update({ custo_por_metro: novoCustoPorMetro })
            .eq('id', receita.id);

          if (updateError) {
            console.error(`Erro ao atualizar receita ${receita.id}:`, updateError);
          } else {
            atualizadas++;
            console.log(`✅ Receita ${receita.id}: custo atualizado de R$ ${receita.custo_por_metro?.toFixed(4)} para R$ ${novoCustoPorMetro.toFixed(4)}/m`);
          }
        }
      }

      console.log(`✅ ${atualizadas} receita(s) atualizada(s)`);
      return { error: null, atualizadas };
    } catch (err: any) {
      console.error('Erro ao recalcular custos:', err);
      return { error: err.message, atualizadas: 0 };
    }
  };

  const refresh = fetchCompras;

  return {
    compras,
    loading,
    error,
    create,
    update,
    delete: deleteCompra,
    updateItemQuantidadeRecebida,
    receberCompraCompleta,
    receberItemComLote,
    aplicarCustoAdministrativo,
    verificarDiferencasCusto,
    aplicarAtualizacoesCusto,
    recalcularCustosReceitas,
    refresh
  };
}
