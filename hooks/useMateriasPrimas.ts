import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { MateriaPrima } from '../lib/database.types';

export function useMateriasPrimas() {
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMateriasPrimas() {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar todas as matérias-primas (incluindo inativas para não perder dados antigos)
      // Filtrar apenas se o campo ativo existir e for false explicitamente
      const { data, error } = await supabase
        .from('materias_primas')
        .select('*')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar matérias-primas:', error);
        
        // Verificar se é erro de credenciais/configuração
        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
          throw new Error('Credenciais do Supabase não configuradas ou inválidas. Configure o arquivo .env.local com suas credenciais.');
        }
        
        // Verificar se a tabela não existe
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          throw new Error('Tabela "materias_primas" não encontrada. Execute o schema SQL no Supabase.');
        }
        
        throw error;
      }
      
      setMateriasPrimas(data || []);
      console.log(`✅ ${data?.length || 0} matéria(s)-prima(s) carregada(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar matérias-primas';
      setError(errorMessage);
      console.error('Erro ao carregar matérias-primas:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Verificar se as credenciais estão configuradas antes de fazer a requisição
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
      setError('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      setLoading(false);
      return;
    }
    
    fetchMateriasPrimas();
  }, []);

  async function createMateriaPrima(materiaPrima: Omit<MateriaPrima, 'id' | 'created_at' | 'updated_at' | 'peso_por_metro_g'>) {
    try {
      const { data, error } = await supabase
        .from('materias_primas')
        .insert([materiaPrima])
        .select()
        .single();

      if (error) throw error;
      
      await fetchMateriasPrimas();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao criar matéria-prima' };
    }
  }

  async function updateMateriaPrima(id: string, materiaPrima: Partial<MateriaPrima>) {
    try {
      const { data, error } = await supabase
        .from('materias_primas')
        .update(materiaPrima)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      await fetchMateriasPrimas();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao atualizar matéria-prima' };
    }
  }

  async function deleteMateriaPrima(id: string) {
    try {
      const { error } = await supabase
        .from('materias_primas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchMateriasPrimas();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir matéria-prima' };
    }
  }

  return {
    materiasPrimas,
    loading,
    error,
    refresh: fetchMateriasPrimas,
    create: createMateriaPrima,
    update: updateMateriaPrima,
    delete: deleteMateriaPrima,
  };
}
