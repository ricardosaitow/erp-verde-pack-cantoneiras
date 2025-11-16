import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { MovimentacaoEstoque } from '../lib/database.types';

export function useMovimentacoesEstoque() {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMovimentacoes() {
    try {
      setLoading(true);
      setError(null);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      }
      
      // Buscar todas as movimentações ordenadas por data (mais recentes primeiro)
      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar movimentações:', error);
        
        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
          throw new Error('Credenciais do Supabase não configuradas ou inválidas. Configure o arquivo .env.local com suas credenciais.');
        }
        
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          throw new Error('Tabela "movimentacoes_estoque" não encontrada. Execute o schema SQL no Supabase.');
        }
        
        throw error;
      }
      
      setMovimentacoes(data || []);
      console.log(`✅ ${data?.length || 0} movimentação(ões) carregada(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar movimentações';
      setError(errorMessage);
      console.error('Erro ao carregar movimentações:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMovimentacoes();
  }, []);

  async function createMovimentacao(movimentacao: Omit<MovimentacaoEstoque, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .insert([movimentacao])
        .select()
        .single();

      if (error) throw error;
      
      await fetchMovimentacoes();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao criar movimentação' };
    }
  }

  async function deleteMovimentacao(id: string) {
    try {
      const { error } = await supabase
        .from('movimentacoes_estoque')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchMovimentacoes();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir movimentação' };
    }
  }

  return {
    movimentacoes,
    loading,
    error,
    refresh: fetchMovimentacoes,
    create: createMovimentacao,
    delete: deleteMovimentacao,
  };
}
