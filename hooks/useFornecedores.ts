import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Fornecedor } from '../lib/database.types';

export function useFornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchFornecedores() {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se as credenciais estão configuradas
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      }
      
      // Buscar todos os fornecedores (incluindo inativos)
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome_fantasia');

      if (error) {
        console.error('Erro ao buscar fornecedores:', error);
        
        // Verificar se é erro de credenciais/configuração
        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
          throw new Error('Credenciais do Supabase não configuradas ou inválidas. Configure o arquivo .env.local com suas credenciais.');
        }
        
        // Verificar se a tabela não existe
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          throw new Error('Tabela "fornecedores" não encontrada. Execute o schema SQL no Supabase.');
        }
        
        throw error;
      }
      
      setFornecedores(data || []);
      console.log(`✅ ${data?.length || 0} fornecedor(es) carregado(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar fornecedores';
      setError(errorMessage);
      console.error('Erro ao carregar fornecedores:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFornecedores();
  }, []);

  async function createFornecedor(fornecedor: Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert([fornecedor])
        .select()
        .single();

      if (error) throw error;
      await fetchFornecedores();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao criar fornecedor' };
    }
  }

  async function updateFornecedor(id: string, fornecedor: Partial<Fornecedor>) {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .update(fornecedor)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchFornecedores();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao atualizar fornecedor' };
    }
  }

  async function deleteFornecedor(id: string) {
    try {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchFornecedores();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir fornecedor' };
    }
  }

  return {
    fornecedores,
    loading,
    error,
    refresh: fetchFornecedores,
    create: createFornecedor,
    update: updateFornecedor,
    delete: deleteFornecedor,
  };
}

