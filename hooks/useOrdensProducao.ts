import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { OrdemProducao, OrdemProducaoCompleta, OrdemProducaoItem, AlertaMudancaLote } from '../lib/database.types';
import { darBaixaMateriasPrimasProducao } from '../lib/estoque';

export function useOrdensProducao() {
  const [ordens, setOrdens] = useState<OrdemProducaoCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrdens() {
    try {
      setLoading(true);
      setError(null);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      }
      
      // Buscar ordens de produção com relacionamentos e itens
      const { data, error } = await supabase
        .from('ordens_producao')
        .select(`
          *,
          pedido:pedidos(*),
          produto:produtos(
            *,
            receitas:receitas(
              *,
              materia_prima:materias_primas(*)
            )
          ),
          itens:ordens_producao_itens(
            *,
            produto:produtos(
              *,
              receitas:receitas(
                *,
                materia_prima:materias_primas(*)
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar ordens de produção:', error);
        
        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
          throw new Error('Credenciais do Supabase não configuradas ou inválidas. Configure o arquivo .env.local com suas credenciais.');
        }
        
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          throw new Error('Tabela "ordens_producao" não encontrada. Execute o schema SQL no Supabase.');
        }
        
        throw error;
      }
      
      setOrdens(data || []);
      console.log(`✅ ${data?.length || 0} ordem(ns) de produção carregada(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar ordens de produção';
      setError(errorMessage);
      console.error('Erro ao carregar ordens de produção:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrdens();
  }, []);

  async function createOrdem(ordem: Omit<OrdemProducao, 'id' | 'created_at' | 'updated_at' | 'numero_op'>) {
    try {
      // Gerar número da ordem
      const { count } = await supabase
        .from('ordens_producao')
        .select('*', { count: 'exact', head: true });
      
      const numeroOp = `OP-${String((count || 0) + 1).padStart(4, '0')}`;
      
      const { data, error } = await supabase
        .from('ordens_producao')
        .insert([{ ...ordem, numero_op: numeroOp }])
        .select()
        .single();

      if (error) throw error;
      await fetchOrdens();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao criar ordem de produção' };
    }
  }

  async function updateOrdem(id: string, ordem: Partial<OrdemProducao>) {
    try {
      // Buscar ordem atual para verificar se está sendo iniciada
      const { data: ordemAtual, error: fetchError } = await supabase
        .from('ordens_producao')
        .select(`
          *,
          produto:produtos(
            *,
            receitas:receitas(
              *,
              materia_prima:materias_primas(*)
            )
          ),
          pedido:pedidos(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar ordem atual:', fetchError);
      }

      // Verificar se a ordem está sendo iniciada (status mudando para 'em_producao')
      const estavaAguardando = ordemAtual && ordemAtual.status === 'aguardando';
      const sendoIniciada = ordem.status === 'em_producao';
      const ordemSendoIniciada = estavaAguardando && sendoIniciada;

      // Atualizar ordem
      const { data, error } = await supabase
        .from('ordens_producao')
        .update({
          ...ordem,
          // Se está sendo iniciada, registrar data de início
          data_inicio_producao: sendoIniciada ? new Date().toISOString() : ordem.data_inicio_producao,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Se a ordem foi iniciada, dar baixa no estoque de matérias-primas
      let alertasMudancaCusto: AlertaMudancaLote[] | undefined;

      if (ordemSendoIniciada && ordemAtual && ordemAtual.produto) {
        const produto = ordemAtual.produto as any;
        const quantidadeMetros = Number(ordemAtual.quantidade_produzir_metros) || 0;
        const pedidoId = ordemAtual.pedido_id;

        if (quantidadeMetros > 0 && produto.id) {
          const { error: baixaError, errosDetalhados, alertas } = await darBaixaMateriasPrimasProducao(
            produto.id,
            quantidadeMetros,
            ordemAtual.id,
            pedidoId
          );

          if (baixaError) {
            console.error('Erro ao dar baixa nas matérias-primas:', baixaError);
            if (errosDetalhados && errosDetalhados.length > 0) {
              console.error('Erros detalhados:', errosDetalhados);
            }
            // Não falhar a ordem se a baixa falhar, mas avisar
            console.warn('Atenção: Estoque de matérias-primas não foi atualizado');
          } else {
            console.log(`✅ Baixa de matérias-primas realizada para ordem ${ordemAtual.numero_op}`);

            // Capturar alertas de mudança de custo
            if (alertas && alertas.length > 0) {
              console.log(`⚠️  ${alertas.length} alerta(s) de mudança de custo detectado(s)`);
              alertasMudancaCusto = alertas;
            }
          }
        }
      }

      await fetchOrdens();
      return {
        data,
        error: null,
        alertas: alertasMudancaCusto
      };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao atualizar ordem de produção' };
    }
  }

  async function deleteOrdem(id: string) {
    try {
      const { error } = await supabase
        .from('ordens_producao')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchOrdens();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir ordem de produção' };
    }
  }

  /**
   * Inicia a produção de um item específico da OP
   * Atualiza o status do item para 'em_producao' e da OP para 'em_producao' ou 'parcial'
   */
  async function iniciarItemProducao(
    ordemId: string,
    itemId: string
  ): Promise<{ error: string | null; alertas?: AlertaMudancaLote[] }> {
    try {
      // Buscar a ordem e o item
      const { data: ordem, error: ordemError } = await supabase
        .from('ordens_producao')
        .select(`
          *,
          itens:ordens_producao_itens(
            *,
            produto:produtos(
              *,
              receitas:receitas(
                *,
                materia_prima:materias_primas(*)
              )
            )
          )
        `)
        .eq('id', ordemId)
        .single();

      if (ordemError || !ordem) {
        return { error: 'Ordem de produção não encontrada' };
      }

      const item = (ordem.itens as any[])?.find((i: any) => i.id === itemId);
      if (!item) {
        return { error: 'Item não encontrado na ordem de produção' };
      }

      if (item.status !== 'aguardando') {
        return { error: `Item já está em status "${item.status}"` };
      }

      // Atualizar status do item para 'em_producao'
      const { error: updateItemError } = await supabase
        .from('ordens_producao_itens')
        .update({
          status: 'em_producao',
          data_inicio: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (updateItemError) {
        return { error: `Erro ao iniciar item: ${updateItemError.message}` };
      }

      // Verificar status dos outros itens para definir status da OP
      const outrosItens = (ordem.itens as any[])?.filter((i: any) => i.id !== itemId) || [];
      const temItemFinalizado = outrosItens.some((i: any) => i.status === 'finalizado');
      const temItemAguardando = outrosItens.some((i: any) => i.status === 'aguardando');

      // Definir novo status da OP
      let novoStatusOp: string;
      if (temItemFinalizado && temItemAguardando) {
        novoStatusOp = 'parcial'; // Alguns finalizados, alguns aguardando
      } else if (temItemFinalizado) {
        novoStatusOp = 'parcial'; // Alguns finalizados, este sendo iniciado
      } else {
        novoStatusOp = 'em_producao'; // Primeiro item sendo iniciado
      }

      // Atualizar status da OP
      const { error: updateOpError } = await supabase
        .from('ordens_producao')
        .update({
          status: novoStatusOp,
          data_inicio_producao: ordem.data_inicio_producao || new Date().toISOString(),
        })
        .eq('id', ordemId);

      if (updateOpError) {
        console.error('Erro ao atualizar status da OP:', updateOpError);
      }

      // Dar baixa no estoque de matérias-primas para este item
      let alertasMudancaCusto: AlertaMudancaLote[] | undefined;
      const produto = item.produto;
      const quantidadeMetros = Number(item.quantidade_metros) || 0;

      if (quantidadeMetros > 0 && produto?.id) {
        const { error: baixaError, errosDetalhados, alertas } = await darBaixaMateriasPrimasProducao(
          produto.id,
          quantidadeMetros,
          ordemId,
          ordem.pedido_id
        );

        if (baixaError) {
          console.error('Erro ao dar baixa nas matérias-primas:', baixaError);
          if (errosDetalhados && errosDetalhados.length > 0) {
            console.error('Erros detalhados:', errosDetalhados);
          }
          console.warn('Atenção: Estoque de matérias-primas não foi atualizado');
        } else {
          console.log(`✅ Baixa de matérias-primas realizada para item ${item.id}`);

          if (alertas && alertas.length > 0) {
            console.log(`⚠️  ${alertas.length} alerta(s) de mudança de custo detectado(s)`);
            alertasMudancaCusto = alertas;
          }
        }
      }

      await fetchOrdens();
      return { error: null, alertas: alertasMudancaCusto };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao iniciar item de produção' };
    }
  }

  /**
   * Finaliza a produção de um item específico da OP
   * Atualiza o status do item para 'finalizado' e verifica se a OP deve ser finalizada
   */
  async function finalizarItemProducao(
    ordemId: string,
    itemId: string
  ): Promise<{ error: string | null }> {
    try {
      // Buscar a ordem e seus itens
      const { data: ordem, error: ordemError } = await supabase
        .from('ordens_producao')
        .select(`
          *,
          itens:ordens_producao_itens(*)
        `)
        .eq('id', ordemId)
        .single();

      if (ordemError || !ordem) {
        return { error: 'Ordem de produção não encontrada' };
      }

      const item = (ordem.itens as any[])?.find((i: any) => i.id === itemId);
      if (!item) {
        return { error: 'Item não encontrado na ordem de produção' };
      }

      if (item.status !== 'em_producao') {
        return { error: `Item não está em produção (status atual: "${item.status}")` };
      }

      // Atualizar status do item para 'finalizado'
      const { error: updateItemError } = await supabase
        .from('ordens_producao_itens')
        .update({
          status: 'finalizado',
          data_fim: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (updateItemError) {
        return { error: `Erro ao finalizar item: ${updateItemError.message}` };
      }

      // Verificar se todos os itens foram finalizados
      const outrosItens = (ordem.itens as any[])?.filter((i: any) => i.id !== itemId) || [];
      const todosFinalizados = outrosItens.every((i: any) => i.status === 'finalizado' || i.status === 'cancelado');
      const temItemAguardando = outrosItens.some((i: any) => i.status === 'aguardando');

      // Definir novo status da OP
      let novoStatusOp: string;
      if (todosFinalizados) {
        novoStatusOp = 'concluido'; // Todos os itens finalizados
      } else if (temItemAguardando) {
        novoStatusOp = 'parcial'; // Alguns finalizados, alguns ainda aguardando
      } else {
        novoStatusOp = 'em_producao'; // Alguns ainda em produção
      }

      // Atualizar status da OP
      const updateData: any = { status: novoStatusOp };
      if (novoStatusOp === 'concluido') {
        updateData.data_conclusao = new Date().toISOString();
      }

      const { error: updateOpError } = await supabase
        .from('ordens_producao')
        .update(updateData)
        .eq('id', ordemId);

      if (updateOpError) {
        console.error('Erro ao atualizar status da OP:', updateOpError);
      }

      await fetchOrdens();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao finalizar item de produção' };
    }
  }

  /**
   * Retorna os itens de uma ordem específica
   */
  function getItensOrdem(ordemId: string): OrdemProducaoItem[] {
    const ordem = ordens.find(o => o.id === ordemId);
    return (ordem?.itens as OrdemProducaoItem[]) || [];
  }

  return {
    ordens,
    loading,
    error,
    refresh: fetchOrdens,
    create: createOrdem,
    update: updateOrdem,
    delete: deleteOrdem,
    // Novos métodos para gerenciar itens
    iniciarItemProducao,
    finalizarItemProducao,
    getItensOrdem,
  };
}

