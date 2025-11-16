import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Trash2, ShoppingCart, User, Calendar, FileText, Package, DollarSign, Truck, CreditCard, MessageSquare, Eye } from 'lucide-react';
import type { PedidoCompleto } from '@/lib/database.types';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/erp';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { getAllowedTransitions, isFinalStatus, type PedidoStatus, type PedidoTipo } from '@/lib/pedido-workflow';

interface PedidoDetailModalProps {
  pedido: PedidoCompleto | null;
  open: boolean;
  onClose: () => void;
  onEdit: (pedido: PedidoCompleto) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (pedido: PedidoCompleto, newStatus: string) => Promise<void>;
}

export function PedidoDetailModal({
  pedido,
  open,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus
}: PedidoDetailModalProps) {
  const isAdmin = useIsAdmin();

  if (!pedido) return null;

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleEdit = () => {
    onEdit(pedido);
    onClose();
  };

  const handleDelete = () => {
    onDelete(pedido.id);
  };

  const clienteNome = pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social || 'Cliente não identificado';

  // Obter transições permitidas para o status atual
  const allowedTransitions = getAllowedTransitions(
    pedido.status as PedidoStatus,
    pedido.tipo as PedidoTipo
  );

  // Incluir o status atual na lista (para manter selecionado)
  const availableStatuses = [pedido.status, ...allowedTransitions];

  // Verificar se é um estado final
  const isStatusFinal = isFinalStatus(pedido.status as PedidoStatus);

  // Mapeamento de labels dos status
  const statusLabels: Record<string, string> = {
    'pendente': 'Pendente',
    'aprovado': 'Aprovado',
    'producao': 'Em Produção',
    'finalizado': 'Finalizado',
    'entregue': 'Entregue',
    'cancelado': 'Cancelado',
    'recusado': 'Recusado',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Pedido {pedido.numero_pedido}</DialogTitle>
              <DialogDescription>
                {clienteNome}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mr-8">
              <StatusBadge status={pedido.status} />
              <Badge variant={pedido.tipo === 'pedido_confirmado' ? 'success' : 'secondary'}>
                {pedido.tipo === 'pedido_confirmado' ? 'Pedido' : 'Orçamento'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Informações do Pedido */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Informações do Pedido</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium text-sm">{clienteNome}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Data do Pedido</p>
                  <p className="font-medium text-sm">{formatDate(pedido.data_pedido)}</p>
                </div>
              </div>

              {pedido.prazo_entrega_dias && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <Truck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Prazo de Entrega</p>
                    <p className="font-medium text-sm">{pedido.prazo_entrega_dias} dias</p>
                  </div>
                </div>
              )}

              {pedido.forma_pagamento && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                    <p className="font-medium text-sm">{pedido.forma_pagamento}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Itens do Pedido */}
          {pedido.itens && pedido.itens.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>Itens do Pedido</span>
              </div>
              <Card>
                <div className="divide-y">
                  {pedido.itens.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.produto?.nome || 'Produto não identificado'}</p>
                          <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground mt-1">
                            {item.quantidade_pecas && item.comprimento_cada_mm ? (
                              <span>
                                {item.quantidade_pecas.toLocaleString('pt-BR')} peças × {item.comprimento_cada_mm.toLocaleString('pt-BR')}mm
                              </span>
                            ) : (
                              <span>{item.quantidade_simples?.toLocaleString('pt-BR')} {item.unidade_medida}</span>
                            )}
                            <span className="text-xs">× {formatCurrency(Number(item.preco_unitario) || 0)}</span>
                          </div>
                          {item.observacoes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Obs: {item.observacoes}
                            </p>
                          )}
                        </div>
                        <p className="font-bold text-emerald-600 ml-4">
                          {formatCurrency(Number(item.subtotal) || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          <Separator />

          {/* Valores */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Valores</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Valor dos Produtos</p>
                  <p className="font-medium text-sm">{formatCurrency(Number(pedido.valor_produtos) || 0)}</p>
                </div>
              </div>

              {Number(pedido.valor_frete) > 0 && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Frete</p>
                    <p className="font-medium text-sm">{formatCurrency(Number(pedido.valor_frete) || 0)}</p>
                  </div>
                </div>
              )}

              {Number(pedido.valor_desconto) > 0 && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Desconto</p>
                    <p className="font-medium text-sm text-red-600">- {formatCurrency(Number(pedido.valor_desconto) || 0)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-emerald-700">Valor Total</p>
                  <p className="font-bold text-lg text-emerald-700">{formatCurrency(Number(pedido.valor_total) || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {pedido.condicoes_pagamento && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Condições de Pagamento</span>
                </div>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{pedido.condicoes_pagamento}</p>
              </div>
            </>
          )}

          {pedido.observacoes && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>Observações</span>
                </div>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{pedido.observacoes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Alterar Status */}
          {!isStatusFinal && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Alterar Status</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusEdit" className="text-sm font-medium">
                  Status do Pedido
                </Label>
                <Select
                  value={pedido.status}
                  onValueChange={(value) => onUpdateStatus(pedido, value)}
                  disabled={isStatusFinal}
                >
                  <SelectTrigger id="statusEdit" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status] || status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {allowedTransitions.length === 0 && !isStatusFinal && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma transição disponível a partir deste status
                  </p>
                )}
                {isStatusFinal && (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Este pedido está em um estado final e não pode ter o status alterado
                  </p>
                )}
              </div>
            </div>
          )}
          {isStatusFinal && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">
                ✓ Pedido Finalizado
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Este pedido está em um estado final ({statusLabels[pedido.status]}) e não pode ter o status alterado
              </p>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {isAdmin && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
          <Button onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
