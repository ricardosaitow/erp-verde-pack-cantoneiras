// ============================================
// HOOK: useClienteAssinaturas
// ============================================
// Hook React para buscar assinaturas de um cliente específico
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { asaasClient } from '../lib/asaas';

interface UseClienteAssinaturasOptions {
  customerId: string | null;
  limit?: number;
  autoFetch?: boolean;
}

export function useClienteAssinaturas({
  customerId,
  limit = 100,
  autoFetch = true
}: UseClienteAssinaturasOptions) {
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAssinaturas = useCallback(async () => {
    if (!customerId) {
      setAssinaturas([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.listSubscriptions({
        customer: customerId,
        limit,
        offset: 0,
      });

      console.log('📅 Assinaturas do cliente:', response);

      // A API do Asaas retorna: { data: { data: [], totalCount: 0 } }
      const list = response.data as any;
      const data = Array.isArray(list?.data) ? list.data : [];
      setAssinaturas(data);
      setTotalCount(list?.totalCount || data.length);
    } catch (err: any) {
      console.error('❌ Erro ao buscar assinaturas:', err);
      setError(err.message || 'Erro ao buscar assinaturas');
      setAssinaturas([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, limit]);

  // Auto-fetch quando o customerId mudar (se autoFetch = true)
  useEffect(() => {
    if (autoFetch && customerId) {
      fetchAssinaturas();
    }
  }, [autoFetch, customerId, fetchAssinaturas]);

  return {
    assinaturas,
    loading,
    error,
    totalCount,
    refetch: fetchAssinaturas,
  };
}
