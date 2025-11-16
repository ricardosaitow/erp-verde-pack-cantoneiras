import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Compra, CompraCompleta, ItemCompra } from '../lib/database.types';

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

  const receberCompraCompleta = async (compraId: string) => {
    try {
      // Buscar todos os itens da compra
      const { data: itens, error: itensError } = await supabase
        .from('itens_compra')
        .select('*')
        .eq('compra_id', compraId);

      if (itensError) throw itensError;

      // Atualizar quantidade_recebida de todos os itens para a quantidade total
      for (const item of itens || []) {
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
    refresh
  };
}
