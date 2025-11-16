import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Categoria } from '../lib/database.types';

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchCategorias() {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se as credenciais estão configuradas
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      }
      
      // Buscar todas as categorias
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar categorias:', error);
        
        // Verificar se é erro de credenciais/configuração
        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
          throw new Error('Credenciais do Supabase não configuradas ou inválidas. Configure o arquivo .env.local com suas credenciais.');
        }
        
        // Verificar se a tabela não existe
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          throw new Error('Tabela "categorias" não encontrada. Execute o schema SQL no Supabase.');
        }
        
        throw error;
      }
      
      setCategorias(data || []);
      console.log(`✅ ${data?.length || 0} categoria(s) carregada(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar categorias';
      setError(errorMessage);
      console.error('Erro ao carregar categorias:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategorias();
  }, []);

  async function createCategoria(categoria: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert([categoria])
        .select()
        .single();

      if (error) throw error;
      await fetchCategorias();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao criar categoria' };
    }
  }

  async function updateCategoria(id: string, categoria: Partial<Categoria>) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .update(categoria)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchCategorias();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao atualizar categoria' };
    }
  }

  async function deleteCategoria(id: string) {
    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCategorias();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir categoria' };
    }
  }

  return {
    categorias,
    loading,
    error,
    refresh: fetchCategorias,
    create: createCategoria,
    update: updateCategoria,
    delete: deleteCategoria,
  };
}

