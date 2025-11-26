// ============================================
// HOOK: useClienteCobrancas
// ============================================
// Hook React para buscar cobranças de um cliente específico
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { asaasClient } from '../lib/asaas';
import type { AsaasPaymentResponse } from '../types/asaas';

interface UseClienteCobrancasOptions {
  customerId: string | null;
  limit?: number;
  autoFetch?: boolean;
}

export function useClienteCobrancas({
  customerId,
  limit = 100,
  autoFetch = true
}: UseClienteCobrancasOptions) {
  const [cobrancas, setCobrancas] = useState<AsaasPaymentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCobrancas = useCallback(async () => {
    if (!customerId) {
      setCobrancas([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.listPayments({
        customer: customerId,
        limit,
        offset: 0,
      });

      console.log('📄 Cobranças do cliente:', response);

      // A API do Asaas retorna: { data: { data: [], totalCount: 0 } }
      const list = response.data as any;
      const data = Array.isArray(list?.data) ? list.data : [];
      setCobrancas(data);
      setTotalCount(list?.totalCount || data.length);
    } catch (err: any) {
      console.error('❌ Erro ao buscar cobranças:', err);
      setError(err.message || 'Erro ao buscar cobranças');
      setCobrancas([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, limit]);

  // Auto-fetch quando o customerId mudar (se autoFetch = true)
  useEffect(() => {
    if (autoFetch && customerId) {
      fetchCobrancas();
    }
  }, [autoFetch, customerId, fetchCobrancas]);

  return {
    cobrancas,
    loading,
    error,
    totalCount,
    refetch: fetchCobrancas,
  };
}
