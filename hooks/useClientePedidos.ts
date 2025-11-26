// ============================================
// HOOK: useClientePedidos
// ============================================
// Hook para buscar pedidos de um cliente
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PedidoCompleto } from '../lib/database.types';

interface UseClientePedidosProps {
  clienteId: string | null;
  autoFetch?: boolean;
}

export function useClientePedidos({ clienteId, autoFetch = true }: UseClientePedidosProps) {
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!clienteId) {
      setPedidos([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Buscar pedidos com informações do cliente e itens
      const { data, error: fetchError, count } = await supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes!cliente_id (
            id,
            razao_social,
            nome_fantasia,
            cnpj_cpf,
            email,
            telefone
          ),
          itens:pedido_itens (
            *,
            produto:produtos!produto_id (
              id,
              nome,
              codigo_interno,
              unidade_venda
            )
          )
        `, { count: 'exact' })
        .eq('cliente_id', clienteId)
        .order('data_pedido', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setPedidos(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Erro ao buscar pedidos do cliente:', err);
      setError(err.message);
      setPedidos([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  // Auto-fetch quando clienteId mudar
  useEffect(() => {
    if (autoFetch && clienteId) {
      refetch();
    }
  }, [autoFetch, clienteId, refetch]);

  return {
    pedidos,
    loading,
    error,
    totalCount,
    refetch,
  };
}
