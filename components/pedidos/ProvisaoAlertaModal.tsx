import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Package, ShoppingCart, CheckCircle2, Calendar } from 'lucide-react';
import type { ResultadoProvisao } from '../../lib/estoque';
import { formatCurrency, formatNumber, formatDate } from '../../lib/format';

interface ProvisaoAlertaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmar: () => void;
  provisao: ResultadoProvisao | null;
  numeroPedido: string;
  loading?: boolean;
}

export function ProvisaoAlertaModal({
  open,
  onClose,
  onConfirmar,
  provisao,
  numeroPedido,
  loading = false,
}: ProvisaoAlertaModalProps) {
  if (!provisao) return null;

  const alertasEstoque = provisao.alertas.filter(a => a.tipo === 'estoque_insuficiente');
  const temEstoqueSuficiente = provisao.resumo.tem_estoque_suficiente;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${temEstoqueSuficiente ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              {temEstoqueSuficiente ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <DialogTitle>
                {temEstoqueSuficiente ? 'Confirmar Aprovação' : 'Atenção: Material Insuficiente'}
              </DialogTitle>
              <DialogDescription>
                Pedido {numeroPedido}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Alertas de Estoque Insuficiente */}
        {alertasEstoque.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <ShoppingCart className="h-4 w-4" />
              <h3 className="font-semibold">Necessário Comprar</h3>
            </div>
            {alertasEstoque.map((alerta, index) => (
              <Alert key={index} className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">{alerta.materia_prima_nome}</AlertTitle>
                <AlertDescription className="text-amber-700">
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-amber-600">Necessário</p>
                      <p className="font-semibold">{formatNumber(alerta.quantidade_necessaria || 0)} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-600">Disponível</p>
                      <p className="font-semibold">{formatNumber(alerta.quantidade_disponivel || 0)} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-600">Faltando</p>
                      <p className="font-bold text-red-600">{formatNumber(alerta.quantidade_faltante || 0)} kg</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Materiais e Lotes a serem Reservados */}
        {provisao.reservas.length > 0 && provisao.reservas.some(r => r.lotes.length > 0) && (
          <>
            {alertasEstoque.length > 0 && <Separator />}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <h3 className="font-semibold">Provisão de Material</h3>
              </div>

              <div className="space-y-3">
                {provisao.reservas.filter(r => r.lotes.length > 0).map((reserva) => (
                  <Card key={reserva.materia_prima_id} className="border-gray-200">
                    <CardContent className="p-4 space-y-3">
                      {/* Cabeçalho: Nome e quantidade total */}
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-base">{reserva.materia_prima_nome}</p>
                        <p className="font-bold text-lg">{formatNumber(reserva.quantidade_total_kg)} kg</p>
                      </div>

                      {/* Lotes que serão utilizados */}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Lotes a utilizar (PEPS):</p>
                        {reserva.lotes.map((lote) => (
                          <div
                            key={lote.lote_id}
                            className="flex items-center justify-between text-sm bg-white rounded px-3 py-2 border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="text-xs">{formatDate(lote.data_entrada)}</span>
                              </div>
                              <span className="font-medium">
                                {formatNumber(lote.quantidade_kg)} kg
                              </span>
                              <span className="text-muted-foreground">
                                @ {formatCurrency(lote.custo_por_kg)}/kg
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              disp: {formatNumber(lote.quantidade_disponivel_antes)} kg
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Indicador se usa múltiplos lotes */}
                      {reserva.lotes.length > 1 && (
                        <p className="text-xs text-amber-600 font-medium">
                          ⚠ Usará {reserva.lotes.length} lotes diferentes
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Se não tem reservas nem alertas - tudo ok */}
        {provisao.reservas.length === 0 && alertasEstoque.length === 0 && (
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-emerald-800">Pedido pronto para aprovação</p>
                <p className="text-sm text-emerald-600 mt-1">
                  Nenhum material precisa ser reservado.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirmar}
            disabled={loading}
            className={temEstoqueSuficiente ? '' : 'bg-amber-600 hover:bg-amber-700'}
          >
            {loading ? 'Processando...' : (
              temEstoqueSuficiente ? 'Aprovar Pedido' : 'Aprovar Mesmo Assim'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
