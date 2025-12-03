import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { conferirPallet } from '../lib/pdf-pallet';
import type { PedidoPallet } from '../lib/database.types';
import { LoadingSpinner } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, CheckCircle2, AlertTriangle, QrCode, XCircle, Truck } from 'lucide-react';

interface PalletComPedido extends PedidoPallet {
  pedido?: {
    id: string;
    numero_pedido: string;
    status: string;
    cliente?: {
      nome_fantasia?: string;
      razao_social?: string;
      cidade?: string;
      estado?: string;
    };
  };
}

export default function ConferenciaPalletPage() {
  const [pallet, setPallet] = useState<PalletComPedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [statusPallets, setStatusPallets] = useState<{ total: number; conferidos: number; pendentes: number } | null>(null);
  const [allConfirmed, setAllConfirmed] = useState(false);

  useEffect(() => {
    loadPallet();
  }, []);

  const loadPallet = async () => {
    // Get hash from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const hash = urlParams.get('hash');

    if (!hash) {
      toast.error('Hash do pallet não fornecido');
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      // Fetch pallet with related pedido and cliente data
      const { data, error } = await supabase
        .from('pedido_pallets')
        .select(`
          *,
          pedido:pedidos(
            id,
            numero_pedido,
            status,
            cliente:clientes(
              nome_fantasia,
              razao_social,
              cidade,
              estado
            )
          )
        `)
        .eq('qr_code_hash', hash)
        .single();

      if (error || !data) {
        console.error('Erro ao carregar pallet:', error);
        toast.error('Pallet não encontrado');
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Verificar se já foi conferido
      if (data.status === 'conferido') {
        setAlreadyConfirmed(true);
        setPallet(data);
        // Buscar status de todos os pallets
        await loadStatusPallets(data.pedido_id);
        setLoading(false);
        return;
      }

      setPallet(data);
      await loadStatusPallets(data.pedido_id);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar pallet:', err);
      toast.error('Erro ao carregar pallet');
      setNotFound(true);
      setLoading(false);
    }
  };

  const loadStatusPallets = async (pedidoId: string) => {
    try {
      const { data: pallets } = await supabase
        .from('pedido_pallets')
        .select('status')
        .eq('pedido_id', pedidoId);

      if (pallets) {
        const total = pallets.length;
        const conferidos = pallets.filter((p: any) => p.status === 'conferido').length;
        const pendentes = total - conferidos;
        setStatusPallets({ total, conferidos, pendentes });
      }
    } catch (err) {
      console.error('Erro ao carregar status dos pallets:', err);
    }
  };

  const handleConfirmPallet = async () => {
    if (!pallet) return;

    setProcessing(true);

    try {
      const resultado = await conferirPallet(supabase, pallet.qr_code_hash);

      if (!resultado.success) {
        toast.error(resultado.error || 'Erro ao conferir pallet');
        setProcessing(false);
        return;
      }

      toast.success(`Pallet ${pallet.numero_pallet} conferido com sucesso!`);
      setConfirmed(true);
      setAllConfirmed(resultado.todosConferidos || false);

      // Atualizar status dos pallets
      await loadStatusPallets(pallet.pedido_id);

      // Se todos os pallets foram conferidos, atualizar status do pedido para entregue
      if (resultado.todosConferidos && pallet.pedido?.id) {
        await supabase
          .from('pedidos')
          .update({ status: 'entregue' })
          .eq('id', pallet.pedido.id);

        toast.success('Todos os pallets foram conferidos! Pedido marcado como entregue.');
      }

      setProcessing(false);
    } catch (err) {
      console.error('Erro ao confirmar pallet:', err);
      toast.error('Erro ao confirmar pallet');
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
              <AlertTitle>Pallet não encontrado</AlertTitle>
              <AlertDescription>
                O pallet solicitado não foi encontrado no sistema. Verifique o QR code e tente novamente.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyConfirmed && pallet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-2 border-amber-500">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-amber-100 rounded-full p-4">
                <CheckCircle2 className="h-16 w-16 text-amber-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-amber-900">Pallet Já Conferido</h2>
              <p className="text-amber-700 mt-2">
                O pallet <strong>{pallet.numero_pallet}</strong> do pedido <strong>{pallet.pedido?.numero_pedido}</strong> já foi conferido anteriormente.
              </p>
              {pallet.data_conferencia && (
                <p className="text-sm text-amber-600 mt-2">
                  Data da conferência: {new Date(pallet.data_conferencia).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            {statusPallets && (
              <div className="bg-amber-50 rounded-lg p-4 mt-4">
                <p className="text-sm font-medium text-amber-800">
                  Status dos pallets: {statusPallets.conferidos} de {statusPallets.total} conferidos
                </p>
                {statusPallets.pendentes > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Ainda faltam {statusPallets.pendentes} pallet(s) para conferir
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className={`max-w-md w-full border-2 ${allConfirmed ? 'border-emerald-500' : 'border-blue-500'}`}>
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className={`rounded-full p-4 ${allConfirmed ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                {allConfirmed ? (
                  <Truck className={`h-16 w-16 text-emerald-600`} />
                ) : (
                  <CheckCircle2 className={`h-16 w-16 text-blue-600`} />
                )}
              </div>
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${allConfirmed ? 'text-emerald-900' : 'text-blue-900'}`}>
                {allConfirmed ? 'Todos os Pallets Conferidos!' : 'Pallet Conferido!'}
              </h2>
              <p className={`mt-2 ${allConfirmed ? 'text-emerald-700' : 'text-blue-700'}`}>
                {allConfirmed ? (
                  <>O pedido <strong>{pallet?.pedido?.numero_pedido}</strong> está pronto para despacho!</>
                ) : (
                  <>O pallet <strong>{pallet?.numero_pallet}</strong> foi conferido com sucesso.</>
                )}
              </p>
            </div>
            {statusPallets && !allConfirmed && (
              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <p className="text-sm font-medium text-blue-800">
                  Progresso: {statusPallets.conferidos} de {statusPallets.total} pallets conferidos
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Ainda faltam {statusPallets.pendentes} pallet(s) para liberar o despacho
                </p>
              </div>
            )}
            {allConfirmed && (
              <div className="bg-emerald-50 rounded-lg p-4 mt-4">
                <p className="text-sm font-medium text-emerald-800">
                  Pedido marcado como ENTREGUE
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pallet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const clienteNome = pallet.pedido?.cliente?.nome_fantasia || pallet.pedido?.cliente?.razao_social || 'Cliente não identificado';
  const clienteCidade = pallet.pedido?.cliente?.cidade || '';
  const clienteEstado = pallet.pedido?.cliente?.estado || '';

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-600 rounded-full p-3">
              <QrCode className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Conferência de Pallet</h1>
          <p className="text-gray-600 mt-1">VerdePack Embalagens</p>
        </div>

        <Card className="border-2 border-green-500">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pallet {pallet.numero_pallet}
              </div>
              <Badge variant="outline" className="text-base px-4 py-1 bg-amber-100 text-amber-800 border-amber-300">
                Pendente
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Info do Pedido */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Dados do Pedido</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Pedido Nº</p>
                  <p className="text-lg font-bold text-green-700">{pallet.pedido?.numero_pedido}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="text-base font-medium">{clienteNome}</p>
                </div>
                {clienteCidade && clienteEstado && (
                  <div>
                    <p className="text-sm text-muted-foreground">Destino</p>
                    <p className="text-base font-medium">{clienteCidade}/{clienteEstado}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Status dos Pallets */}
            {statusPallets && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Status da Conferência</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pallets conferidos:</span>
                  <span className="font-bold text-lg">
                    {statusPallets.conferidos} / {statusPallets.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(statusPallets.conferidos / statusPallets.total) * 100}%` }}
                  />
                </div>
                {statusPallets.pendentes > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Faltam {statusPallets.pendentes} pallet(s) para liberar o despacho
                  </p>
                )}
              </div>
            )}

            <Separator />

            {/* Botão de Conferência */}
            <div className="pt-2">
              <Button
                onClick={handleConfirmPallet}
                disabled={processing}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 gap-2"
              >
                {processing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <CheckCircle2 className="h-6 w-6" />
                    Confirmar Pallet {pallet.numero_pallet}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Sistema ERP Verde Pack - Conferência de Pallets</p>
        </div>
      </div>
    </div>
  );
}
