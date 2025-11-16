import React from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { formatQuantity } from '../lib/format';
import { StatsCard, PageHeader, LoadingSpinner, StatusBadge } from '@/components/erp';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, Package, AlertTriangle, ShoppingCart } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { stats, pedidosRecentes, estoqueBaixo, loading, error, refresh } = useDashboard();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dashboard</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <Button
              onClick={() => refresh()}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema em tempo real"
        action={{
          label: 'Atualizar',
          onClick: refresh,
          icon: <RefreshCw className="h-4 w-4" />,
          variant: 'outline'
        }}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Vendas do Mês"
          value={formatCurrency(stats.vendasMes)}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatsCard
          title="Pedidos em Aberto"
          value={stats.pedidosAberto}
          icon={<ShoppingCart className="h-6 w-6" />}
        />
        <StatsCard
          title="Ordens de Produção"
          value={stats.ordensProducao}
          icon={<Package className="h-6 w-6" />}
        />
        <StatsCard
          title="Alertas de Estoque"
          value={stats.alertasEstoque}
          icon={<AlertTriangle className="h-6 w-6" />}
          className={stats.alertasEstoque > 0 ? 'border-destructive' : ''}
        />
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {pedidosRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum pedido encontrado</p>
            ) : (
              <ul className="space-y-4">
                {pedidosRecentes.map((pedido) => {
                  const clienteNome = pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social || 'Cliente não identificado';
                  return (
                    <li key={pedido.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium">#{pedido.numero_pedido}</p>
                        <p className="text-xs text-muted-foreground">{clienteNome}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary">
                          {formatCurrency(Number(pedido.valor_total) || 0)}
                        </span>
                        <StatusBadge status={pedido.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Estoque Baixo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estoque Baixo de Matérias-Primas</CardTitle>
          </CardHeader>
          <CardContent>
            {estoqueBaixo.length === 0 ? (
              <div className="py-4">
                <p className="text-sm text-muted-foreground">Nenhum alerta de estoque</p>
                <Badge variant="success" className="mt-2">Tudo OK</Badge>
              </div>
            ) : (
              <ul className="space-y-4">
                {estoqueBaixo.map((mp) => {
                  const estoqueAtual = Number(mp.estoque_atual) || 0;
                  const estoqueMinimo = Number(mp.estoque_minimo) || 0;
                  const percentual = estoqueMinimo > 0 ? (estoqueAtual / estoqueMinimo) * 100 : 0;
                  const isCritico = percentual < 50;

                  return (
                    <li
                      key={mp.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{mp.nome}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-semibold ${isCritico ? 'text-destructive' : 'text-amber-600'}`}>
                            {formatQuantity(estoqueAtual, mp.unidade_estoque)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / {formatQuantity(estoqueMinimo, mp.unidade_estoque)} mín
                          </span>
                        </div>
                      </div>
                      <Badge variant={isCritico ? 'destructive' : 'warning'}>
                        {isCritico ? 'Crítico' : 'Baixo'}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
