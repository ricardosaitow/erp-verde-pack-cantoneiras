import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Factory, Save, X, Package, Calendar, User, FileText, List, AlertTriangle } from 'lucide-react';
import type { OrdemProducao } from '@/lib/database.types';
import { formatNumber, formatQuantity } from '@/lib/format';
import { StatusBadge } from '@/components/erp';
import { toast } from 'sonner';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { getAllowedTransitions, isFinalStatus, type OrdemProducaoStatus } from '@/lib/ordem-producao-workflow';

interface OrdemProducaoDetailModalProps {
  ordem: OrdemProducao | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (ordem: OrdemProducao, newStatus: string) => Promise<void>;
}

export function OrdemProducaoDetailModal({
  ordem,
  open,
  onClose,
  onDelete,
  onUpdateStatus
}: OrdemProducaoDetailModalProps) {
  const isAdmin = useIsAdmin();
  const [editingStatus, setEditingStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  React.useEffect(() => {
    if (ordem) {
      setEditingStatus(ordem.status);
    }
  }, [ordem]);

  if (!ordem) return null;

  // Obter transições permitidas para o status atual
  const allowedTransitions = getAllowedTransitions(ordem.status as OrdemProducaoStatus);

  // Incluir o status atual na lista (para manter selecionado)
  const availableStatuses = [ordem.status, ...allowedTransitions];

  // Verificar se é um estado final
  const isStatusFinal = isFinalStatus(ordem.status as OrdemProducaoStatus);

  // Mapeamento de labels dos status
  const statusLabels: Record<string, string> = {
    'aguardando': 'Aguardando',
    'em_producao': 'Em Produção',
    'concluido': 'Concluído',
    'cancelado': 'Cancelado',
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  const handleDelete = () => {
    onDelete(ordem.id);
  };

  const handleSaveStatus = async () => {
    if (editingStatus === ordem.status) return;

    setUpdating(true);
    await onUpdateStatus(ordem, editingStatus);
    setUpdating(false);
  };

  const produtoNome = (ordem as any).produto?.nome || 'Produto não identificado';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Factory className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Ordem {ordem.numero_op}</DialogTitle>
              <DialogDescription>
                {produtoNome}
              </DialogDescription>
            </div>
            <div className="flex-shrink-0 mr-8">
              <StatusBadge status={ordem.status} />
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Informações da Ordem */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Informações da Ordem</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Produto</p>
                  <p className="font-medium text-sm">{produtoNome}</p>
                </div>
              </div>

              {ordem.quantidade_pecas && ordem.comprimento_cada_mm ? (
                <>
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Quantidade</p>
                      <p className="font-medium text-sm">{ordem.quantidade_pecas.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Comprimento</p>
                      <p className="font-medium text-sm">{ordem.comprimento_cada_mm.toLocaleString('pt-BR')} mm</p>
                    </div>
                  </div>
                </>
              ) : ordem.quantidade_simples ? (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Quantidade</p>
                    <p className="font-medium text-sm">{ordem.quantidade_simples.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          {/* Status e Controle */}
          {!isStatusFinal && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Alterar Status</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Status da Ordem
                </Label>
                <Select
                  value={editingStatus}
                  onValueChange={setEditingStatus}
                  disabled={updating || isStatusFinal}
                >
                  <SelectTrigger id="status" className="h-10">
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
                {editingStatus === 'em_producao' && ordem.status === 'aguardando' && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="ml-6 text-xs text-amber-800">
                      Ao salvar, será dado baixa no estoque de matérias-primas
                    </AlertDescription>
                  </Alert>
                )}
                {allowedTransitions.length === 0 && !isStatusFinal && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma transição disponível a partir deste status
                  </p>
                )}
              </div>
            </div>
          )}
          {isStatusFinal && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">
                ✓ Ordem {statusLabels[ordem.status]}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Esta ordem está em um estado final ({statusLabels[ordem.status]}) e não pode ter o status alterado
              </p>
            </div>
          )}

          <Separator />

          {/* Datas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Datas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Data Programada</p>
                  <p className="font-medium text-sm">{formatDate(ordem.data_programada)}</p>
                </div>
              </div>

              {ordem.data_inicio_producao && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Data de Início</p>
                    <p className="font-medium text-sm">{formatDateTime(ordem.data_inicio_producao)}</p>
                  </div>
                </div>
              )}

              {ordem.data_conclusao && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Data de Conclusão</p>
                    <p className="font-medium text-sm">{formatDateTime(ordem.data_conclusao)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {ordem.responsavel_producao && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Responsável</span>
                </div>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{ordem.responsavel_producao}</p>
              </div>
            </>
          )}

          {(ordem.instrucoes_tecnicas || ordem.observacoes) && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Observações</span>
                </div>
                {ordem.instrucoes_tecnicas && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Instruções Técnicas</Label>
                    <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{ordem.instrucoes_tecnicas}</p>
                  </div>
                )}
                {ordem.observacoes && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Observações Gerais</Label>
                    <p className="text-sm bg-muted/50 p-3 rounded-md">{ordem.observacoes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {(ordem as any).produto && (ordem as any).produto.tipo === 'fabricado' && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <List className="h-4 w-4" />
                  <span>Matérias-Primas Necessárias</span>
                </div>
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <p className="text-sm text-blue-900 font-medium mb-3">
                    {formatNumber(Number(ordem.quantidade_produzir_metros))}m de {produtoNome}
                  </p>
                  {(ordem as any).produto?.receitas && (ordem as any).produto.receitas.length > 0 ? (
                    <ul className="space-y-2">
                      {(ordem as any).produto.receitas.map((receita: any, idx: number) => {
                        const materia = receita.materia_prima;
                        if (!materia) return null;
                        const consumoKg = (Number(ordem.quantidade_produzir_metros) * Number(receita.consumo_por_metro_g)) / 1000;
                        return (
                          <li key={idx} className="text-sm flex justify-between items-center bg-white p-2 rounded border border-blue-100">
                            <span className="font-medium text-blue-900">{materia.nome}</span>
                            <span className="text-blue-700 font-semibold">{formatQuantity(consumoKg, materia.unidade_estoque, 3)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-blue-600">Nenhuma receita cadastrada</p>
                  )}
                </Card>
              </div>
            </>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          {isAdmin && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
          {editingStatus !== ordem.status && (
            <Button onClick={handleSaveStatus} disabled={updating}>
              <Save className="h-4 w-4 mr-2" />
              {updating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
