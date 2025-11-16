import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Layers, DollarSign, MapPin, Weight, Ruler } from 'lucide-react';
import type { MateriaPrima } from '@/lib/database.types';
import { formatNumber, formatCurrency, formatQuantity } from '@/lib/format';

interface MateriaPrimaEstoqueDetailModalProps {
  materiaPrima: MateriaPrima | null;
  open: boolean;
  onClose: () => void;
}

export function MateriaPrimaEstoqueDetailModal({
  materiaPrima,
  open,
  onClose,
}: MateriaPrimaEstoqueDetailModalProps) {
  if (!materiaPrima) return null;

  const estoqueAtual = Number(materiaPrima.estoque_atual) || 0;
  const estoqueMinimo = Number(materiaPrima.estoque_minimo) || 0;
  const estoquePontoReposicao = Number(materiaPrima.estoque_ponto_reposicao) || 0;

  let estoqueStatus: { label: string; variant: 'success' | 'warning' | 'destructive' } = {
    label: 'Normal',
    variant: 'success',
  };

  if (estoqueAtual < estoquePontoReposicao) {
    estoqueStatus = { label: 'Crítico', variant: 'destructive' };
  } else if (estoqueAtual < estoqueMinimo) {
    estoqueStatus = { label: 'Baixo', variant: 'warning' };
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{materiaPrima.nome}</DialogTitle>
              <DialogDescription className="capitalize">
                {materiaPrima.tipo.replace('_', ' ')}
              </DialogDescription>
            </div>
            <div className="flex-shrink-0 mr-8">
              <Badge variant={estoqueStatus.variant}>{estoqueStatus.label}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Níveis de Estoque */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Níveis de Estoque</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex-1">
                  <p className="text-xs text-emerald-700 font-medium">Estoque Atual</p>
                  <p className="font-bold text-lg text-emerald-700">
                    {formatQuantity(estoqueAtual, materiaPrima.unidade_estoque)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Estoque Mínimo</p>
                  <p className="font-medium text-sm">
                    {formatQuantity(estoqueMinimo, materiaPrima.unidade_estoque)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Ponto de Reposição</p>
                  <p className="font-medium text-sm">
                    {formatQuantity(estoquePontoReposicao, materiaPrima.unidade_estoque)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Características Físicas */}
          {(materiaPrima.gramatura || materiaPrima.largura_mm || materiaPrima.peso_por_metro_g) && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span>Características Físicas</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {materiaPrima.gramatura && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="p-2 bg-background rounded-md">
                        <Weight className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Gramatura</p>
                        <p className="font-medium text-sm">{materiaPrima.gramatura} g/m²</p>
                      </div>
                    </div>
                  )}

                  {materiaPrima.largura_mm && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="p-2 bg-background rounded-md">
                        <Ruler className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Largura</p>
                        <p className="font-medium text-sm">{materiaPrima.largura_mm} mm</p>
                      </div>
                    </div>
                  )}

                  {materiaPrima.peso_por_metro_g && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="p-2 bg-background rounded-md">
                        <Weight className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Peso por Metro</p>
                        <p className="font-medium text-sm">{formatNumber(materiaPrima.peso_por_metro_g)} g/m</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Custo e Localização */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Custo e Localização</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Custo por Unidade</p>
                  <p className="font-bold text-lg text-green-600">
                    {formatCurrency(materiaPrima.custo_por_unidade)}
                  </p>
                </div>
              </div>

              {materiaPrima.local_armazenamento && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Local de Armazenamento</p>
                    <p className="font-medium text-sm">{materiaPrima.local_armazenamento}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Valor Total em Estoque */}
          <Separator />
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-1">
              <p className="text-xs text-blue-700 font-medium">Valor Total em Estoque</p>
              <p className="font-bold text-2xl text-blue-700">
                {formatCurrency(estoqueAtual * materiaPrima.custo_por_unidade)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {formatQuantity(estoqueAtual, materiaPrima.unidade_estoque)} × {formatCurrency(materiaPrima.custo_por_unidade)}/{materiaPrima.unidade_estoque}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
