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
import { Package, CheckCircle2, AlertTriangle, QrCode, XCircle, Truck, User, MapPin, Phone, Mail, Calendar, Scale, Box } from 'lucide-react';

interface PedidoItem {
  id: string;
  produto?: {
    nome: string;
  };
  quantidade_pecas?: number;
  comprimento_cada_mm?: number;
  quantidade_simples?: number;
  unidade_medida?: string;
}

interface PalletComPedido extends PedidoPallet {
  pedido?: {
    id: string;
    numero_pedido: string;
    status: string;
    data_pedido: string;
    tipo_frete?: string;
    peso_bruto_kg?: number;
    peso_liquido_kg?: number;
    quantidade_volumes?: number;
    observacoes?: string;
    cliente?: {
      nome_fantasia?: string;
      razao_social?: string;
      cnpj_cpf?: string;
      cidade?: string;
      estado?: string;
      endereco_completo?: string;
      cep?: string;
      telefone?: string;
      email?: string;
    };
    itens?: PedidoItem[];
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
      // Fetch pallet with related pedido, cliente and items data
      const { data, error } = await supabase
        .from('pedido_pallets')
        .select(`
          *,
          pedido:pedidos(
            id,
            numero_pedido,
            status,
            data_pedido,
            tipo_frete,
            peso_bruto_kg,
            peso_liquido_kg,
            quantidade_volumes,
            observacoes,
            cliente:clientes(
              nome_fantasia,
              razao_social,
              cnpj_cpf,
              cidade,
              estado,
              endereco_completo,
              cep,
              telefone,
              email
            ),
            itens:pedidos_itens(
              id,
              quantidade_pecas,
              comprimento_cada_mm,
              quantidade_simples,
              unidade_medida,
              produto:produtos(nome)
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

  const cliente = pallet.pedido?.cliente;
  const clienteNome = cliente?.nome_fantasia || cliente?.razao_social || 'Cliente não identificado';
  const clienteCidade = cliente?.cidade || '';
  const clienteEstado = cliente?.estado || '';
  const pedido = pallet.pedido;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
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
                Pallet {pallet.numero_pallet} de {statusPallets?.total || 1}
              </div>
              <Badge variant="outline" className="text-base px-4 py-1 bg-amber-100 text-amber-800 border-amber-300">
                Pendente
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Info do Pedido */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Box className="h-4 w-4" />
                Dados do Pedido
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Pedido Nº</p>
                  <p className="text-lg font-bold text-green-700">{pedido?.numero_pedido}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Data
                  </p>
                  <p className="text-sm font-medium">
                    {pedido?.data_pedido ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Info do Cliente */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados do Cliente
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-base font-semibold">{clienteNome}</p>
                  {cliente?.razao_social && cliente?.nome_fantasia && (
                    <p className="text-xs text-muted-foreground">{cliente.razao_social}</p>
                  )}
                </div>

                {cliente?.cnpj_cpf && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">CNPJ/CPF:</span> {cliente.cnpj_cpf}
                  </p>
                )}

                {cliente?.endereco_completo && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{cliente.endereco_completo}</p>
                      <p>
                        {clienteCidade && clienteEstado && `${clienteCidade}/${clienteEstado}`}
                        {cliente?.cep && ` - CEP: ${cliente.cep}`}
                      </p>
                    </div>
                  </div>
                )}

                {!cliente?.endereco_completo && clienteCidade && clienteEstado && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{clienteCidade}/{clienteEstado}</span>
                  </div>
                )}

                {cliente?.telefone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{cliente.telefone}</span>
                  </div>
                )}

                {cliente?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{cliente.email}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Itens do Pedido */}
            {pedido?.itens && pedido.itens.length > 0 && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Itens do Pedido ({pedido.itens.length})
                  </h3>
                  <div className="space-y-2">
                    {pedido.itens.map((item, index) => (
                      <div key={item.id || index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="font-medium text-sm">{item.produto?.nome || 'Produto'}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                          {item.quantidade_pecas && item.comprimento_cada_mm ? (
                            <>
                              <span><strong>Qtd:</strong> {item.quantidade_pecas.toLocaleString('pt-BR')} pçs</span>
                              <span><strong>Comp:</strong> {item.comprimento_cada_mm.toLocaleString('pt-BR')} mm</span>
                            </>
                          ) : item.quantidade_simples ? (
                            <span><strong>Qtd:</strong> {item.quantidade_simples.toLocaleString('pt-BR')} {item.unidade_medida || 'un'}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Info de Transporte */}
            {(pedido?.peso_bruto_kg || pedido?.peso_liquido_kg || pedido?.tipo_frete) && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Informações de Transporte
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {pedido?.tipo_frete && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo de Frete</p>
                        <p className="font-medium">{pedido.tipo_frete}</p>
                      </div>
                    )}
                    {pedido?.quantidade_volumes && (
                      <div>
                        <p className="text-xs text-muted-foreground">Total de Volumes</p>
                        <p className="font-medium">{pedido.quantidade_volumes}</p>
                      </div>
                    )}
                    {pedido?.peso_liquido_kg !== undefined && pedido?.peso_liquido_kg > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Scale className="h-3 w-3" /> Peso Líquido
                        </p>
                        <p className="font-medium">{pedido.peso_liquido_kg.toFixed(2)} kg</p>
                      </div>
                    )}
                    {pedido?.peso_bruto_kg !== undefined && pedido?.peso_bruto_kg > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Scale className="h-3 w-3" /> Peso Bruto
                        </p>
                        <p className="font-medium">{pedido.peso_bruto_kg.toFixed(2)} kg</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Observações */}
            {pedido?.observacoes && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Observações</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    {pedido.observacoes}
                  </p>
                </div>

                <Separator />
              </>
            )}

            {/* Status dos Pallets */}
            {statusPallets && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Status da Conferência</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pallets conferidos:</span>
                  <span className="font-bold text-lg text-green-700">
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
