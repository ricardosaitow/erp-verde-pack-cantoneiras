import { useState } from 'react';
import { toast } from 'sonner';
import { useCompras } from '../../hooks/useCompras';
import type { CompraCompleta } from '../../lib/database.types';
import { formatCurrency } from '../../lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Package, CheckCircle2, X } from 'lucide-react';

interface CompraDetailModalProps {
  compra: CompraCompleta;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function CompraDetailModal({ compra, open, onClose, onUpdate }: CompraDetailModalProps) {
  const { update, updateItemQuantidadeRecebida, receberCompraCompleta } = useCompras();
  const [status, setStatus] = useState(compra.status);

  const handleUpdateStatus = async () => {
    const { error } = await update(compra.id, { status });
    if (error) {
      toast.error(`Erro ao atualizar status: ${error}`);
      return;
    }
    toast.success('Status atualizado!');
    onUpdate();
  };

  const handleReceberItem = async (itemId: string, quantidade: number) => {
    const { error } = await updateItemQuantidadeRecebida(itemId, quantidade);
    if (error) {
      toast.error(`Erro ao receber item: ${error}`);
      return;
    }
    toast.success('Quantidade recebida atualizada!');
    onUpdate();
  };

  const handleReceberTudo = async () => {
    const { error } = await receberCompraCompleta(compra.id);
    if (error) {
      toast.error(`Erro ao receber compra: ${error}`);
      return;
    }
    toast.success('Compra recebida completamente!');
    onUpdate();
    onClose();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      pendente: { label: 'Pendente', variant: 'secondary' },
      aprovado: { label: 'Aprovado', variant: 'default' },
      pedido_enviado: { label: 'Pedido Enviado', variant: 'default' },
      parcialmente_recebido: { label: 'Parcialmente Recebido', variant: 'outline' },
      recebido: { label: 'Recebido', variant: 'success' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const todosItensRecebidos = compra.itens?.every(item => item.quantidade_recebida >= item.quantidade);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle>Compra {compra.numero_compra}</DialogTitle>
              <DialogDescription>Detalhes e recebimento da compra</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Informações Gerais */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Fornecedor</Label>
              <p className="font-medium">
                {compra.fornecedor?.nome_fantasia || compra.fornecedor?.razao_social || 'N/A'}
              </p>
            </div>

            <div>
              <Label>Tipo</Label>
              <p className="font-medium">
                <Badge variant="outline">
                  {compra.tipo_compra === 'materia_prima' ? 'Matéria-Prima' : 'Revenda'}
                </Badge>
              </p>
            </div>

            <div>
              <Label>Data da Compra</Label>
              <p className="font-medium">{new Date(compra.data_compra).toLocaleDateString('pt-BR')}</p>
            </div>

            {compra.data_entrega_prevista && (
              <div>
                <Label>Entrega Prevista</Label>
                <p className="font-medium">
                  {new Date(compra.data_entrega_prevista).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            <div>
              <Label>Status Atual</Label>
              <div className="flex items-center gap-2">
                {getStatusBadge(compra.status)}
              </div>
            </div>

            <div>
              <Label>Alterar Status</Label>
              <div className="flex gap-2">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="pedido_enviado">Pedido Enviado</SelectItem>
                    <SelectItem value="parcialmente_recebido">Parcialmente Recebido</SelectItem>
                    <SelectItem value="recebido">Recebido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                {status !== compra.status && (
                  <Button size="sm" onClick={handleUpdateStatus}>
                    Atualizar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {compra.condicao_pagamento && (
            <div>
              <Label>Condição de Pagamento</Label>
              <p className="font-medium">{compra.condicao_pagamento}</p>
            </div>
          )}

          {compra.observacoes && (
            <div>
              <Label>Observações</Label>
              <p className="text-sm text-muted-foreground">{compra.observacoes}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Itens */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Itens da Compra</h3>
            {!todosItensRecebidos && compra.status !== 'recebido' && (
              <Button size="sm" onClick={handleReceberTudo} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Receber Tudo
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {compra.itens?.map((item) => {
              const itemNome = item.materia_prima?.nome || item.produto?.nome || 'Item não encontrado';
              const unidade = item.unidade_medida;
              const totalRecebido = item.quantidade_recebida >= item.quantidade;

              return (
                <Card key={item.id} className={totalRecebido ? 'border-emerald-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{itemNome}</p>
                          {totalRecebido && (
                            <Badge variant="success" className="text-xs">
                              Recebido
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Quantidade</p>
                            <p className="font-medium">
                              {item.quantidade} {unidade}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Preço Unitário</p>
                            <p className="font-medium">{formatCurrency(item.preco_unitario)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Subtotal</p>
                            <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Recebido</p>
                            <p className="font-medium">
                              {item.quantidade_recebida} {unidade}
                            </p>
                          </div>
                        </div>
                      </div>

                      {!totalRecebido && compra.status !== 'recebido' && (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.001"
                            defaultValue={item.quantidade_recebida}
                            onBlur={(e) => {
                              const novaQuantidade = parseFloat(e.target.value) || 0;
                              if (novaQuantidade !== item.quantidade_recebida) {
                                handleReceberItem(item.id, novaQuantidade);
                              }
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-24"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReceberItem(item.id, item.quantidade)}
                          >
                            Receber
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Valores */}
        <div className="space-y-3">
          <h3 className="font-semibold">Valores</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-medium">{formatCurrency(compra.valor_total)}</span>
            </div>
            {compra.desconto > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto:</span>
                <span className="font-medium text-red-600">- {formatCurrency(compra.desconto)}</span>
              </div>
            )}
            {compra.frete > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete:</span>
                <span className="font-medium">+ {formatCurrency(compra.frete)}</span>
              </div>
            )}
            {compra.outras_despesas > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outras Despesas:</span>
                <span className="font-medium">+ {formatCurrency(compra.outras_despesas)}</span>
              </div>
            )}
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Valor Final:</span>
            <span>{formatCurrency(compra.valor_final)}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
