// ============================================
// HOOK: useClientePedidosBase
// ============================================
// Hook para buscar pedidos do Base ERP de um cliente
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { baseClient } from '../lib/base';
import type { BaseSalesOrder } from '../types/base';

interface UseClientePedidosBaseProps {
  customerId: string | null; // base_customer_id
  autoFetch?: boolean;
}

export function useClientePedidosBase({ customerId, autoFetch = false }: UseClientePedidosBaseProps) {
  const [pedidos, setPedidos] = useState<BaseSalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!customerId) {
      setPedidos([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Buscando pedidos do Base ERP para customerId:', customerId);

      // Buscar todos os pedidos e filtrar por customerId
      // (Base API pode não ter filtro direto por customerId)
      const response = await baseClient.listSalesOrders({
        limit: 100,
      });

      console.log('📦 Resposta do Base ERP:', response);

      if (!response.data) {
        console.warn('⚠️ Base ERP não retornou dados');
        setPedidos([]);
        setTotalCount(0);
        return;
      }

      // A API do Base retorna dados paginados em response.data.content
      // mas também pode retornar diretamente em response.data (array)
      const pedidosArray = Array.isArray(response.data)
        ? response.data
        : (response.data as any).content || [];

      if (!Array.isArray(pedidosArray)) {
        console.error('❌ Não foi possível extrair array de pedidos:', typeof response.data, response.data);
        throw new Error('Base ERP retornou dados em formato inesperado');
      }

      console.log(`📋 Total de pedidos retornados: ${pedidosArray.length}`);

      // Filtrar pedidos do cliente
      // IMPORTANTE: customerId pode ser string no banco mas número na API do Base
      // Por isso fazemos comparação com conversão para string
      const pedidosCliente = pedidosArray.filter(
        (pedido: BaseSalesOrder) => String(pedido.customerId) === String(customerId)
      );

      setPedidos(pedidosCliente);
      setTotalCount(pedidosCliente.length);

      console.log(`✅ ${pedidosCliente.length} pedidos encontrados para o cliente`);
    } catch (err: any) {
      console.error('❌ Erro ao buscar pedidos do Base ERP:', err);
      setError(err.message);
      setPedidos([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // Auto-fetch quando customerId mudar
  useEffect(() => {
    if (autoFetch && customerId) {
      refetch();
    }
  }, [autoFetch, customerId, refetch]);

  return {
    pedidos,
    loading,
    error,
    totalCount,
    refetch,
  };
}
