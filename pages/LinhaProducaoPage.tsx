import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useOrdensProducao } from '../hooks/useOrdensProducao';
import { usePedidos } from '../hooks/usePedidos';
import type { OrdemProducaoCompleta } from '../lib/database.types';
import { formatQuantity } from '../lib/format';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertTriangle, Factory, Play, CheckCircle2, FileText } from 'lucide-react';
import { isTransitionAllowed, type OrdemProducaoStatus } from '@/lib/ordem-producao-workflow';
import { gerarPDFPedido } from '../lib/pdf-generator';
import { OrdemProducaoDetailModal } from '@/components/ordens-producao/OrdemProducaoDetailModal';

export default function LinhaProducaoPage() {
  const { ordens, loading, error, update, refresh, delete: deleteOrdem } = useOrdensProducao();
  const { pedidos, update: updatePedido } = usePedidos();
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemProducaoCompleta | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filtrar apenas ordens relevantes para produção (aguardando e em_producao)
  const ordensProducao = useMemo(() => {
    return ordens.filter(ordem =>
      ordem.status === 'aguardando' || ordem.status === 'em_producao'
    );
  }, [ordens]);

  // Separar por status
  const ordensAguardando = useMemo(() => {
    return ordensProducao.filter(ordem => ordem.status === 'aguardando');
  }, [ordensProducao]);

  const ordensEmProducao = useMemo(() => {
    return ordensProducao.filter(ordem => ordem.status === 'em_producao');
  }, [ordensProducao]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Abrir modal de detalhes
  const handleOpenDetail = (ordem: OrdemProducaoCompleta) => {
    setSelectedOrdem(ordem);
    setShowDetailModal(true);
  };

  // Deletar ordem
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
          refresh();
        }
      }
    });
  };

  // Atualizar status da ordem
  const handleUpdateStatus = async (ordem: OrdemProducaoCompleta, newStatus: string) => {
    const validation = isTransitionAllowed(
      ordem.status as OrdemProducaoStatus,
      newStatus as OrdemProducaoStatus
    );

    if (!validation.allowed) {
      toast.error(validation.reason || 'Transição de status não permitida');
      return;
    }

    const { error: err } = await update(ordem.id, { status: newStatus as OrdemProducaoStatus });

    if (err) {
      toast.error('Erro ao atualizar status: ' + err);
    } else {
      toast.success('Status atualizado com sucesso!');
      setSelectedOrdem({ ...ordem, status: newStatus as any });
      refresh();
    }
  };

  // Iniciar produção
  const handleIniciarProducao = async (ordem: OrdemProducaoCompleta) => {
    const validation = isTransitionAllowed(
      ordem.status as OrdemProducaoStatus,
      'em_producao' as OrdemProducaoStatus
    );

    if (!validation.allowed) {
      toast.error(validation.reason || 'Não é possível iniciar esta ordem');
      return;
    }

    const { error: updateError } = await update(ordem.id, { status: 'em_producao' });

    if (updateError) {
      toast.error(`Erro ao iniciar produção: ${updateError}`);
    } else {
      toast.success(`Produção iniciada! Baixa de estoque realizada para ordem ${ordem.numero_op}`);
      refresh();
    }
  };

  // Concluir produção
  const handleConcluirProducao = async (ordem: OrdemProducaoCompleta) => {
    const validation = isTransitionAllowed(
      ordem.status as OrdemProducaoStatus,
      'concluido' as OrdemProducaoStatus
    );

    if (!validation.allowed) {
      toast.error(validation.reason || 'Não é possível concluir esta ordem');
      return;
    }

    // Concluir a OP
    const { error: updateError } = await update(ordem.id, { status: 'concluido' });

    if (updateError) {
      toast.error(`Erro ao concluir produção: ${updateError}`);
      return;
    }

    // Atualizar status do pedido para "aguardando_despacho"
    if (ordem.pedido_id) {
      const { error: pedidoError } = await updatePedido(ordem.pedido_id, {
        status: 'aguardando_despacho'
      });

      if (pedidoError) {
        console.error('Erro ao atualizar pedido:', pedidoError);
        toast.warning('OP concluída mas erro ao atualizar status do pedido');
      }
    }

    // Buscar pedido completo para gerar PDF
    const pedido = pedidos.find(p => p.id === ordem.pedido_id);

    if (pedido) {
      try {
        await gerarPDFPedido(pedido);
        toast.success(`Produção concluída! PDF gerado para ${ordem.numero_op}`);
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        toast.warning('Produção concluída mas erro ao gerar PDF');
      }
    } else {
      toast.success(`Produção concluída! Ordem ${ordem.numero_op}`);
    }

    refresh();
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
        title="Linha de Produção"
        description={`${ordensProducao.length} ${ordensProducao.length === 1 ? 'ordem ativa' : 'ordens ativas'}`}
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </PageHeader>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Factory className="h-4 w-4 text-amber-600" />
              Aguardando Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{ordensAguardando.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Play className="h-4 w-4 text-blue-600" />
              Em Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{ordensEmProducao.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ordens Aguardando */}
      {ordensAguardando.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Factory className="h-5 w-5 text-amber-600" />
            Aguardando Produção
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {ordensAguardando.map((ordem) => {
              const produto = ordem.produto as any;
              return (
                <Card
                  key={ordem.id}
                  className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleOpenDetail(ordem)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-lg font-semibold">
                            {ordem.numero_op}
                          </Badge>
                          <StatusBadge status={ordem.status} />
                        </div>

                        <div className="space-y-1">
                          <p className="font-semibold text-lg">{produto?.nome || 'Produto não identificado'}</p>
                          {ordem.pedido && (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Pedido: {(ordem.pedido as any).numero_pedido}
                              </p>
                              {(ordem.pedido as any).cliente && (
                                <p className="text-sm font-medium text-blue-700">
                                  Cliente: {(ordem.pedido as any).cliente.nome_fantasia || (ordem.pedido as any).cliente.razao_social}
                                </p>
                              )}
                              {(ordem.pedido as any).data_entrega && (
                                <p className="text-sm text-muted-foreground">
                                  Entrega: {formatDate((ordem.pedido as any).data_entrega)}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {ordem.quantidade_pecas && ordem.comprimento_cada_mm ? (
                            <>
                              <div>
                                <p className="text-muted-foreground">Quantidade</p>
                                <p className="font-medium">{ordem.quantidade_pecas.toLocaleString('pt-BR')} peças</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Comprimento</p>
                                <p className="font-medium">{ordem.comprimento_cada_mm.toLocaleString('pt-BR')} mm</p>
                              </div>
                            </>
                          ) : (
                            <div>
                              <p className="text-muted-foreground">Quantidade</p>
                              <p className="font-medium">{formatQuantity(ordem.quantidade_produzir_metros, 'm')}</p>
                            </div>
                          )}
                          {ordem.data_programada && (
                            <div>
                              <p className="text-muted-foreground">Data Programada</p>
                              <p className="font-medium">{formatDate(ordem.data_programada)}</p>
                            </div>
                          )}
                        </div>

                        {ordem.instrucoes_tecnicas && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Instruções Técnicas:</p>
                            <p className="text-sm text-blue-800">{ordem.instrucoes_tecnicas}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIniciarProducao(ordem);
                          }}
                          className="w-full md:w-auto"
                          size="lg"
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Iniciar Produção
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Ordens Em Produção */}
      {ordensEmProducao.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600" />
            Em Produção
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {ordensEmProducao.map((ordem) => {
              const produto = ordem.produto as any;
              return (
                <Card
                  key={ordem.id}
                  className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleOpenDetail(ordem)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-lg font-semibold">
                            {ordem.numero_op}
                          </Badge>
                          <StatusBadge status={ordem.status} />
                        </div>

                        <div className="space-y-1">
                          <p className="font-semibold text-lg">{produto?.nome || 'Produto não identificado'}</p>
                          {ordem.pedido && (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Pedido: {(ordem.pedido as any).numero_pedido}
                              </p>
                              {(ordem.pedido as any).cliente && (
                                <p className="text-sm font-medium text-blue-700">
                                  Cliente: {(ordem.pedido as any).cliente.nome_fantasia || (ordem.pedido as any).cliente.razao_social}
                                </p>
                              )}
                              {(ordem.pedido as any).data_entrega && (
                                <p className="text-sm text-muted-foreground">
                                  Entrega: {formatDate((ordem.pedido as any).data_entrega)}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {ordem.quantidade_pecas && ordem.comprimento_cada_mm ? (
                            <>
                              <div>
                                <p className="text-muted-foreground">Quantidade</p>
                                <p className="font-medium">{ordem.quantidade_pecas.toLocaleString('pt-BR')} peças</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Comprimento</p>
                                <p className="font-medium">{ordem.comprimento_cada_mm.toLocaleString('pt-BR')} mm</p>
                              </div>
                            </>
                          ) : (
                            <div>
                              <p className="text-muted-foreground">Quantidade</p>
                              <p className="font-medium">{formatQuantity(ordem.quantidade_produzir_metros, 'm')}</p>
                            </div>
                          )}
                          {ordem.data_programada && (
                            <div>
                              <p className="text-muted-foreground">Data Programada</p>
                              <p className="font-medium">{formatDate(ordem.data_programada)}</p>
                            </div>
                          )}
                          {ordem.data_inicio_producao && (
                            <div>
                              <p className="text-muted-foreground">Iniciada em</p>
                              <p className="font-medium">{formatDate(ordem.data_inicio_producao)}</p>
                            </div>
                          )}
                        </div>

                        {ordem.instrucoes_tecnicas && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Instruções Técnicas:</p>
                            <p className="text-sm text-blue-800">{ordem.instrucoes_tecnicas}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConcluirProducao(ordem);
                          }}
                          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700"
                          size="lg"
                        >
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Concluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {ordensProducao.length === 0 && (
        <Card className="p-12">
          <EmptyState
            icon={<Factory size={48} />}
            title="Nenhuma ordem de produção ativa"
            description="Não há ordens aguardando ou em produção no momento"
          />
        </Card>
      )}

      {/* Modal de Detalhes */}
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
    </div>
  );
}
