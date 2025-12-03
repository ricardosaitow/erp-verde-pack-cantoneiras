import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Package, Calendar, DollarSign, Loader2, AlertCircle, CloudOff, ChevronDown, ChevronUp, Hash, FileText, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useClientePedidosBase, type PedidoComProdutos } from '@/hooks/useClientePedidosBase';
import type { Cliente } from '@/lib/database.types';

interface ClientePedidosModalProps {
  cliente: Cliente | null;
  open: boolean;
  onClose: () => void;
}

export function ClientePedidosModal({ cliente, open, onClose }: ClientePedidosModalProps) {
  const [expandedPedidos, setExpandedPedidos] = useState<Set<number>>(new Set());

  const {
    pedidos,
    loading,
    error,
    totalCount,
    refetch,
  } = useClientePedidosBase({
    customerId: cliente?.base_customer_id || null,
    autoFetch: false,
  });

  // Buscar pedidos quando modal abre
  useEffect(() => {
    if (open && cliente?.base_customer_id) {
      refetch();
    }
  }, [open, cliente?.base_customer_id, refetch]);

  // Reset expanded quando fecha
  useEffect(() => {
    if (!open) {
      setExpandedPedidos(new Set());
    }
  }, [open]);

  const togglePedidoExpanded = (pedidoId: number) => {
    setExpandedPedidos(prev => {
      const next = new Set(prev);
      if (next.has(pedidoId)) {
        next.delete(pedidoId);
      } else {
        next.add(pedidoId);
      }
      return next;
    });
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Pedidos do Cliente</DialogTitle>
              <DialogDescription className="truncate">
                {cliente.nome_fantasia || cliente.razao_social}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto pr-2">
          {!cliente.base_customer_id ? (
            <div className="p-8 text-center text-muted-foreground">
              <CloudOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Cliente n&atilde;o integrado</p>
              <p className="text-sm">Este cliente n&atilde;o est&aacute; integrado com o Base ERP</p>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
              <p className="text-lg font-medium mb-2">Carregando pedidos...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Erro ao carregar pedidos</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum pedido encontrado</p>
              <p className="text-sm">Este cliente ainda n&atilde;o possui pedidos</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium">
                  {totalCount} {totalCount === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (expandedPedidos.size > 0) {
                      setExpandedPedidos(new Set());
                    } else {
                      setExpandedPedidos(new Set(pedidos.map((p: any) => p.id)));
                    }
                  }}
                  className="text-xs"
                >
                  {expandedPedidos.size > 0 ? 'Recolher todos' : 'Expandir todos'}
                </Button>
              </div>

              {/* Lista de Pedidos Expans&iacute;veis */}
              <div className="space-y-3">
                {pedidos.map((pedido: PedidoComProdutos) => {
                  const isExpanded = expandedPedidos.has(pedido.id!);
                  const hasItems = pedido.orderItems && pedido.orderItems.length > 0;

                  return (
                    <div key={pedido.id} className="border rounded-lg overflow-hidden">
                      {/* Header do Pedido */}
                      <div
                        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'bg-muted/30 border-b' : ''}`}
                        onClick={() => hasItems && togglePedidoExpanded(pedido.id!)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {hasItems && (
                              isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )
                            )}
                            <div className="p-1.5 bg-blue-100 rounded-md">
                              <Hash className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                          </div>

                          <div>
                            <p className="font-semibold text-sm">Pedido #{pedido.number}</p>
                            <p className="text-xs text-muted-foreground">
                              {pedido.issueDate ? new Date(pedido.issueDate).toLocaleDateString('pt-BR') : '-'}
                              {hasItems && ` - ${pedido.orderItems.length} ${pedido.orderItems.length === 1 ? 'item' : 'itens'}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {pedido.orderValue !== undefined ? formatCurrency(pedido.orderValue) : '-'}
                            </p>
                            {pedido.costOfShipping && pedido.costOfShipping > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Frete: {formatCurrency(pedido.costOfShipping)}
                              </p>
                            )}
                          </div>

                          {pedido.invoiceNumber ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                              NF-e {pedido.invoiceNumber}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Pendente
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Tabela de Itens (Expandida) */}
                      {isExpanded && hasItems && (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-muted/50 border-b">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">C&oacute;d.</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Produto</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Qtd</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Pre&ccedil;o Unit.</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {pedido.orderItems.map((item: any, index: number) => {
                                const produto = item.productId && pedido.produtosInfo ? pedido.produtosInfo[item.productId] : null;

                                return (
                                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-3 py-2 text-sm font-mono text-xs">
                                      {produto?.code || item.productId || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      <p className="font-medium text-sm">{produto?.name || item.description || 'Produto'}</p>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-center font-medium">
                                      {item.quantity?.toLocaleString('pt-BR') || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-right">
                                      {item.unitPrice !== undefined ? formatCurrency(item.unitPrice) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-right font-medium">
                                      {item.itemValue !== undefined ? formatCurrency(item.itemValue) : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-muted/30 border-t">
                              <tr>
                                <td colSpan={4} className="px-3 py-2 text-sm font-medium text-right">Total:</td>
                                <td className="px-3 py-2 text-sm text-right font-semibold text-green-600">
                                  {pedido.itemsValue !== undefined ? formatCurrency(pedido.itemsValue) : formatCurrency(pedido.orderValue || 0)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
