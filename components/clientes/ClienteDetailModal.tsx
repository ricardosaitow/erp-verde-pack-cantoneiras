import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Edit, Trash2, CheckCircle, XCircle, Building2, User, MapPin, CreditCard, Mail, Phone, FileText, Calendar, DollarSign, Clock, Link2, CloudOff, Receipt, Repeat, CreditCard as CreditCardIcon, Activity, Loader2, AlertCircle, ExternalLink, ShoppingCart, Package, Truck } from 'lucide-react';
import type { Cliente, ClienteContato } from '@/lib/database.types';
import { formatBrazilianDateTimeLong } from '@/lib/date-utils';
import { formatCEP, formatTelefone, formatCpfCnpj, formatCurrency } from '@/lib/format';
import { useClienteCobrancas } from '@/hooks/useClienteCobrancas';
import { useClienteAssinaturas } from '@/hooks/useClienteAssinaturas';
import { useClienteParcelamentos } from '@/hooks/useClienteParcelamentos';
import { useClienteAtividades } from '@/hooks/useClienteAtividades';
import { useClientePedidosBase } from '@/hooks/useClientePedidosBase';
import { CobrancaDetailModal } from './CobrancaDetailModal';
import { PedidoDetailModal } from './PedidoDetailModal';

interface ClienteDetailModalProps {
  cliente: Cliente | null;
  contatos: ClienteContato[];
  open: boolean;
  onClose: () => void;
  onEdit: (cliente: Cliente) => void;
  onToggleActive: (id: string) => void;
}

export function ClienteDetailModal({
  cliente,
  contatos,
  open,
  onClose,
  onEdit,
  onToggleActive
}: ClienteDetailModalProps) {
  const [activeTab, setActiveTab] = useState('geral');
  const [selectedCobranca, setSelectedCobranca] = useState<any>(null);
  const [cobrancaModalOpen, setCobrancaModalOpen] = useState(false);
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  const [pedidoModalOpen, setPedidoModalOpen] = useState(false);

  // Buscar dados do Asaas (autoFetch desabilitado - controlado manualmente)
  const {
    cobrancas,
    loading: loadingCobrancas,
    error: errorCobrancas,
    totalCount: totalCobrancas,
    refetch: refetchCobrancas
  } = useClienteCobrancas({
    customerId: cliente?.asaas_customer_id || null,
    autoFetch: false,
  });

  const {
    assinaturas,
    loading: loadingAssinaturas,
    error: errorAssinaturas,
    totalCount: totalAssinaturas,
    refetch: refetchAssinaturas
  } = useClienteAssinaturas({
    customerId: cliente?.asaas_customer_id || null,
    autoFetch: false,
  });

  const {
    parcelamentos,
    loading: loadingParcelamentos,
    error: errorParcelamentos,
    totalCount: totalParcelamentos,
    refetch: refetchParcelamentos
  } = useClienteParcelamentos({
    customerId: cliente?.asaas_customer_id || null,
    autoFetch: false,
  });

  const {
    atividades,
    loading: loadingAtividades,
    error: errorAtividades,
    refetch: refetchAtividades
  } = useClienteAtividades({
    clienteId: cliente?.id || null,
    autoFetch: false,
  });

  const {
    pedidos,
    loading: loadingPedidos,
    error: errorPedidos,
    totalCount: totalPedidos,
    refetch: refetchPedidos
  } = useClientePedidosBase({
    customerId: cliente?.base_customer_id || null,
    autoFetch: false,
  });

  // Buscar dados quando mudar de aba
  useEffect(() => {
    if (!open) return;

    if (activeTab === 'cobrancas' && cliente?.asaas_customer_id) {
      refetchCobrancas();
    } else if (activeTab === 'assinaturas' && cliente?.asaas_customer_id) {
      refetchAssinaturas();
    } else if (activeTab === 'parcelamentos' && cliente?.asaas_customer_id) {
      refetchParcelamentos();
    } else if (activeTab === 'atividades' && cliente?.id) {
      refetchAtividades();
    } else if (activeTab === 'pedidos' && cliente?.base_customer_id) {
      refetchPedidos();
    }
  }, [activeTab, open, cliente?.asaas_customer_id, cliente?.base_customer_id, cliente?.id, refetchCobrancas, refetchAssinaturas, refetchParcelamentos, refetchAtividades, refetchPedidos]);

  if (!cliente) return null;

  const handleEdit = () => {
    onEdit(cliente);
    onClose();
  };

  const handleToggleActive = () => {
    // Não fecha o modal aqui - só depois da confirmação
    onToggleActive(cliente.id);
  };

  const handleCobrancaClick = (cobranca: any) => {
    setSelectedCobranca(cobranca);
    setCobrancaModalOpen(true);
  };

  const handleCloseCobrancaModal = () => {
    setCobrancaModalOpen(false);
    setSelectedCobranca(null);
  };

  const handlePedidoClick = (pedidoId: string) => {
    setSelectedPedidoId(pedidoId);
    setPedidoModalOpen(true);
  };

  const handleClosePedidoModal = () => {
    setPedidoModalOpen(false);
    setSelectedPedidoId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {cliente.tipo_pessoa === 'juridica' ? (
                <Building2 className="h-5 w-5 text-blue-600" />
              ) : (
                <User className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{cliente.razao_social}</DialogTitle>
              <DialogDescription>
                {cliente.nome_fantasia || 'Visualização do cliente'}
              </DialogDescription>
            </div>
            <div className="flex-shrink-0 mr-8">
              <Badge variant={cliente.ativo ? 'success' : 'destructive'}>
                {cliente.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="geral" className="gap-2">
              <User className="h-4 w-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="cobrancas" className="gap-2">
              <Receipt className="h-4 w-4" />
              Cobranças
            </TabsTrigger>
            <TabsTrigger value="assinaturas" className="gap-2">
              <Repeat className="h-4 w-4" />
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="parcelamentos" className="gap-2">
              <CreditCardIcon className="h-4 w-4" />
              Parcelamentos
            </TabsTrigger>
            <TabsTrigger value="atividades" className="gap-2">
              <Activity className="h-4 w-4" />
              Atividades
            </TabsTrigger>
          </TabsList>

          {/* Aba Geral */}
          <TabsContent value="geral" className="flex-1 overflow-y-auto space-y-6 pr-2 mt-4">
          {/* Status de Integração */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Link2 className="h-4 w-4" />
              <span>Integrações</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Asaas */}
              <div className={`flex items-start gap-3 p-3 rounded-lg border ${cliente.asaas_customer_id ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`p-2 rounded-md ${cliente.asaas_customer_id ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {cliente.asaas_customer_id ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <CloudOff className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Asaas</p>
                  {cliente.asaas_customer_id ? (
                    <>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 mb-1">
                        Integrado
                      </Badge>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        ID: {cliente.asaas_customer_id}
                      </p>
                    </>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                      Não integrado
                    </Badge>
                  )}
                </div>
              </div>

              {/* Base ERP */}
              <div className={`flex items-start gap-3 p-3 rounded-lg border ${cliente.base_customer_id ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className={`p-2 rounded-md ${cliente.base_customer_id ? 'bg-blue-100' : 'bg-amber-100'}`}>
                  {cliente.base_customer_id ? (
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  ) : (
                    <CloudOff className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Base ERP</p>
                  {cliente.base_customer_id ? (
                    <>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 mb-1">
                        Integrado
                      </Badge>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        ID: {cliente.base_customer_id}
                      </p>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 mb-1">
                        Não integrado
                      </Badge>
                      <p className="text-xs text-amber-700">
                        Será criado ao realizar venda
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Informações Básicas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  {cliente.tipo_pessoa === 'juridica' ? (
                    <Building2 className="h-4 w-4 text-blue-600" />
                  ) : (
                    <User className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Tipo de Pessoa</p>
                  <p className="font-medium text-sm">{cliente.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{cliente.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}</p>
                  <p className="font-medium text-sm font-mono">{formatCpfCnpj(cliente.cnpj_cpf)}</p>
                </div>
              </div>

              {cliente.inscricao_estadual && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Inscrição Estadual</p>
                    <p className="font-medium text-sm">{cliente.inscricao_estadual}</p>
                  </div>
                </div>
              )}

              {cliente.inscricao_municipal && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Inscrição Municipal</p>
                    <p className="font-medium text-sm">{cliente.inscricao_municipal}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          {(cliente.endereco_completo || cliente.cep || cliente.cidade || cliente.estado) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Endereço</span>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                {cliente.endereco_completo && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Logradouro</p>
                    <p className="font-medium text-sm">{cliente.endereco_completo}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {cliente.cep && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">CEP</p>
                      <p className="font-medium text-sm font-mono">{formatCEP(cliente.cep)}</p>
                    </div>
                  )}
                  {cliente.cidade && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cidade</p>
                      <p className="font-medium text-sm">{cliente.cidade}</p>
                    </div>
                  )}
                  {cliente.estado && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Estado</p>
                      <p className="font-medium text-sm">{cliente.estado}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contatos */}
          {(cliente.email || cliente.telefone || cliente.celular || contatos.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Contatos</span>
              </div>
              <div className="space-y-2">
                {/* Contato Principal (dados do cliente) */}
                {(cliente.email || cliente.telefone || cliente.celular) && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md">
                          <User className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Contato Principal</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            Principal
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cliente.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{cliente.email}</span>
                        </div>
                      )}
                      {cliente.telefone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span>{formatTelefone(cliente.telefone)}</span>
                        </div>
                      )}
                      {cliente.celular && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span>{formatTelefone(cliente.celular)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contatos Adicionais */}
                {contatos.map((contato, index) => (
                  <div key={index} className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-border transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md">
                          <User className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{contato.nome_responsavel}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {contato.tipo_contato.charAt(0).toUpperCase() + contato.tipo_contato.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contato.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{contato.email}</span>
                        </div>
                      )}
                      {contato.telefone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span>{formatTelefone(contato.telefone)}</span>
                        </div>
                      )}
                    </div>
                    {contato.observacoes && (
                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">{contato.observacoes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Condições Comerciais */}
          {(cliente.condicoes_pagamento || cliente.limite_credito) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Condições Comerciais</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cliente.condicoes_pagamento && (
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <Clock className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Condições de Pagamento</p>
                      <p className="font-medium text-sm">{cliente.condicoes_pagamento}</p>
                    </div>
                  </div>
                )}
                {cliente.limite_credito && (
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Limite de Crédito</p>
                      <p className="font-medium text-sm text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.limite_credito)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          {cliente.observacoes && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Observações</span>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{cliente.observacoes}</p>
              </div>
            </div>
          )}

            {/* Data de Cadastro */}
            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Cadastrado em {formatBrazilianDateTimeLong(cliente.created_at)}
              </span>
            </div>
          </TabsContent>

          {/* Aba Cobranças */}
          <TabsContent value="cobrancas" className="flex-1 overflow-y-auto pr-2 mt-4">
            <div className="space-y-4">
              {!cliente.asaas_customer_id ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CloudOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Cliente não integrado</p>
                  <p className="text-sm">Este cliente não está integrado com o Asaas</p>
                </div>
              ) : loadingCobrancas ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                  <p className="text-lg font-medium mb-2">Carregando cobranças...</p>
                </div>
              ) : errorCobrancas ? (
                <div className="p-8 text-center text-destructive">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Erro ao carregar cobranças</p>
                  <p className="text-sm">{errorCobrancas}</p>
                </div>
              ) : cobrancas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma cobrança encontrada</p>
                  <p className="text-sm">Este cliente ainda não possui cobranças</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">
                      {totalCobrancas} {totalCobrancas === 1 ? 'cobrança encontrada' : 'cobranças encontradas'}
                    </p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Vencimento</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Pagamento</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Líquido</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {cobrancas.map((cobranca: any) => (
                            <tr
                              key={cobranca.id}
                              className="hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => handleCobrancaClick(cobranca)}
                            >
                              <td className="px-4 py-3 text-sm">{cobranca.description || 'Sem descrição'}</td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={
                                    cobranca.status === 'RECEIVED' ? 'success' :
                                    cobranca.status === 'PENDING' ? 'default' :
                                    cobranca.status === 'OVERDUE' ? 'destructive' :
                                    'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {cobranca.status === 'RECEIVED' ? 'Recebido' :
                                   cobranca.status === 'PENDING' ? 'Pendente' :
                                   cobranca.status === 'OVERDUE' ? 'Vencido' :
                                   cobranca.status === 'CONFIRMED' ? 'Confirmado' :
                                   cobranca.status === 'REFUNDED' ? 'Estornado' :
                                   cobranca.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">
                                  {cobranca.billingType === 'BOLETO' ? 'Boleto' :
                                   cobranca.billingType === 'CREDIT_CARD' ? 'Cartão' :
                                   cobranca.billingType === 'PIX' ? 'PIX' :
                                   cobranca.billingType}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(cobranca.value)}</td>
                              <td className="px-4 py-3 text-sm text-center">{new Date(cobranca.dueDate).toLocaleDateString('pt-BR')}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                {cobranca.paymentDate ? new Date(cobranca.paymentDate).toLocaleDateString('pt-BR') : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                                {cobranca.netValue ? formatCurrency(cobranca.netValue) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Aba Assinaturas */}
          <TabsContent value="assinaturas" className="flex-1 overflow-y-auto pr-2 mt-4">
            <div className="space-y-4">
              {!cliente.asaas_customer_id ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CloudOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Cliente não integrado</p>
                  <p className="text-sm">Este cliente não está integrado com o Asaas</p>
                </div>
              ) : loadingAssinaturas ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                  <p className="text-lg font-medium mb-2">Carregando assinaturas...</p>
                </div>
              ) : errorAssinaturas ? (
                <div className="p-8 text-center text-destructive">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Erro ao carregar assinaturas</p>
                  <p className="text-sm">{errorAssinaturas}</p>
                </div>
              ) : assinaturas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma assinatura encontrada</p>
                  <p className="text-sm">Este cliente não possui assinaturas recorrentes</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">
                      {totalAssinaturas} {totalAssinaturas === 1 ? 'assinatura encontrada' : 'assinaturas encontradas'}
                    </p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Ciclo</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Próximo Venc.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Forma Pagto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {assinaturas.map((assinatura: any) => (
                            <tr key={assinatura.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-sm">{assinatura.description || 'Assinatura'}</td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={
                                    assinatura.status === 'ACTIVE' ? 'success' :
                                    assinatura.status === 'INACTIVE' ? 'secondary' :
                                    'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {assinatura.status === 'ACTIVE' ? 'Ativa' :
                                   assinatura.status === 'INACTIVE' ? 'Inativa' :
                                   assinatura.status === 'EXPIRED' ? 'Expirada' :
                                   assinatura.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">
                                  {assinatura.cycle === 'MONTHLY' ? 'Mensal' :
                                   assinatura.cycle === 'WEEKLY' ? 'Semanal' :
                                   assinatura.cycle === 'YEARLY' ? 'Anual' :
                                   assinatura.cycle}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(assinatura.value)}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                {assinatura.nextDueDate ? new Date(assinatura.nextDueDate).toLocaleDateString('pt-BR') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">
                                  {assinatura.billingType === 'BOLETO' ? 'Boleto' :
                                   assinatura.billingType === 'CREDIT_CARD' ? 'Cartão' :
                                   assinatura.billingType === 'PIX' ? 'PIX' :
                                   assinatura.billingType || '-'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Aba Parcelamentos */}
          <TabsContent value="parcelamentos" className="flex-1 overflow-y-auto pr-2 mt-4">
            <div className="space-y-4">
              {!cliente.asaas_customer_id ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CloudOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Cliente não integrado</p>
                  <p className="text-sm">Este cliente não está integrado com o Asaas</p>
                </div>
              ) : loadingParcelamentos ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                  <p className="text-lg font-medium mb-2">Carregando parcelamentos...</p>
                </div>
              ) : errorParcelamentos ? (
                <div className="p-8 text-center text-destructive">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Erro ao carregar parcelamentos</p>
                  <p className="text-sm">{errorParcelamentos}</p>
                </div>
              ) : parcelamentos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CreditCardIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum parcelamento encontrado</p>
                  <p className="text-sm">Este cliente não possui parcelamentos</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">
                      {totalParcelamentos} {totalParcelamentos === 1 ? 'parcelamento encontrado' : 'parcelamentos encontrados'}
                    </p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Parcelas</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor/Parcela</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor Total</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Forma Pagto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {parcelamentos.map((parcelamento: any) => (
                            <tr key={parcelamento.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-sm">{parcelamento.description || 'Parcelamento'}</td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={
                                    parcelamento.status === 'ACTIVE' ? 'success' :
                                    parcelamento.status === 'PAID' ? 'default' :
                                    'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {parcelamento.status === 'ACTIVE' ? 'Ativo' :
                                   parcelamento.status === 'PAID' ? 'Pago' :
                                   parcelamento.status === 'CANCELLED' ? 'Cancelado' :
                                   parcelamento.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-center font-medium">
                                {parcelamento.installmentCount ? `${parcelamento.installmentCount}x` : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium">
                                {parcelamento.installmentValue ? formatCurrency(parcelamento.installmentValue) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                                {formatCurrency(parcelamento.value)}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">
                                  {parcelamento.billingType === 'CREDIT_CARD' ? 'Cartão' :
                                   parcelamento.billingType === 'BOLETO' ? 'Boleto' :
                                   parcelamento.billingType || '-'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Aba Pedidos */}
          <TabsContent value="pedidos" className="flex-1 overflow-y-auto pr-2 mt-4">
            <div className="space-y-4">
              {!cliente.base_customer_id ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CloudOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Cliente não integrado</p>
                  <p className="text-sm">Este cliente não está integrado com o Base ERP</p>
                </div>
              ) : loadingPedidos ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                  <p className="text-lg font-medium mb-2">Carregando pedidos...</p>
                </div>
              ) : errorPedidos ? (
                <div className="p-8 text-center text-destructive">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Erro ao carregar pedidos</p>
                  <p className="text-sm">{errorPedidos}</p>
                </div>
              ) : pedidos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum pedido encontrado</p>
                  <p className="text-sm">Este cliente ainda não possui pedidos</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">
                      {totalPedidos} {totalPedidos === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
                    </p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Número</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Data</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor Total</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">NF-e</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {pedidos.map((pedido: any) => (
                            <tr
                              key={pedido.id}
                              className="hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => handlePedidoClick(String(pedido.id))}
                            >
                              <td className="px-4 py-3 text-sm font-medium">#{pedido.number || pedido.id}</td>
                              <td className="px-4 py-3 text-sm font-mono text-xs text-muted-foreground">{pedido.id}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                {pedido.issueDate ? new Date(pedido.issueDate).toLocaleDateString('pt-BR') : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium">
                                {pedido.orderValue !== undefined ? formatCurrency(pedido.orderValue) : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {pedido.invoiceNumber ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                    NF-e {pedido.invoiceNumber}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Não emitida
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Aba Atividades */}
          <TabsContent value="atividades" className="flex-1 overflow-y-auto pr-2 mt-4">
            <div className="space-y-4">
              {loadingAtividades ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                  <p className="text-lg font-medium mb-2">Carregando atividades...</p>
                </div>
              ) : errorAtividades ? (
                <div className="p-8 text-center text-destructive">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Erro ao carregar atividades</p>
                  <p className="text-sm">{errorAtividades}</p>
                </div>
              ) : atividades.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma atividade registrada</p>
                  <p className="text-sm">As atividades e eventos deste cliente aparecerão aqui</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">
                      {atividades.length} {atividades.length === 1 ? 'atividade registrada' : 'atividades registradas'}
                    </p>
                  </div>

                  {/* Timeline */}
                  <div className="relative">
                    {/* Linha vertical da timeline */}
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border"></div>

                    {/* Eventos */}
                    <div className="space-y-4">
                      {atividades.map((atividade, index) => {
                        const isFirst = index === 0;
                        const isLast = index === atividades.length - 1;

                        // Ícone e cor baseado no tipo
                        const getIcon = () => {
                          switch (atividade.tipo) {
                            case 'cobranca':
                              return <Receipt className="h-4 w-4" />;
                            case 'integracao':
                              return <Link2 className="h-4 w-4" />;
                            case 'edicao':
                              return <Edit className="h-4 w-4" />;
                            case 'notificacao':
                              return <Mail className="h-4 w-4" />;
                            default:
                              return <Activity className="h-4 w-4" />;
                          }
                        };

                        const getColor = () => {
                          switch (atividade.tipo) {
                            case 'cobranca':
                              return 'bg-green-100 text-green-600 border-green-300';
                            case 'integracao':
                              return 'bg-blue-100 text-blue-600 border-blue-300';
                            case 'edicao':
                              return 'bg-orange-100 text-orange-600 border-orange-300';
                            case 'notificacao':
                              return 'bg-purple-100 text-purple-600 border-purple-300';
                            default:
                              return 'bg-gray-100 text-gray-600 border-gray-300';
                          }
                        };

                        return (
                          <div key={atividade.id} className="relative pl-12">
                            {/* Ponto na timeline */}
                            <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${getColor()} bg-background`}></div>

                            {/* Card do evento */}
                            <div className="bg-muted/30 rounded-lg p-4 border border-border hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-md border ${getColor()}`}>
                                    {getIcon()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{atividade.descricao}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {new Date(atividade.created_at).toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {atividade.tipo}
                                </Badge>
                              </div>

                              {/* Metadados extras */}
                              {atividade.metadados && Object.keys(atividade.metadados).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {Object.entries(atividade.metadados).map(([key, value]) => (
                                      <div key={key} className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{key}:</span>
                                        <span className="font-medium">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            type="button"
            variant={cliente.ativo ? "destructive" : "default"}
            onClick={handleToggleActive}
            className="gap-2"
          >
            {cliente.ativo ? (
              <>
                <XCircle className="h-4 w-4" />
                Inativar
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Ativar
              </>
            )}
          </Button>
          <Button type="button" onClick={handleEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da Cobrança */}
      <CobrancaDetailModal
        cobranca={selectedCobranca}
        open={cobrancaModalOpen}
        onClose={handleCloseCobrancaModal}
      />

      {/* Modal de Detalhes do Pedido */}
      <PedidoDetailModal
        pedidoId={selectedPedidoId}
        open={pedidoModalOpen}
        onClose={handleClosePedidoModal}
      />
    </>
  );
}
