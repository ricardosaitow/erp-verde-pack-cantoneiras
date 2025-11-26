// ============================================
// HOOK: useClienteParcelamentos
// ============================================
// Hook React para buscar parcelamentos de um cliente específico
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { asaasClient } from '../lib/asaas';

interface UseClienteParcelamentosOptions {
  customerId: string | null;
  limit?: number;
  autoFetch?: boolean;
}

export function useClienteParcelamentos({
  customerId,
  limit = 100,
  autoFetch = true
}: UseClienteParcelamentosOptions) {
  const [parcelamentos, setParcelamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchParcelamentos = useCallback(async () => {
    if (!customerId) {
      setParcelamentos([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.listInstallments({
        customer: customerId,
        limit,
        offset: 0,
      });

      console.log('💳 Parcelamentos do cliente:', response);

      // A API do Asaas retorna: { data: { data: [], totalCount: 0 } }
      const list = response.data as any;
      const data = Array.isArray(list?.data) ? list.data : [];
      setParcelamentos(data);
      setTotalCount(list?.totalCount || data.length);
    } catch (err: any) {
      console.error('❌ Erro ao buscar parcelamentos:', err);
      setError(err.message || 'Erro ao buscar parcelamentos');
      setParcelamentos([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, limit]);

  // Auto-fetch quando o customerId mudar (se autoFetch = true)
  useEffect(() => {
    if (autoFetch && customerId) {
      fetchParcelamentos();
    }
  }, [autoFetch, customerId, fetchParcelamentos]);

  return {
    parcelamentos,
    loading,
    error,
    totalCount,
    refetch: fetchParcelamentos,
  };
}
