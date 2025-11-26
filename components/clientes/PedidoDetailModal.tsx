import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Package, Calendar, DollarSign, FileText, Hash, Loader2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { baseClient } from '@/lib/base';

interface PedidoDetailModalProps {
  pedidoId: string | null;
  open: boolean;
  onClose: () => void;
}

export function PedidoDetailModal({ pedidoId, open, onClose }: PedidoDetailModalProps) {
  const [pedido, setPedido] = useState<any>(null);
  const [produtos, setProdutos] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pedidoId) {
      setPedido(null);
      setProdutos({});
      setError(null);
      return;
    }

    async function fetchPedido() {
      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Buscando detalhes do pedido:', pedidoId);
        const response = await baseClient.getSalesOrder(pedidoId);

        if (!response.data) {
          throw new Error('Pedido não encontrado');
        }

        setPedido(response.data);
        console.log('✅ Pedido carregado:', response.data);

        // Buscar detalhes dos produtos
        if (response.data.orderItems && response.data.orderItems.length > 0) {
          const produtosMap: Record<string, any> = {};

          // Buscar todos os produtos em paralelo
          const promises = response.data.orderItems
            .filter((item: any) => item.productId)
            .map(async (item: any) => {
              try {
                const prodResp = await baseClient.getProduct(String(item.productId));
                if (prodResp.data) {
                  produtosMap[item.productId] = prodResp.data;
                }
              } catch (err) {
                console.error(`Erro ao buscar produto ${item.productId}:`, err);
              }
            });

          await Promise.all(promises);
          setProdutos(produtosMap);
          console.log('✅ Produtos carregados:', Object.keys(produtosMap).length);
        }
      } catch (err: any) {
        console.error('❌ Erro ao buscar pedido:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPedido();
  }, [pedidoId, open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>
                {loading ? 'Carregando...' : `Pedido #${pedido?.number || pedido?.id}`}
              </DialogTitle>
              <DialogDescription>
                Detalhes do pedido de venda
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
              <p className="text-lg font-medium mb-2">Carregando detalhes do pedido...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Erro ao carregar pedido</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : pedido ? (
            <>
              {/* Informações Gerais */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Informações Gerais</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <Hash className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Número do Pedido</p>
                      <p className="font-medium text-sm">#{pedido.number}</p>
                      <p className="text-xs text-muted-foreground font-mono">ID: {pedido.id}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Data de Emissão</p>
                      <p className="font-medium text-sm">
                        {pedido.issueDate ? new Date(pedido.issueDate).toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="font-medium text-lg text-green-600">
                        {pedido.orderValue !== undefined ? formatCurrency(pedido.orderValue) : '-'}
                      </p>
                    </div>
                  </div>

                  {pedido.invoiceNumber && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="p-2 bg-green-100 rounded-md">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Nota Fiscal</p>
                        <p className="font-medium text-sm text-green-700">NF-e {pedido.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">ID: {pedido.invoiceId}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Valores Detalhados */}
              {(pedido.itemsValue > 0 || pedido.discountValue > 0 || pedido.costOfShipping > 0) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Valores</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                    {pedido.itemsValue > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor dos Itens</span>
                        <span className="font-medium">{formatCurrency(pedido.itemsValue)}</span>
                      </div>
                    )}
                    {pedido.discountValue > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Desconto</span>
                        <span className="font-medium text-red-600">- {formatCurrency(pedido.discountValue)}</span>
                      </div>
                    )}
                    {pedido.costOfShipping > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Frete</span>
                        <span className="font-medium">+ {formatCurrency(pedido.costOfShipping)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total</span>
                      <span className="text-green-600">{formatCurrency(pedido.orderValue)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Observações */}
              {pedido.observations && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Observações</span>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {pedido.observations}
                    </p>
                  </div>
                </div>
              )}

              {/* Itens do Pedido */}
              {pedido.orderItems && pedido.orderItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>Itens do Pedido ({pedido.orderItems.length})</span>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Produto</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Unidade</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Quantidade</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor Unit.</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Desconto</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {pedido.orderItems.map((item: any, index: number) => {
                            const produto = item.productId ? produtos[item.productId] : null;

                            return (
                              <tr key={index} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm">
                                  {produto ? (
                                    <>
                                      <p className="font-medium mb-1">{produto.name}</p>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="font-mono">Cód: {produto.code}</span>
                                        {produto.ncm && <span className="font-mono">NCM: {produto.ncm}</span>}
                                      </div>
                                      <p className="text-xs text-muted-foreground font-mono mt-1">ID: {item.productId}</p>
                                    </>
                                  ) : item.productId ? (
                                    <>
                                      <p className="font-medium mb-1">{item.description || 'Carregando...'}</p>
                                      <p className="text-xs text-muted-foreground font-mono">ID: {item.productId}</p>
                                    </>
                                  ) : (
                                    <p className="font-medium">{item.description || 'Produto'}</p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {produto?.unit || '-'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm text-center font-medium">
                                  {item.quantity.toLocaleString('pt-BR')}
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  {formatCurrency(item.unitPrice)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  {item.discountValue > 0 ? (
                                    <span className="text-red-600">- {formatCurrency(item.discountValue)}</span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-medium">
                                  {formatCurrency(item.itemValue)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
