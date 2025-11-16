import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, MapPin, Layers } from 'lucide-react';
import { formatQuantity } from '@/lib/format';
import type { InventarioItem } from './InventarioFilter';

interface InventarioDetailModalProps {
  item: InventarioItem | null;
  open: boolean;
  onClose: () => void;
}

export function InventarioDetailModal({
  item,
  open,
  onClose,
}: InventarioDetailModalProps) {
  if (!item) return null;

  const nivelBadgeVariant =
    item.nivel_alerta === 'critico' ? 'destructive' :
    item.nivel_alerta === 'baixo' ? 'warning' : 'success';

  const nivelLabel =
    item.nivel_alerta === 'critico' ? 'Crítico' :
    item.nivel_alerta === 'baixo' ? 'Baixo' : 'Normal';

  const tipoLabel = item.tipo === 'produto_revenda' ? 'Produto Revenda' : 'Matéria-Prima';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{item.nome}</DialogTitle>
              <DialogDescription>{tipoLabel}</DialogDescription>
            </div>
            <div className="flex-shrink-0 mr-8">
              <Badge variant={nivelBadgeVariant}>{nivelLabel}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Níveis de Estoque */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span>Níveis de Estoque</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex-1">
                  <p className="text-xs text-emerald-700 font-medium">Estoque Atual</p>
                  <p className="font-bold text-lg text-emerald-700">
                    {formatQuantity(item.estoque_atual, item.unidade)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Estoque Mínimo</p>
                  <p className="font-medium text-sm">
                    {formatQuantity(item.estoque_minimo, item.unidade)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Ponto de Reposição</p>
                  <p className="font-medium text-sm">
                    {formatQuantity(item.estoque_ponto_reposicao, item.unidade)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Local de Armazenamento */}
          {item.local_armazenamento && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Localização</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Local de Armazenamento</p>
                    <p className="font-medium text-sm">{item.local_armazenamento}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Alert de Reposição */}
          {item.nivel_alerta !== 'normal' && (
            <>
              <Separator />
              <div className={`p-4 rounded-lg border ${
                item.nivel_alerta === 'critico'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <p className={`text-sm font-medium ${
                  item.nivel_alerta === 'critico' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {item.nivel_alerta === 'critico'
                    ? '⚠️ Estoque Crítico - Reabastecer Urgente'
                    : '⚠️ Estoque Baixo - Reabastecer em Breve'
                  }
                </p>
                <p className={`text-xs mt-1 ${
                  item.nivel_alerta === 'critico' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  O estoque atual está {item.nivel_alerta === 'critico' ? 'abaixo do ponto de reposição' : 'abaixo do nível mínimo'}
                </p>
              </div>
            </>
          )}
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
