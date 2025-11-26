// ============================================
// HOOK: useClienteAtividades
// ============================================
// Hook para buscar timeline de atividades do cliente
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Atividade {
  id: string;
  tipo: string; // 'cobranca', 'edicao', 'integracao', 'notificacao'
  acao: string; // 'criado', 'atualizado', 'pago', 'vencido', etc
  descricao: string;
  metadados?: any;
  created_at: string;
}

interface UseClienteAtividadesOptions {
  clienteId: string | null;
  limit?: number;
  autoFetch?: boolean;
}

export function useClienteAtividades({
  clienteId,
  limit = 50,
  autoFetch = true
}: UseClienteAtividadesOptions) {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAtividades = useCallback(async () => {
    if (!clienteId) {
      setAtividades([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('clientes_eventos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (err) {
        console.error('❌ Erro ao buscar atividades:', err);
        // Se a tabela não existir, retornar array vazio sem erro
        if (err.code === '42P01') {
          console.warn('⚠️  Tabela clientes_eventos não existe ainda');
          setAtividades([]);
        } else {
          setError(err.message);
        }
      } else {
        setAtividades(data || []);
      }
    } catch (err: any) {
      console.error('❌ Erro ao buscar atividades:', err);
      setError(err.message || 'Erro ao buscar atividades');
      setAtividades([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId, limit]);

  // Auto-fetch quando o clienteId mudar
  useEffect(() => {
    if (autoFetch && clienteId) {
      fetchAtividades();
    }
  }, [autoFetch, clienteId, fetchAtividades]);

  return {
    atividades,
    loading,
    error,
    refetch: fetchAtividades,
  };
}
