import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Produto, ProdutoComCusto, Receita } from '../lib/database.types';

export function useProdutos() {
  const [produtos, setProdutos] = useState<ProdutoComCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchProdutos() {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se as credenciais estão configuradas
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      }
      // Buscar todos os produtos (incluindo inativos para não perder dados antigos)
      // Incluir categorias e receitas relacionadas
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          categoria:categorias(*),
          receitas:receitas(
            *,
            materia_prima:materias_primas(*)
          )
        `)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar produtos:', error);
        
        // Verificar se é erro de credenciais/configuração
        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
          throw new Error('Credenciais do Supabase não configuradas ou inválidas. Configure o arquivo .env.local com suas credenciais.');
        }
        
        // Verificar se a tabela não existe
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          throw new Error('Tabela "produtos" não encontrada. Execute o schema SQL no Supabase.');
        }
        
        throw error;
      }
      
      setProdutos(data || []);
      console.log(`✅ ${data?.length || 0} produto(s) carregado(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar produtos';
      setError(errorMessage);
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProdutos();
  }, []);

  async function createProduto(produto: any) {
    try {
      // Separar receitas do produto
      const { receitas, ...produtoData } = produto;
      
      // Criar produto
      const { data: produtoCriado, error: produtoError } = await supabase
        .from('produtos')
        .insert([produtoData])
        .select()
        .single();

      if (produtoError) throw produtoError;
      
      // Se tiver receitas, criar elas
      if (receitas && receitas.length > 0 && produtoCriado) {
        const receitasParaInserir = receitas.map((r: any) => ({
          produto_id: produtoCriado.id,
          materia_prima_id: r.materia_prima_id,
          numero_camadas: r.numero_camadas,
          consumo_por_metro_g: r.consumo_por_metro_g,
          custo_por_metro: r.custo_por_metro,
        }));
        
        const { error: receitasError } = await supabase
          .from('receitas')
          .insert(receitasParaInserir);
          
        if (receitasError) {
          console.error('Erro ao criar receitas:', receitasError);
          // Não falhar se receitas falharem, mas avisar
        }
      }
      
      await fetchProdutos();
      return { data: produtoCriado, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao criar produto' };
    }
  }

  async function updateProduto(id: string, produto: any) {
    try {
      // Separar receitas do produto
      const { receitas, ...produtoData } = produto;
      
      // Atualizar produto
      const { data: produtoAtualizado, error: produtoError } = await supabase
        .from('produtos')
        .update(produtoData)
        .eq('id', id)
        .select()
        .single();

      if (produtoError) throw produtoError;
      
      // Se tiver receitas, atualizar elas (deletar antigas e inserir novas)
      if (receitas !== undefined && produtoAtualizado) {
        // Deletar receitas antigas
        const { error: deleteError } = await supabase
          .from('receitas')
          .delete()
          .eq('produto_id', id);
          
        if (deleteError) {
          console.error('Erro ao deletar receitas antigas:', deleteError);
        }
        
        // Inserir novas receitas se houver
        if (receitas && receitas.length > 0) {
          const receitasParaInserir = receitas.map((r: any) => ({
            produto_id: id,
            materia_prima_id: r.materia_prima_id,
            numero_camadas: r.numero_camadas,
            consumo_por_metro_g: r.consumo_por_metro_g,
            custo_por_metro: r.custo_por_metro,
          }));
          
          const { error: receitasError } = await supabase
            .from('receitas')
            .insert(receitasParaInserir);
            
          if (receitasError) {
            console.error('Erro ao criar receitas:', receitasError);
          }
        }
      }
      
      await fetchProdutos();
      return { data: produtoAtualizado, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao atualizar produto' };
    }
  }

  async function deleteProduto(id: string) {
    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchProdutos();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir produto' };
    }
  }

  // Gerenciar receitas (composição)
  async function addReceita(receita: Omit<Receita, 'id' | 'created_at' | 'updated_at' | 'custo_por_metro'>) {
    try {
      const { data, error } = await supabase
        .from('receitas')
        .insert([receita])
        .select()
        .single();

      if (error) throw error;
      
      await fetchProdutos();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao adicionar receita' };
    }
  }

  async function removeReceita(id: string) {
    try {
      const { error } = await supabase
        .from('receitas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchProdutos();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao remover receita' };
    }
  }

  return {
    produtos,
    loading,
    error,
    refresh: fetchProdutos,
    create: createProduto,
    update: updateProduto,
    delete: deleteProduto,
    addReceita,
    removeReceita,
  };
}
