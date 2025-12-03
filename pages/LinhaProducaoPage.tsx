import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useOrdensProducao } from '../hooks/useOrdensProducao';
import { usePedidos } from '../hooks/usePedidos';
import type { OrdemProducaoCompleta, OrdemProducaoItemCompleta } from '../lib/database.types';
import { formatQuantity } from '../lib/format';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, AlertTriangle, Factory, Play, CheckCircle2, FileText, Package, Circle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { isTransitionAllowed, type OrdemProducaoStatus } from '@/lib/ordem-producao-workflow';
import { criarPalletsPedido, gerarPDFPallets } from '../lib/pdf-pallet';
import { gerarPDFLaudoQualidade } from '../lib/pdf-laudo-qualidade';
import { OrdemProducaoDetailModal } from '@/components/ordens-producao/OrdemProducaoDetailModal';
import { supabase } from '../lib/supabase';

export default function LinhaProducaoPage() {
  const {
    ordens,
    loading,
    error,
    update,
    refresh,
    delete: deleteOrdem,
    iniciarItemProducao,
    finalizarItemProducao,
  } = useOrdensProducao();
  const { pedidos, update: updatePedido } = usePedidos();
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemProducaoCompleta | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Estado para modal de seleção de item
  const [showItemSelectModal, setShowItemSelectModal] = useState(false);
  const [ordemParaIniciar, setOrdemParaIniciar] = useState<OrdemProducaoCompleta | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  // Filtrar apenas ordens relevantes para produção (aguardando, em_producao e parcial)
  const ordensProducao = useMemo(() => {
    return ordens.filter(ordem =>
      ordem.status === 'aguardando' || ordem.status === 'em_producao' || ordem.status === 'parcial'
    );
  }, [ordens]);

  // Separar por status
  const ordensAguardando = useMemo(() => {
    return ordensProducao.filter(ordem => ordem.status === 'aguardando');
  }, [ordensProducao]);

  const ordensEmProducao = useMemo(() => {
    return ordensProducao.filter(ordem =>
      ordem.status === 'em_producao' || ordem.status === 'parcial'
    );
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

  // Verificar se ordem tem múltiplos itens aguardando
  const getItensAguardando = (ordem: OrdemProducaoCompleta) => {
    const itens = (ordem.itens || []) as OrdemProducaoItemCompleta[];
    return itens.filter(item => item.status === 'aguardando');
  };

  // Iniciar produção - verifica se precisa abrir modal de seleção
  const handleIniciarProducao = async (ordem: OrdemProducaoCompleta) => {
    const itensAguardando = getItensAguardando(ordem);

    // Se não tem itens na tabela de itens (retrocompatibilidade) ou só tem 1 item,
    // usa o fluxo antigo
    if (itensAguardando.length === 0) {
      // Fluxo antigo para OPs sem itens (retrocompatibilidade)
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
      return;
    }

    // Se tem apenas 1 item aguardando, inicia direto
    if (itensAguardando.length === 1) {
      await handleIniciarItem(ordem, itensAguardando[0]);
      return;
    }

    // Se tem múltiplos itens aguardando, abre modal para seleção
    setOrdemParaIniciar(ordem);
    setShowItemSelectModal(true);
  };

  // Iniciar um item específico da OP
  const handleIniciarItem = async (ordem: OrdemProducaoCompleta, item: OrdemProducaoItemCompleta) => {
    setLoadingItemId(item.id);

    const { error: err, alertas } = await iniciarItemProducao(ordem.id, item.id);

    setLoadingItemId(null);

    if (err) {
      toast.error(`Erro ao iniciar produção: ${err}`);
      return;
    }

    // Mostrar alertas de mudança de custo se houver
    if (alertas && alertas.length > 0) {
      alertas.forEach(alerta => {
        toast.warning(
          `Mudança de custo: ${alerta.materia_prima_nome} (${alerta.diferenca_percentual.toFixed(1)}%)`,
          { duration: 8000 }
        );
      });
    }

    const produto = item.produto as any;
    toast.success(`Produção do item "${produto?.nome || 'Produto'}" iniciada!`);

    // Fechar modal se estiver aberto
    setShowItemSelectModal(false);
    setOrdemParaIniciar(null);

    refresh();
  };

  // Obter itens em produção
  const getItensEmProducao = (ordem: OrdemProducaoCompleta) => {
    const itens = (ordem.itens || []) as OrdemProducaoItemCompleta[];
    return itens.filter(item => item.status === 'em_producao');
  };

  // Finalizar um item específico da OP
  const handleFinalizarItem = async (ordem: OrdemProducaoCompleta, item: OrdemProducaoItemCompleta) => {
    setLoadingItemId(item.id);

    const { error: err } = await finalizarItemProducao(ordem.id, item.id);

    setLoadingItemId(null);

    if (err) {
      toast.error(`Erro ao finalizar item: ${err}`);
      return;
    }

    const produto = item.produto as any;
    toast.success(`Item "${produto?.nome || 'Produto'}" finalizado!`);

    // Verificar se todos os itens foram finalizados
    const itens = (ordem.itens || []) as OrdemProducaoItemCompleta[];
    const outrosItens = itens.filter(i => i.id !== item.id);
    const todosFinalizados = outrosItens.every(i => i.status === 'finalizado' || i.status === 'cancelado');

    if (todosFinalizados) {
      // Todos os itens finalizados - gerar documentos
      await gerarDocumentosFinalizacao(ordem);
    }

    refresh();
  };

  // Gerar documentos ao finalizar toda a OP
  const gerarDocumentosFinalizacao = async (ordem: OrdemProducaoCompleta) => {
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

    // Buscar pedido completo para gerar PDF de pallets
    const pedido = pedidos.find(p => p.id === ordem.pedido_id);

    if (pedido) {
      try {
        // Quantidade de pallets baseada no campo quantidade_volumes ou padrão 1
        const quantidadePallets = (pedido as any).quantidade_volumes || 1;

        // Criar pallets no banco de dados
        const resultadoPallets = await criarPalletsPedido(supabase, pedido.id, quantidadePallets);

        if (!resultadoPallets.success || !resultadoPallets.pallets) {
          console.error('Erro ao criar pallets:', resultadoPallets.error);
          toast.warning('Produção concluída mas erro ao criar pallets');
          return;
        }

        // Gerar PDF com etiquetas de cada pallet
        const resultadoPDF = await gerarPDFPallets({
          pedido,
          pallets: resultadoPallets.pallets
        });

        if (resultadoPDF.success) {
          toast.success(`${quantidadePallets} etiqueta(s) de pallet gerada(s)`);
        } else {
          console.error('Erro ao gerar PDF de pallets:', resultadoPDF.error);
          toast.warning('Erro ao gerar PDF de pallets');
        }

        // Gerar Laudo de Qualidade
        const resultadoLaudo = await gerarPDFLaudoQualidade(pedido);

        if (resultadoLaudo.success) {
          toast.success(`Laudo de Qualidade gerado para ${ordem.numero_op}`);
        } else {
          console.error('Erro ao gerar Laudo:', resultadoLaudo.error);
          toast.warning('Erro ao gerar Laudo de Qualidade');
        }

        toast.success(`Produção completa! Ordem ${ordem.numero_op}`);
      } catch (error) {
        console.error('Erro ao gerar PDFs:', error);
        toast.warning('Produção concluída mas erro ao gerar documentos');
      }
    }
  };

  // Concluir produção (fluxo antigo ou quando não tem itens)
  const handleConcluirProducao = async (ordem: OrdemProducaoCompleta) => {
    const itensEmProducao = getItensEmProducao(ordem);

    // Se tem itens em produção, finalizar apenas eles
    if (itensEmProducao.length > 0) {
      // Se tem apenas 1 item em produção, finaliza direto
      if (itensEmProducao.length === 1) {
        await handleFinalizarItem(ordem, itensEmProducao[0]);
        return;
      }

      // Se tem múltiplos, mostra erro (não deveria acontecer)
      toast.error('Finalize cada item individualmente');
      return;
    }

    // Fluxo antigo para OPs sem itens (retrocompatibilidade)
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

    await gerarDocumentosFinalizacao(ordem);
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
              const itens = (ordem.itens || []) as OrdemProducaoItemCompleta[];
              const temMultiplosItens = itens.length > 1;

              return (
                <Card
                  key={ordem.id}
                  className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleOpenDetail(ordem)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-lg font-semibold">
                            {ordem.numero_op}
                          </Badge>
                          <StatusBadge status={ordem.status} />
                          {temMultiplosItens && (
                            <Badge variant="secondary" className="text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              {itens.length} produtos
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          {!temMultiplosItens && (
                            <p className="font-semibold text-lg">{produto?.nome || 'Produto não identificado'}</p>
                          )}
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
                            </>
                          )}
                        </div>

                        {/* Lista de itens se tiver múltiplos */}
                        {temMultiplosItens && (
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Produtos a produzir:</p>
                            {itens.map((item) => {
                              const itemProduto = item.produto as any;
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between text-sm bg-white rounded px-3 py-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <Circle className="h-3 w-3 text-amber-500" />
                                    <span className="font-medium">{itemProduto?.nome || 'Produto'}</span>
                                  </div>
                                  <span className="text-muted-foreground">
                                    {formatQuantity(item.quantidade_metros, 'm')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Quantidade total */}
                        {!temMultiplosItens && (
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
                        )}

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
                          {temMultiplosItens ? 'Iniciar' : 'Iniciar Produção'}
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
              const itens = (ordem.itens || []) as OrdemProducaoItemCompleta[];
              const temMultiplosItens = itens.length > 1;
              const itensAguardando = itens.filter(i => i.status === 'aguardando');
              const itensEmProducao = itens.filter(i => i.status === 'em_producao');
              const itensFinalizados = itens.filter(i => i.status === 'finalizado');

              // Cor da borda baseada no status
              const borderColor = ordem.status === 'parcial' ? 'border-l-purple-500' : 'border-l-blue-500';

              return (
                <Card
                  key={ordem.id}
                  className={`border-l-4 ${borderColor} cursor-pointer hover:shadow-lg transition-shadow`}
                  onClick={() => handleOpenDetail(ordem)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="outline" className="text-lg font-semibold">
                            {ordem.numero_op}
                          </Badge>
                          <StatusBadge status={ordem.status} />
                          {temMultiplosItens && (
                            <Badge variant="secondary" className="text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              {itensFinalizados.length}/{itens.length} concluídos
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          {!temMultiplosItens && (
                            <p className="font-semibold text-lg">{produto?.nome || 'Produto não identificado'}</p>
                          )}
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
                            </>
                          )}
                        </div>

                        {/* Lista de itens com status */}
                        {temMultiplosItens && (
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Status dos produtos:</p>
                            {itens.map((item) => {
                              const itemProduto = item.produto as any;
                              const isLoading = loadingItemId === item.id;

                              // Ícone e cor baseados no status
                              let StatusIcon = Circle;
                              let statusColor = 'text-gray-400';
                              let bgColor = 'bg-white';

                              if (item.status === 'em_producao') {
                                StatusIcon = Loader2;
                                statusColor = 'text-blue-600';
                                bgColor = 'bg-blue-50';
                              } else if (item.status === 'finalizado') {
                                StatusIcon = CheckCircle;
                                statusColor = 'text-emerald-600';
                                bgColor = 'bg-emerald-50';
                              } else if (item.status === 'aguardando') {
                                StatusIcon = Clock;
                                statusColor = 'text-amber-500';
                              }

                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between text-sm ${bgColor} rounded px-3 py-2`}
                                >
                                  <div className="flex items-center gap-2">
                                    <StatusIcon className={`h-4 w-4 ${statusColor} ${item.status === 'em_producao' ? 'animate-spin' : ''}`} />
                                    <span className="font-medium">{itemProduto?.nome || 'Produto'}</span>
                                    <span className="text-muted-foreground">
                                      ({formatQuantity(item.quantidade_metros, 'm')})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {item.status === 'aguardando' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isLoading}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleIniciarItem(ordem, item);
                                        }}
                                      >
                                        {isLoading ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <Play className="h-3 w-3 mr-1" />
                                            Iniciar
                                          </>
                                        )}
                                      </Button>
                                    )}
                                    {item.status === 'em_producao' && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        disabled={isLoading}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleFinalizarItem(ordem, item);
                                        }}
                                      >
                                        {isLoading ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Finalizar
                                          </>
                                        )}
                                      </Button>
                                    )}
                                    {item.status === 'finalizado' && (
                                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                                        Concluído
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Quantidade total para OPs sem múltiplos itens */}
                        {!temMultiplosItens && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Quantidade</p>
                              <p className="font-medium">{formatQuantity(ordem.quantidade_produzir_metros, 'm')}</p>
                            </div>
                            {ordem.data_inicio_producao && (
                              <div>
                                <p className="text-muted-foreground">Iniciada em</p>
                                <p className="font-medium">{formatDate(ordem.data_inicio_producao)}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {ordem.instrucoes_tecnicas && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Instruções Técnicas:</p>
                            <p className="text-sm text-blue-800">{ordem.instrucoes_tecnicas}</p>
                          </div>
                        )}
                      </div>

                      {/* Botões de ação no lado direito */}
                      <div className="flex md:flex-col gap-2">
                        {/* Se não tem itens ou tem apenas 1, mostra botão de concluir */}
                        {(!temMultiplosItens || itensEmProducao.length === 1) && itensAguardando.length === 0 && (
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
                        )}

                        {/* Se tem itens aguardando, mostra botão de iniciar próximo */}
                        {temMultiplosItens && itensAguardando.length > 0 && itensEmProducao.length === 0 && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (itensAguardando.length === 1) {
                                handleIniciarItem(ordem, itensAguardando[0]);
                              } else {
                                setOrdemParaIniciar(ordem);
                                setShowItemSelectModal(true);
                              }
                            }}
                            className="w-full md:w-auto"
                            size="lg"
                          >
                            <Play className="h-5 w-5 mr-2" />
                            Próximo Produto
                          </Button>
                        )}
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

      {/* Modal de Seleção de Produto para Iniciar */}
      <Dialog open={showItemSelectModal} onOpenChange={setShowItemSelectModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Selecionar Produto para Produção
            </DialogTitle>
            <DialogDescription>
              {ordemParaIniciar && (
                <>
                  Ordem <strong>{ordemParaIniciar.numero_op}</strong> possui múltiplos produtos.
                  Selecione qual deseja iniciar a produção:
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {ordemParaIniciar && getItensAguardando(ordemParaIniciar).map((item) => {
              const itemProduto = item.produto as any;
              const isLoading = loadingItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{itemProduto?.nome || 'Produto'}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantidade: {formatQuantity(item.quantidade_metros, 'm')}
                      {item.quantidade_pecas && ` (${item.quantidade_pecas} peças)`}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleIniciarItem(ordemParaIniciar, item)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowItemSelectModal(false);
                setOrdemParaIniciar(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
