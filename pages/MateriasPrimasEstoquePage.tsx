import { useState, useMemo } from 'react';
import { useMateriasPrimas } from '../hooks/useMateriasPrimas';
import type { MateriaPrima } from '../lib/database.types';
import { formatNumber, formatCurrency, formatQuantity } from '../lib/format';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, AlertTriangle, Package } from 'lucide-react';
import { MateriasPrimasEstoqueFilter, applyFilters, type FilterState } from '@/components/materias-primas-estoque/MateriasPrimasEstoqueFilter';
import { MateriaPrimaEstoqueDetailModal } from '@/components/materias-primas-estoque/MateriaPrimaEstoqueDetailModal';

export default function MateriasPrimasEstoquePage() {
  const { materiasPrimas, loading, error, refresh } = useMateriasPrimas();

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    estoqueStatus: 'todos',
    tipo: 'todos',
  });

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMateriaPrima, setSelectedMateriaPrima] = useState<MateriaPrima | null>(null);

  const filteredMateriasPrimas = useMemo(() => {
    return applyFilters(materiasPrimas, filters);
  }, [materiasPrimas, filters]);

  const getEstoqueStatus = (materiaPrima: MateriaPrima) => {
    const estoqueAtual = Number(materiaPrima.estoque_atual) || 0;
    const estoqueMinimo = Number(materiaPrima.estoque_minimo) || 0;
    const estoquePontoReposicao = Number(materiaPrima.estoque_ponto_reposicao) || 0;

    if (estoqueAtual < estoquePontoReposicao) {
      return { label: 'Crítico', variant: 'destructive' as const };
    }
    if (estoqueAtual < estoqueMinimo) {
      return { label: 'Baixo', variant: 'warning' as const };
    }
    return { label: 'Normal', variant: 'success' as const };
  };

  // Handle row click - open detail modal
  const handleRowClick = (materiaPrima: MateriaPrima) => {
    setSelectedMateriaPrima(materiaPrima);
    setShowDetailModal(true);
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar estoque de matérias-primas</AlertTitle>
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
        title="Estoque de Matérias-Primas"
        description={materiasPrimas.length > 0 ? `${materiasPrimas.length} ${materiasPrimas.length === 1 ? 'matéria-prima cadastrada' : 'matérias-primas cadastradas'}` : undefined}
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </PageHeader>

      {/* Filters */}
      <MateriasPrimasEstoqueFilter
        filters={filters}
        onFiltersChange={setFilters}
        materiasPrimas={materiasPrimas}
      />

      {/* Table */}
      <Card>
        {filteredMateriasPrimas.length === 0 && materiasPrimas.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Package size={48} />}
              title="Nenhuma matéria-prima cadastrada"
              description="Cadastre matérias-primas para visualizar o estoque"
            />
          </div>
        ) : filteredMateriasPrimas.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Package size={48} />}
              title="Nenhuma matéria-prima encontrada"
              description="Nenhuma matéria-prima encontrada com os filtros selecionados"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Nome</TableHead>
                  <TableHead className="min-w-[120px]">Tipo</TableHead>
                  <TableHead className="text-right min-w-[120px]">Estoque Atual</TableHead>
                  <TableHead className="text-right min-w-[120px]">Estoque Mínimo</TableHead>
                  <TableHead className="text-right min-w-[120px]">Ponto Reposição</TableHead>
                  <TableHead className="text-right min-w-[120px]">Custo/Unid.</TableHead>
                  <TableHead className="text-right min-w-[140px]">Valor Total</TableHead>
                  <TableHead className="text-center min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMateriasPrimas.map((materiaPrima) => {
                  const estoqueStatus = getEstoqueStatus(materiaPrima);
                  const estoqueAtual = Number(materiaPrima.estoque_atual) || 0;
                  const estoqueMinimo = Number(materiaPrima.estoque_minimo) || 0;
                  const estoquePontoReposicao = Number(materiaPrima.estoque_ponto_reposicao) || 0;
                  const valorTotal = estoqueAtual * materiaPrima.custo_por_unidade;

                  return (
                    <TableRow
                      key={materiaPrima.id}
                      onClick={() => handleRowClick(materiaPrima)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{materiaPrima.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {materiaPrima.tipo.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatQuantity(estoqueAtual, materiaPrima.unidade_estoque)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatQuantity(estoqueMinimo, materiaPrima.unidade_estoque)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatQuantity(estoquePontoReposicao, materiaPrima.unidade_estoque)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(materiaPrima.custo_por_unidade)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(valorTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={estoqueStatus.variant}>{estoqueStatus.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <MateriaPrimaEstoqueDetailModal
        materiaPrima={selectedMateriaPrima}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMateriaPrima(null);
        }}
      />
    </div>
  );
}
