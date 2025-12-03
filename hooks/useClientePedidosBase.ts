// ============================================
// HOOK: useClientePedidosBase
// ============================================
// Hook para buscar pedidos do Base ERP de um cliente
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { baseClient } from '../lib/base';
import type { BaseSalesOrder, BaseProduct } from '../types/base';

interface UseClientePedidosBaseProps {
  customerId: string | null; // base_customer_id
  autoFetch?: boolean;
}

// Tipo estendido com dados de produtos
export interface PedidoComProdutos extends BaseSalesOrder {
  produtosInfo?: Record<number, BaseProduct>;
}

export function useClientePedidosBase({ customerId, autoFetch = false }: UseClientePedidosBaseProps) {
  const [pedidos, setPedidos] = useState<PedidoComProdutos[]>([]);
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

      // A API do Base ERP retorna apenas 10 pedidos por página (ignora limit > 10)
      // Por isso precisamos buscar todas as páginas
      let allPedidos: BaseSalesOrder[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore && page < 50) { // máximo 50 páginas (500 pedidos)
        const response = await baseClient.listSalesOrders({
          limit: 100,
          page,
        });

        if (!response.data) {
          console.warn('⚠️ Base ERP não retornou dados na página', page);
          break;
        }

        // A API do Base retorna dados paginados em response.data.content
        const pedidosArray = Array.isArray(response.data)
          ? response.data
          : (response.data as any).content || [];

        if (!Array.isArray(pedidosArray)) {
          console.error('❌ Não foi possível extrair array de pedidos:', typeof response.data, response.data);
          break;
        }

        const totalPages = (response.data as any).totalPages || 1;

        console.log(`📦 Página ${page + 1}/${totalPages}: ${pedidosArray.length} pedidos`);

        allPedidos = allPedidos.concat(pedidosArray);

        page++;
        hasMore = page < totalPages;
      }

      console.log(`📋 Total de pedidos retornados: ${allPedidos.length}`);

      // Filtrar pedidos do cliente
      // IMPORTANTE: customerId pode ser string no banco mas número na API do Base
      // Por isso fazemos comparação com conversão para string
      const pedidosCliente = allPedidos.filter(
        (pedido: BaseSalesOrder) => String(pedido.customerId) === String(customerId)
      );

      console.log(`✅ ${pedidosCliente.length} pedidos encontrados para o cliente`);

      // Buscar detalhes completos de cada pedido (incluindo itens)
      const pedidosComDetalhes: PedidoComProdutos[] = [];

      for (const pedido of pedidosCliente) {
        try {
          // Buscar detalhes do pedido
          const detalhesResponse = await baseClient.getSalesOrder(String(pedido.id));
          const pedidoCompleto = detalhesResponse.data || pedido;

          // Buscar informações dos produtos
          const produtosInfo: Record<number, BaseProduct> = {};

          if (pedidoCompleto.orderItems && pedidoCompleto.orderItems.length > 0) {
            const productIds = pedidoCompleto.orderItems
              .filter((item: any) => item.productId)
              .map((item: any) => item.productId);

            // Buscar cada produto (em paralelo)
            await Promise.all(
              productIds.map(async (productId: number) => {
                try {
                  const prodResp = await baseClient.getProduct(String(productId));
                  if (prodResp.data) {
                    produtosInfo[productId] = prodResp.data;
                  }
                } catch (err) {
                  console.warn(`⚠️ Erro ao buscar produto ${productId}:`, err);
                }
              })
            );
          }

          pedidosComDetalhes.push({
            ...pedidoCompleto,
            produtosInfo,
          });
        } catch (err) {
          console.warn(`⚠️ Erro ao buscar detalhes do pedido ${pedido.id}:`, err);
          pedidosComDetalhes.push(pedido);
        }
      }

      // Ordenar por número do pedido (mais recente primeiro)
      pedidosComDetalhes.sort((a, b) => (b.number || 0) - (a.number || 0));

      setPedidos(pedidosComDetalhes);
      setTotalCount(pedidosComDetalhes.length);

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
