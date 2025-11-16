import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { OrdemProducao, OrdemProducaoCompleta } from '../lib/database.types';
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
      
      // Buscar ordens de produção com relacionamentos
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
      if (ordemSendoIniciada && ordemAtual && ordemAtual.produto) {
        const produto = ordemAtual.produto as any;
        const quantidadeMetros = Number(ordemAtual.quantidade_produzir_metros) || 0;
        const pedidoId = ordemAtual.pedido_id;

        if (quantidadeMetros > 0 && produto.id) {
          const { error: baixaError, errosDetalhados } = await darBaixaMateriasPrimasProducao(
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
          }
        }
      }
      
      await fetchOrdens();
      return { data, error: null };
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

  return {
    ordens,
    loading,
    error,
    refresh: fetchOrdens,
    create: createOrdem,
    update: updateOrdem,
    delete: deleteOrdem,
  };
}

