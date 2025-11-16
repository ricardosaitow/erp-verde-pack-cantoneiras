import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { MateriaPrima } from '@/lib/database.types';
import { formatCurrency, formatNumber } from '@/lib/format';
import { formatBrazilianDateTimeLong } from '@/lib/date-utils';

interface MateriaPrimaDetailModalProps {
  materiaPrima: MateriaPrima | null;
  open: boolean;
  onClose: () => void;
  onEdit: (materiaPrima: MateriaPrima) => void;
  onDelete: (id: string) => void;
}

export function MateriaPrimaDetailModal({
  materiaPrima,
  open,
  onClose,
  onEdit,
  onDelete,
}: MateriaPrimaDetailModalProps) {
  if (!materiaPrima) return null;

  const handleEdit = () => {
    onEdit(materiaPrima);
    onClose();
  };

  const handleDelete = () => {
    onDelete(materiaPrima.id);
  };

  const getEstoqueStatus = () => {
    const estoqueAtual = Number(materiaPrima.estoque_atual) || 0;
    const estoqueMinimo = Number(materiaPrima.estoque_minimo) || 0;
    const estoquePontoReposicao = Number(materiaPrima.estoque_ponto_reposicao) || 0;

    if (estoqueAtual < estoquePontoReposicao) {
      return { nivel: 'critico', label: 'Crítico', variant: 'destructive' as const };
    }
    if (estoqueAtual < estoqueMinimo) {
      return { nivel: 'baixo', label: 'Baixo', variant: 'warning' as const };
    }
    return { nivel: 'normal', label: 'Normal', variant: 'success' as const };
  };

  const estoqueStatus = getEstoqueStatus();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">
                {materiaPrima.nome}
              </DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant={materiaPrima.ativo ? 'success' : 'secondary'}>
                  {materiaPrima.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {materiaPrima.tipo.replace('_', ' ')}
                </Badge>
                <Badge variant={estoqueStatus.variant}>
                  Estoque: {estoqueStatus.label}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium capitalize">{materiaPrima.tipo.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unidade de Estoque</p>
                    <p className="font-medium">{materiaPrima.unidade_estoque}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo por Unidade</p>
                    <p className="font-medium text-lg text-purple-600">
                      {formatCurrency(Number(materiaPrima.custo_por_unidade) || 0)}
                    </p>
                  </div>
                  {materiaPrima.local_armazenamento && (
                    <div>
                      <p className="text-sm text-muted-foreground">Local de Armazenamento</p>
                      <p className="font-medium">{materiaPrima.local_armazenamento}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Especificações Técnicas */}
            {(materiaPrima.gramatura || materiaPrima.largura_mm || materiaPrima.peso_por_metro_g) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Especificações Técnicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {materiaPrima.gramatura && (
                      <div>
                        <p className="text-sm text-muted-foreground">Gramatura</p>
                        <p className="font-medium">{materiaPrima.gramatura} g/m²</p>
                      </div>
                    )}
                    {materiaPrima.largura_mm && (
                      <div>
                        <p className="text-sm text-muted-foreground">Largura</p>
                        <p className="font-medium">{materiaPrima.largura_mm} mm</p>
                      </div>
                    )}
                    {materiaPrima.peso_por_metro_g && (
                      <div>
                        <p className="text-sm text-muted-foreground">Peso por Metro</p>
                        <p className="font-medium">{formatNumber(materiaPrima.peso_por_metro_g, 1)} g/m</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Controle de Estoque */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Controle de Estoque</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Atual</p>
                    <p className="font-medium text-lg">
                      {materiaPrima.estoque_atual} {materiaPrima.unidade_estoque}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Mínimo</p>
                    <p className="font-medium">
                      {materiaPrima.estoque_minimo} {materiaPrima.unidade_estoque}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ponto de Reposição</p>
                    <p className="font-medium">
                      {materiaPrima.estoque_ponto_reposicao} {materiaPrima.unidade_estoque}
                    </p>
                  </div>
                </div>
                {estoqueStatus.nivel !== 'normal' && (
                  <>
                    <Separator className="my-3" />
                    <div className={`p-3 rounded-lg ${
                      estoqueStatus.nivel === 'critico'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <p className={`text-sm font-medium ${
                        estoqueStatus.nivel === 'critico' ? 'text-red-900' : 'text-yellow-900'
                      }`}>
                        ⚠️ {estoqueStatus.nivel === 'critico'
                          ? 'Estoque crítico! Necessário reposição urgente.'
                          : 'Estoque baixo. Considere fazer reposição.'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="text-sm">{formatBrazilianDateTimeLong(materiaPrima.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última atualização</p>
                    <p className="text-sm">{formatBrazilianDateTimeLong(materiaPrima.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex flex-row justify-between items-center gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-initial"
          >
            Fechar
          </Button>
          <div className="flex gap-2 flex-1 sm:flex-initial">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1 sm:flex-initial"
            >
              Excluir
            </Button>
            <Button
              onClick={handleEdit}
              className="flex-1 sm:flex-initial"
            >
              Editar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
