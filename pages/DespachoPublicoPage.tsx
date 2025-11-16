import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { PedidoCompleto } from '../lib/database.types';
import { LoadingSpinner } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, CheckCircle2, AlertTriangle, Truck, XCircle } from 'lucide-react';

export default function DespachoPublicoPage() {
  const [pedido, setPedido] = useState<PedidoCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [invalidStatus, setInvalidStatus] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    loadPedido();
  }, []);

  const loadPedido = async () => {
    // Get pedido_id from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('id');

    if (!pedidoId) {
      toast.error('ID do pedido não fornecido');
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      // Fetch pedido with related data (cliente, itens, produtos)
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(*),
          itens:pedidos_itens(
            *,
            produto:produtos(*)
          )
        `)
        .eq('id', pedidoId)
        .single();

      if (error || !data) {
        console.error('Erro ao carregar pedido:', error);
        toast.error('Pedido não encontrado');
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (data.status !== 'aguardando_despacho') {
        setInvalidStatus(true);
        setPedido(data);
        setLoading(false);
        return;
      }

      setPedido(data);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar pedido:', err);
      toast.error('Erro ao carregar pedido');
      setNotFound(true);
      setLoading(false);
    }
  };

  const handleConfirmDespacho = async () => {
    if (!pedido) return;

    setProcessing(true);

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'entregue' })
        .eq('id', pedido.id);

      if (error) {
        console.error('Erro ao confirmar despacho:', error);
        toast.error('Erro ao confirmar despacho');
        setProcessing(false);
        return;
      }

      toast.success(`Despacho confirmado! Pedido ${pedido.numero_pedido} marcado como entregue.`);
      setConfirmed(true);
      setProcessing(false);
    } catch (err) {
      console.error('Erro ao confirmar despacho:', err);
      toast.error('Erro ao confirmar despacho');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Pedido não encontrado</AlertTitle>
              <AlertDescription>
                O pedido solicitado não foi encontrado no sistema. Verifique o link e tente novamente.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invalidStatus && pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Não é possível despachar este pedido</AlertTitle>
              <AlertDescription>
                Este pedido está com status <strong>"{pedido.status}"</strong>.
                <br />
                <br />
                Apenas pedidos com status "Aguardando Despacho" podem ser despachados.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-2 border-emerald-500">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-emerald-100 rounded-full p-4">
                <CheckCircle2 className="h-16 w-16 text-emerald-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-900">Despacho Confirmado!</h2>
              <p className="text-emerald-700 mt-2">
                O pedido <strong>{pedido?.numero_pedido}</strong> foi marcado como entregue.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Confirmação de Despacho</h1>
          <p className="text-gray-600 mt-2">Verifique os detalhes e confirme o despacho</p>
        </div>

        <Alert className="border-emerald-500 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-900">Pedido Identificado</AlertTitle>
          <AlertDescription className="text-emerald-800">
            Verifique os detalhes abaixo e confirme o despacho
          </AlertDescription>
        </Alert>

        <Card className="border-2 border-emerald-500">
          <CardHeader className="bg-emerald-50">
            <CardTitle className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pedido {pedido.numero_pedido}
              </div>
              <Badge variant="outline" className="text-base px-4 py-1">
                Aguardando Despacho
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Cliente Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Dados do Cliente</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="text-base font-medium">
                    {pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social || 'Cliente não identificado'}
                  </p>
                </div>

                {pedido.cliente?.razao_social && pedido.cliente?.nome_fantasia && (
                  <div>
                    <p className="text-sm text-muted-foreground">Razão Social</p>
                    <p className="text-base font-medium">{pedido.cliente.razao_social}</p>
                  </div>
                )}

                {pedido.cliente?.cnpj_cpf && (
                  <div>
                    <p className="text-sm text-muted-foreground">CNPJ/CPF</p>
                    <p className="text-base font-medium">{pedido.cliente.cnpj_cpf}</p>
                  </div>
                )}

                {pedido.cliente?.telefone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="text-base font-medium">{pedido.cliente.telefone}</p>
                  </div>
                )}

                {pedido.cliente?.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="text-base font-medium">{pedido.cliente.email}</p>
                  </div>
                )}

                {pedido.cliente?.endereco_completo && (
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="text-base font-medium">{pedido.cliente.endereco_completo}</p>
                  </div>
                )}

                {pedido.cliente?.cidade && pedido.cliente?.estado && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cidade/Estado</p>
                    <p className="text-base font-medium">
                      {pedido.cliente.cidade} - {pedido.cliente.estado}
                    </p>
                  </div>
                )}

                {pedido.cliente?.cep && (
                  <div>
                    <p className="text-sm text-muted-foreground">CEP</p>
                    <p className="text-base font-medium">{pedido.cliente.cep}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Pedido Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data do Pedido</p>
                <p className="font-medium">
                  {pedido.data_pedido
                    ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">
                  {pedido.tipo === 'pedido_confirmado' ? 'Pedido Confirmado' : 'Orçamento'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Itens do Pedido</h3>
              <div className="space-y-3">
                {pedido.itens && pedido.itens.length > 0 ? (
                  pedido.itens.map((item: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-base mb-2">
                            {item.produto?.nome || 'Produto não identificado'}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {item.quantidade_pecas && item.comprimento_cada_mm ? (
                              <>
                                <div>
                                  <span className="font-medium">Quantidade:</span>{' '}
                                  {item.quantidade_pecas.toLocaleString('pt-BR')} peças
                                </div>
                                <div>
                                  <span className="font-medium">Comprimento:</span>{' '}
                                  {item.comprimento_cada_mm.toLocaleString('pt-BR')} mm
                                </div>
                              </>
                            ) : item.quantidade_simples ? (
                              <div>
                                <span className="font-medium">Quantidade:</span>{' '}
                                {item.quantidade_simples.toLocaleString('pt-BR')} {item.unidade_medida}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nenhum item cadastrado</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="pt-2">
              <Button
                onClick={handleConfirmDespacho}
                disabled={processing}
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6 gap-2"
              >
                {processing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Truck className="h-6 w-6" />
                    Confirmar Despacho
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Sistema ERP Verde Pack - Confirmação de Despacho</p>
        </div>
      </div>
    </div>
  );
}
