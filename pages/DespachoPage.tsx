import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { usePedidos } from '../hooks/usePedidos';
import { useNFe, type NFePaymentData } from '../hooks/useNFe';
import { baseClient } from '../lib/base';
import type { PedidoCompleto } from '../lib/database.types';
import { formatCurrency } from '../lib/format';
import { gerarPDFPedido } from '../lib/pdf-generator';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, AlertTriangle, Truck, Package, Printer, FileText, CheckCircle2, Download, ExternalLink, ChevronDown } from 'lucide-react';
import { DespachoFilter, applyDespachoFilters, type DespachoFilterState } from '@/components/despacho/DespachoFilter';
import { NFePaymentModal } from '@/components/despacho/NFePaymentModal';

export default function DespachoPage() {
  const { pedidos, update, refresh, loading, error } = usePedidos();
  const { emitirNFe, loading: emitindoNFe } = useNFe();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [emitindoNFeId, setEmitindoNFeId] = useState<string | null>(null);

  // Modal NF-e state
  const [nfeModalOpen, setNfeModalOpen] = useState(false);
  const [pedidoParaNFe, setPedidoParaNFe] = useState<PedidoCompleto | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<DespachoFilterState>({
    search: '',
    status: 'todos',
  });

  // Filtrar apenas pedidos produzidos (aguardando_despacho e entregue)
  const pedidosProducao = useMemo(() => {
    const filtrados = pedidos.filter(pedido =>
      pedido.status === 'aguardando_despacho' || pedido.status === 'entregue'
    );
    console.log(`📦 Total de pedidos: ${pedidos.length}`);
    console.log(`✅ Pedidos aguardando despacho ou entregues: ${filtrados.length}`);
    console.log('Status dos pedidos:', pedidos.map(p => ({ numero: p.numero_pedido, status: p.status })));
    return filtrados;
  }, [pedidos]);

  // Apply filters
  const pedidosFiltrados = useMemo(() => {
    return applyDespachoFilters(pedidosProducao, filters);
  }, [pedidosProducao, filters]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleDespachar = async (pedido: PedidoCompleto) => {
    setProcessingId(pedido.id);

    const { error } = await update(pedido.id, {
      status: 'entregue'
    });

    if (error) {
      toast.error(`Erro ao confirmar despacho: ${error}`);
      setProcessingId(null);
      return;
    }

    toast.success(`Pedido ${pedido.numero_pedido} despachado com sucesso!`);
    setProcessingId(null);
    refresh();
  };

  const handleImprimirPDF = async (pedido: PedidoCompleto) => {
    setPrintingId(pedido.id);

    try {
      await gerarPDFPedido(pedido);
      toast.success(`PDF gerado para o pedido ${pedido.numero_pedido}`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPrintingId(null);
    }
  };

  // Verifica se pedido tem dados de pagamento completos
  const pedidoTemDadosPagamento = (pedido: PedidoCompleto): boolean => {
    // banco_id pode ser 0, então verificar se não é null/undefined
    return !!(pedido.tipo_cobranca && pedido.banco_id != null && pedido.banco_id > 0 && pedido.data_vencimento);
  };

  // Abre o modal ou emite diretamente se já tiver dados
  const handleAbrirModalNFe = async (pedido: PedidoCompleto) => {
    // Se já tem dados de pagamento, emitir diretamente
    if (pedidoTemDadosPagamento(pedido)) {
      setEmitindoNFeId(pedido.id);
      try {
        const result = await emitirNFe(pedido);
        if (result.success) {
          toast.success(
            <div>
              <strong>NF-e emitida com sucesso!</strong>
              {result.invoiceNumber && (
                <p className="text-sm mt-1">Número: {result.invoiceNumber}</p>
              )}
            </div>
          );
          refresh();
        } else {
          toast.error(`Erro ao emitir NF-e: ${result.error}`);
        }
      } catch (error: any) {
        console.error('Erro ao emitir NF-e:', error);
        toast.error(`Erro ao emitir NF-e: ${error.message || 'Erro desconhecido'}`);
      } finally {
        setEmitindoNFeId(null);
      }
    } else {
      // Se não tem dados, abrir modal para preencher
      setPedidoParaNFe(pedido);
      setNfeModalOpen(true);
    }
  };

  // Emite NF-e após confirmação do modal
  const handleConfirmarNFe = async (paymentData: NFePaymentData) => {
    if (!pedidoParaNFe) return;

    setEmitindoNFeId(pedidoParaNFe.id);

    try {
      const result = await emitirNFe(pedidoParaNFe, paymentData);

      if (result.success) {
        toast.success(
          <div>
            <strong>NF-e emitida com sucesso!</strong>
            {result.invoiceNumber && (
              <p className="text-sm mt-1">Número: {result.invoiceNumber}</p>
            )}
          </div>
        );
        setNfeModalOpen(false);
        setPedidoParaNFe(null);
        refresh();
      } else {
        toast.error(`Erro ao emitir NF-e: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Erro ao emitir NF-e:', error);
      toast.error(`Erro ao emitir NF-e: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setEmitindoNFeId(null);
    }
  };

  // Função auxiliar para download de arquivo base64
  const downloadBase64File = (base64: string, fileName: string, contentType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download PDF da NF-e
  const handleDownloadPdf = async (pedido: PedidoCompleto) => {
    if (!pedido.base_invoice_id) {
      toast.error('Pedido não possui NF-e emitida');
      return;
    }

    setDownloadingId(pedido.id);
    try {
      const result = await baseClient.downloadInvoicePdf(String(pedido.base_invoice_id));
      downloadBase64File(result.base64, `nfe-${pedido.base_invoice_number || pedido.numero_pedido}.pdf`, 'application/pdf');
      toast.success('PDF baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao baixar PDF:', error);
      toast.error(`Erro ao baixar PDF: ${error.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Download XML da NF-e
  const handleDownloadXml = async (pedido: PedidoCompleto) => {
    if (!pedido.base_invoice_id) {
      toast.error('Pedido não possui NF-e emitida');
      return;
    }

    setDownloadingId(pedido.id);
    try {
      const result = await baseClient.downloadInvoiceXml(String(pedido.base_invoice_id));
      downloadBase64File(result.base64, `nfe-${pedido.base_invoice_number || pedido.numero_pedido}.xml`, 'application/xml');
      toast.success('XML baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao baixar XML:', error);
      toast.error(`Erro ao baixar XML: ${error.message}`);
    } finally {
      setDownloadingId(null);
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
          <AlertTitle>Erro ao carregar pedidos</AlertTitle>
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
        title="Despacho de Pedidos"
        description={
          pedidosProducao.length > 0
            ? `${pedidosFiltrados.length} de ${pedidosProducao.length} ${pedidosProducao.length === 1 ? 'pedido' : 'pedidos'}`
            : undefined
        }
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </PageHeader>

      {/* Filtros */}
      <DespachoFilter
        filters={filters}
        onFiltersChange={setFilters}
        pedidos={pedidosProducao}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Número Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Data Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Valor Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <EmptyState
                      icon={<Package size={48} />}
                      title={pedidosProducao.length === 0 ? "Nenhum pedido produzido" : "Nenhum pedido encontrado"}
                      description={pedidosProducao.length === 0 ? "Não há pedidos aguardando despacho ou entregues no momento" : "Tente ajustar os filtros para encontrar o que procura"}
                    />
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const clienteNome = pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social || 'Cliente não identificado';
                  const isProcessing = processingId === pedido.id;
                  const isPrinting = printingId === pedido.id;
                  const jaEntregue = pedido.status === 'entregue';

                  return (
                    <tr
                      key={pedido.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium">{pedido.numero_pedido}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{clienteNome}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(pedido.data_pedido)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {formatCurrency(Number(pedido.valor_total) || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={pedido.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleImprimirPDF(pedido)}
                            disabled={isPrinting}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            {isPrinting ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Printer className="h-4 w-4" />
                                PDF
                              </>
                            )}
                          </Button>
                          {jaEntregue ? (
                            <>
                              {pedido.base_invoice_number ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 border-green-300 text-green-700 hover:bg-green-50"
                                      disabled={downloadingId === pedido.id}
                                    >
                                      {downloadingId === pedido.id ? (
                                        <LoadingSpinner size="sm" />
                                      ) : (
                                        <CheckCircle2 className="h-3 w-3" />
                                      )}
                                      NF-e {pedido.base_invoice_number}
                                      <ChevronDown className="h-3 w-3 ml-1" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleDownloadPdf(pedido)}
                                      disabled={downloadingId === pedido.id}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDownloadXml(pedido)}
                                      disabled={downloadingId === pedido.id}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download XML
                                    </DropdownMenuItem>
                                    {pedido.base_invoice_key && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          // Consultar no portal SEFAZ
                                          window.open(`https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XbSeqxE8pl8=&nfe=${pedido.base_invoice_key}`, '_blank');
                                        }}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Consultar SEFAZ
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Button
                                  onClick={() => handleAbrirModalNFe(pedido)}
                                  disabled={emitindoNFeId === pedido.id}
                                  size="sm"
                                  variant="default"
                                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                                >
                                  {emitindoNFeId === pedido.id ? (
                                    <LoadingSpinner size="sm" />
                                  ) : (
                                    <>
                                      <FileText className="h-4 w-4" />
                                      Gerar NF-e
                                    </>
                                  )}
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button
                              onClick={() => handleDespachar(pedido)}
                              disabled={isProcessing}
                              size="sm"
                              className="gap-2"
                            >
                              {isProcessing ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <>
                                  <Truck className="h-4 w-4" />
                                  Despachar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Pagamento para NF-e */}
      <NFePaymentModal
        isOpen={nfeModalOpen}
        onClose={() => {
          setNfeModalOpen(false);
          setPedidoParaNFe(null);
        }}
        onConfirm={handleConfirmarNFe}
        pedido={pedidoParaNFe}
        loading={emitindoNFeId !== null}
      />
    </div>
  );
}
