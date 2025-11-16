import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Pedido, OrdemProducao, MateriaPrima } from '../lib/database.types';

export interface DashboardStats {
  vendasMes: number;
  pedidosAberto: number;
  ordensProducao: number;
  alertasEstoque: number;
}

export interface DashboardData {
  stats: DashboardStats;
  pedidosRecentes: (Pedido & { cliente?: { nome_fantasia?: string; razao_social: string } })[];
  estoqueBaixo: MateriaPrima[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(): DashboardData {
  const [stats, setStats] = useState<DashboardStats>({
    vendasMes: 0,
    pedidosAberto: 0,
    ordensProducao: 0,
    alertasEstoque: 0,
  });
  const [pedidosRecentes, setPedidosRecentes] = useState<any[]>([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState<MateriaPrima[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      }
      
      // Buscar vendas do mês
      const mesAtual = new Date();
      const primeiroDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
      
      const { data: vendasData, error: vendasError } = await supabase
        .from('pedidos')
        .select('valor_total')
        .eq('tipo', 'pedido_confirmado')
        .neq('status', 'cancelado')
        .gte('data_pedido', primeiroDiaMes.toISOString().split('T')[0]);
      
      if (vendasError) throw vendasError;
      
      const vendasMes = vendasData?.reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0) || 0;
      
      // Buscar pedidos em aberto
      const { count: pedidosAbertoCount, error: pedidosError } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .in('status', ['orcamento', 'aprovado', 'producao']);
      
      if (pedidosError) throw pedidosError;
      
      // Buscar ordens de produção ativas
      const { count: ordensCount, error: ordensError } = await supabase
        .from('ordens_producao')
        .select('*', { count: 'exact', head: true })
        .in('status', ['aguardando', 'em_producao']);
      
      if (ordensError) throw ordensError;
      
      // Buscar matérias-primas com estoque baixo
      // Nota: Supabase não suporta comparação direta entre colunas facilmente,
      // então vamos buscar todas e filtrar no cliente
      const { data: todasMateriasPrimas, error: estoqueError } = await supabase
        .from('materias_primas')
        .select('*')
        .eq('ativo', true);
      
      if (estoqueError) throw estoqueError;
      
      // Filtrar matérias-primas com estoque abaixo do mínimo
      const estoqueData = todasMateriasPrimas?.filter(mp => {
        const estoqueAtual = Number(mp.estoque_atual) || 0;
        const estoqueMinimo = Number(mp.estoque_minimo) || 0;
        return estoqueAtual < estoqueMinimo;
      }) || [];
      
      // Buscar pedidos recentes
      const { data: pedidosData, error: pedidosRecentesError } = await supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(nome_fantasia, razao_social)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (pedidosRecentesError) throw pedidosRecentesError;
      
      setStats({
        vendasMes,
        pedidosAberto: pedidosAbertoCount || 0,
        ordensProducao: ordensCount || 0,
        alertasEstoque: estoqueData?.length || 0,
      });
      
      setPedidosRecentes(pedidosData || []);
      setEstoqueBaixo(estoqueData || []);
      
      console.log('✅ Dashboard atualizado');
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar dados do dashboard';
      setError(errorMessage);
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    stats,
    pedidosRecentes,
    estoqueBaixo,
    loading,
    error,
    refresh: fetchDashboardData,
  };
}

