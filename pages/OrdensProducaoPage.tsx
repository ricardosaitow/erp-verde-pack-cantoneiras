import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useOrdensProducao } from '../hooks/useOrdensProducao';
import type { OrdemProducao, AlertaMudancaLote } from '../lib/database.types';
import { formatQuantity } from '../lib/format';
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
import { Plus, RefreshCw, AlertTriangle, Factory, Play } from 'lucide-react';
import { OrdensProducaoFilter, applyFilters, type FilterState } from '@/components/ordens-producao/OrdensProducaoFilter';
import { OrdemProducaoDetailModal } from '@/components/ordens-producao/OrdemProducaoDetailModal';
import { TrocaLoteModal } from '@/components/estoque/TrocaLoteModal';
import { isTransitionAllowed, type OrdemProducaoStatus } from '@/lib/ordem-producao-workflow';

export default function OrdensProducaoPage() {
  const { ordens, loading, error, create, update, delete: deleteOrdem, refresh } = useOrdensProducao();

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'todos',
  });

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemProducao | null>(null);

  // Status updating state
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Troca de lote modal state
  const [showTrocaLoteModal, setShowTrocaLoteModal] = useState(false);
  const [alertasTrocaLote, setAlertasTrocaLote] = useState<AlertaMudancaLote[]>([]);

  const filteredOrdens = useMemo(() => {
    return applyFilters(ordens, filters);
  }, [ordens, filters]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Handle row click - open detail modal
  const handleRowClick = (ordem: OrdemProducao) => {
    setSelectedOrdem(ordem);
    setShowDetailModal(true);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    confirmAction({
      title: 'Excluir ordem de produção',
      description: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Confirmar Exclusão',
      onConfirm: async () => {
        const { error: err } = await deleteOrdem(id);
        if (err) {
          toast.error('Erro ao excluir ordem: ' + err);
        } else {
          toast.success('Ordem excluída com sucesso!');
          setShowDetailModal(false);
          setSelectedOrdem(null);
        }
      }
    });
  };

  // Handle iniciar producao
  const handleIniciarProducao = (ordem: OrdemProducao, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    confirmAction({
      title: `Iniciar produção da ordem ${ordem.numero_op}`,
      description: 'Isso irá dar baixa no estoque de matérias-primas. Esta ação não pode ser desfeita.',
      confirmLabel: 'Iniciar Produção',
      onConfirm: async () => {
        setUpdatingStatus(ordem.id);

        const { error: updateError, alertas } = await update(ordem.id, { status: 'em_producao' });

        setUpdatingStatus(null);

        if (updateError) {
          toast.error(`Erro ao iniciar produção: ${updateError}`);
        } else {
          toast.success(`Produção iniciada! Baixa de estoque realizada para ordem ${ordem.numero_op}`);
          await refresh();

          // Se há alertas de troca de lote (custo diferente), mostrar modal
          if (alertas && alertas.length > 0) {
            setAlertasTrocaLote(alertas);
            setShowTrocaLoteModal(true);
          }
        }
      }
    });
  };

  // Handle update status from detail modal
  const handleUpdateStatus = async (ordem: OrdemProducao, newStatus: string) => {
    // Validar transição usando a máquina de estados
    const validation = isTransitionAllowed(
      ordem.status as OrdemProducaoStatus,
      newStatus as OrdemProducaoStatus
    );

    if (!validation.allowed) {
      toast.error(validation.reason || 'Transição de status não permitida');
      return;
    }

    const { error: updateError } = await update(ordem.id, { status: newStatus as OrdemProducao['status'] });

    if (updateError) {
      toast.error(`Erro ao atualizar status: ${updateError}`);
    } else {
      let message = `Status atualizado`;
      if (newStatus === 'em_producao' && ordem.status === 'aguardando') {
        message = `Status atualizado! Baixa de estoque realizada para ordem ${ordem.numero_op}`;
      }
      toast.success(message);
      setSelectedOrdem({ ...ordem, status: newStatus as OrdemProducao['status'] });
      refresh();
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar ordens de produção</AlertTitle>
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
        title="Ordens de Produção"
        description={ordens.length > 0 ? `${ordens.length} ${ordens.length === 1 ? 'ordem cadastrada' : 'ordens cadastradas'}` : undefined}
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button onClick={() => toast.info('Funcionalidade de criação de ordens em desenvolvimento')} disabled>
          <Plus className="h-4 w-4 mr-2" />
          Nova Ordem
        </Button>
      </PageHeader>

      {/* Filters */}
      <OrdensProducaoFilter
        filters={filters}
        onFiltersChange={setFilters}
        ordens={ordens}
      />

      {/* Table */}
      <Card>
        {filteredOrdens.length === 0 && ordens.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Factory size={48} />}
              title="Nenhuma ordem de produção cadastrada"
              description="As ordens de produção serão criadas automaticamente a partir dos pedidos"
            />
          </div>
        ) : filteredOrdens.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Factory size={48} />}
              title="Nenhuma ordem encontrada"
              description="Nenhuma ordem encontrada com os filtros selecionados"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Nº OP</TableHead>
                  <TableHead className="min-w-[200px]">Produto</TableHead>
                  <TableHead className="min-w-[100px]">Quantidade</TableHead>
                  <TableHead className="min-w-[120px]">Comprimento</TableHead>
                  <TableHead className="min-w-[130px]">Data Programada</TableHead>
                  <TableHead className="min-w-[150px]">Responsável</TableHead>
                  <TableHead className="text-center min-w-[100px]">Status</TableHead>
                  <TableHead className="text-center min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdens.map((ordem) => {
                  const produtoNome = (ordem as any).produto?.nome || 'Produto não identificado';
                  return (
                    <TableRow
                      key={ordem.id}
                      onClick={() => handleRowClick(ordem)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{ordem.numero_op}</TableCell>
                      <TableCell>{produtoNome}</TableCell>
                      <TableCell>
                        {ordem.quantidade_pecas ? ordem.quantidade_pecas.toLocaleString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>
                        {ordem.comprimento_cada_mm ? `${ordem.comprimento_cada_mm.toLocaleString('pt-BR')} mm` : '-'}
                      </TableCell>
                      <TableCell>{formatDate(ordem.data_programada)}</TableCell>
                      <TableCell className="text-muted-foreground">{ordem.responsavel_producao || '-'}</TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={ordem.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        {ordem.status === 'aguardando' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => handleIniciarProducao(ordem, e)}
                            disabled={updatingStatus === ordem.id}
                            title="Iniciar produção e dar baixa no estoque"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {updatingStatus === ordem.id ? (
                              'Iniciando...'
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Iniciar
                              </>
                            )}
                          </Button>
                        )}
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
      <OrdemProducaoDetailModal
        ordem={selectedOrdem}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOrdem(null);
        }}
        onDelete={handleDelete}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Modal de Troca de Lote - quando lote esgota e próximo tem custo diferente */}
      <TrocaLoteModal
        open={showTrocaLoteModal}
        onClose={() => {
          setShowTrocaLoteModal(false);
          setAlertasTrocaLote([]);
        }}
        alertas={alertasTrocaLote}
        onComplete={() => {
          refresh();
        }}
      />
    </div>
  );
}
