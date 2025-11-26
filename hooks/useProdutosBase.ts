// ============================================
// HOOK: useProdutosBase
// ============================================
// Hook para buscar produtos do Base ERP
// ============================================

import { useState, useCallback, useEffect } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const BASE_PROXY_URL = `${SUPABASE_URL}/functions/v1/base-proxy`;

export interface ProdutoBase {
  id: string;
  name: string;
  code?: string;
  ncm?: string;
  unit: string;
  barcode?: string;
  salePrice?: number;
  externalReference?: string;
  stockBalance?: number;
  deleted: boolean;
}

interface UseProdutosBaseOptions {
  limit?: number;
  offset?: number;
  autoFetch?: boolean;
}

export function useProdutosBase(options: UseProdutosBaseOptions = {}) {
  const { limit = 100, offset = 0, autoFetch = true } = options;

  const [produtos, setProdutos] = useState<ProdutoBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Buscando produtos do Base ERP...');

      const response = await fetch(BASE_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          method: 'GET',
          endpoint: `/api/v1/products?limit=${limit}&offset=${offset}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar produtos: ${response.status}`);
      }

      const data = await response.json();

      if (!data.data) {
        throw new Error('Base ERP não retornou dados');
      }

      // A API do Base retorna dados paginados em data.content
      const produtosArray = Array.isArray(data.data)
        ? data.data
        : (data.data as any).content || [];

      if (!Array.isArray(produtosArray)) {
        throw new Error('Base ERP retornou dados em formato inesperado');
      }

      console.log(`✅ ${produtosArray.length} produtos encontrados`);

      setProdutos(produtosArray);
      setTotalCount(produtosArray.length);
    } catch (err: any) {
      console.error('❌ Erro ao buscar produtos:', err);
      setError(err.message);
      setProdutos([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    if (autoFetch) {
      fetchProdutos();
    }
  }, [autoFetch, fetchProdutos]);

  return {
    produtos,
    loading,
    error,
    totalCount,
    refetch: fetchProdutos,
  };
}
