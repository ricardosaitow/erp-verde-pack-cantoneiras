import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { usePedidos } from '../hooks/usePedidos';
import type { PedidoCompleto } from '../lib/database.types';
import { formatCurrency } from '../lib/format';
import { gerarPDFPedido } from '../lib/pdf-generator';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, Truck, Package, Printer } from 'lucide-react';
import { DespachoFilter, applyDespachoFilters, type DespachoFilterState } from '@/components/despacho/DespachoFilter';

export default function DespachoPage() {
  const { pedidos, update, refresh, loading, error } = usePedidos();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<DespachoFilterState>({
    search: '',
    status: 'todos',
  });

  // Filtrar apenas pedidos produzidos (aguardando_despacho e entregue)
  const pedidosProducao = useMemo(() => {
    const filtrados = pedidos.filter(pedido =>
      pedido.status === 'aguardando_despacho' || pedido.status === 'entregue'
    );
    console.log(`📦 Total de pedidos: ${pedidos.length}`);
    console.log(`✅ Pedidos aguardando despacho ou entregues: ${filtrados.length}`);
    console.log('Status dos pedidos:', pedidos.map(p => ({ numero: p.numero_pedido, status: p.status })));
    return filtrados;
  }, [pedidos]);

  // Apply filters
  const pedidosFiltrados = useMemo(() => {
    return applyDespachoFilters(pedidosProducao, filters);
  }, [pedidosProducao, filters]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleDespachar = async (pedido: PedidoCompleto) => {
    setProcessingId(pedido.id);

    const { error } = await update(pedido.id, {
      status: 'entregue'
    });

    if (error) {
      toast.error(`Erro ao confirmar despacho: ${error}`);
      setProcessingId(null);
      return;
    }

    toast.success(`Pedido ${pedido.numero_pedido} despachado com sucesso!`);
    setProcessingId(null);
    refresh();
  };

  const handleImprimirPDF = async (pedido: PedidoCompleto) => {
    setPrintingId(pedido.id);

    try {
      await gerarPDFPedido(pedido);
      toast.success(`PDF gerado para o pedido ${pedido.numero_pedido}`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPrintingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar pedidos</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <Button onClick={() => refresh()} variant="outline" size="sm" className="mt-4">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Despacho de Pedidos"
        description={
          pedidosProducao.length > 0
            ? `${pedidosFiltrados.length} de ${pedidosProducao.length} ${pedidosProducao.length === 1 ? 'pedido' : 'pedidos'}`
            : undefined
        }
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </PageHeader>

      {/* Filtros */}
      <DespachoFilter
        filters={filters}
        onFiltersChange={setFilters}
        pedidos={pedidosProducao}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Número Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Data Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Valor Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <EmptyState
                      icon={<Package size={48} />}
                      title={pedidosProducao.length === 0 ? "Nenhum pedido produzido" : "Nenhum pedido encontrado"}
                      description={pedidosProducao.length === 0 ? "Não há pedidos aguardando despacho ou entregues no momento" : "Tente ajustar os filtros para encontrar o que procura"}
                    />
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const clienteNome = pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social || 'Cliente não identificado';
                  const isProcessing = processingId === pedido.id;
                  const isPrinting = printingId === pedido.id;
                  const jaEntregue = pedido.status === 'entregue';

                  return (
                    <tr
                      key={pedido.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium">{pedido.numero_pedido}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{clienteNome}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(pedido.data_pedido)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {formatCurrency(Number(pedido.valor_total) || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={pedido.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleImprimirPDF(pedido)}
                            disabled={isPrinting}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            {isPrinting ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Printer className="h-4 w-4" />
                                PDF
                              </>
                            )}
                          </Button>
                          {jaEntregue ? (
                            <Badge variant="success" className="gap-1">
                              <Package className="h-3 w-3" />
                              Despachado
                            </Badge>
                          ) : (
                            <Button
                              onClick={() => handleDespachar(pedido)}
                              disabled={isProcessing}
                              size="sm"
                              className="gap-2"
                            >
                              {isProcessing ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <>
                                  <Truck className="h-4 w-4" />
                                  Despachar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
