// ============================================
// TIPOS DE INTEGRAÇÃO BASE + ASAAS
// ============================================
// Estrutura unificada para gerenciar dados
// das duas plataformas de forma sincronizada
// ============================================

import { BaseCustomer, BaseSalesOrder, BaseProduct } from './base';
import { AsaasCustomer, AsaasPayment, AsaasPaymentResponse, AsaasPaymentStatus, AsaasBillingType } from './asaas';

// ============================================
// CLIENTE UNIFICADO
// ============================================

export interface ClienteIntegrado {
  // Dados locais (nosso sistema)
  id: string; // ID interno do nosso banco

  // IDs externos
  baseId?: string; // ID do cliente no Base ERP
  asaasId?: string; // ID do cliente no Asaas

  // Dados básicos (comuns entre Base e Asaas)
  nome: string;
  cpfCnpj?: string;
  email?: string;
  telefone?: string;
  celular?: string;

  // Endereço
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;

  // Dados fiscais (apenas Base)
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;

  // Controle de sincronização
  sincronizadoBase: boolean;
  sincronizadoAsaas: boolean;
  ultimaSincronizacao?: Date;

  // Observações
  observacoes?: string;

  // Metadados
  criadoEm: Date;
  atualizadoEm: Date;
}

// ============================================
// PEDIDO + COBRANÇA UNIFICADO
// ============================================

export enum StatusPedidoIntegrado {
  // Estágios do pedido
  ORCAMENTO = 'ORCAMENTO', // Apenas orçamento, não confirmado
  PEDIDO_CRIADO = 'PEDIDO_CRIADO', // Pedido confirmado, aguardando pagamento
  AGUARDANDO_PAGAMENTO = 'AGUARDANDO_PAGAMENTO', // Cobrança criada no Asaas
  PAGAMENTO_CONFIRMADO = 'PAGAMENTO_CONFIRMADO', // Asaas confirmou pagamento
  EM_PRODUCAO = 'EM_PRODUCAO', // Pedido em produção
  AGUARDANDO_NF = 'AGUARDANDO_NF', // Aguardando emissão de NF-e
  FATURADO = 'FATURADO', // NF-e emitida no Base
  ENVIADO = 'ENVIADO', // Produto enviado ao cliente
  ENTREGUE = 'ENTREGUE', // Entrega confirmada
  CANCELADO = 'CANCELADO', // Pedido cancelado
  ATRASADO = 'ATRASADO', // Pagamento atrasado (Asaas OVERDUE)
}

export interface ItemPedidoIntegrado {
  produtoId?: string; // ID do produto no nosso banco
  baseProdutoId?: string; // ID do produto no Base
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  desconto?: number;
  valorTotal: number;
}

export interface PedidoIntegrado {
  // Dados locais
  id: string; // ID interno do nosso banco

  // IDs externos
  basePedidoId?: string; // ID do pedido no Base ERP
  asaasCobrancaId?: string; // ID da cobrança no Asaas

  // Cliente
  clienteId: string; // ID do cliente no nosso banco
  clienteBaseId?: string; // ID do cliente no Base
  clienteAsaasId?: string; // ID do cliente no Asaas

  // Dados do pedido
  status: StatusPedidoIntegrado;
  dataPedido: Date;
  dataEntregaPrevista?: Date;

  // Itens
  itens: ItemPedidoIntegrado[];

  // Valores
  subtotal: number; // Soma dos itens
  desconto?: number; // Desconto total
  frete?: number; // Valor do frete
  valorTotal: number; // Valor final

  // Pagamento (Asaas)
  formaPagamento?: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
  statusPagamento?: AsaasPaymentStatus;
  dataVencimento?: Date;
  dataPagamento?: Date;
  linkPagamento?: string; // Link do boleto/PIX
  qrCodePix?: string; // QR Code PIX

  // Nota Fiscal (Base)
  numeroNF?: string;
  chaveNF?: string;
  dataEmissaoNF?: Date;
  linkNF?: string;

  // Observações
  observacoes?: string;

  // Controle de sincronização
  sincronizadoBase: boolean;
  sincronizadoAsaas: boolean;
  ultimaSincronizacaoBase?: Date;
  ultimaSincronizacaoAsaas?: Date;

  // Metadados
  criadoEm: Date;
  atualizadoEm: Date;
}

// ============================================
// HELPERS DE CONVERSÃO
// ============================================

/**
 * Converte cliente local para formato Base ERP
 */
export function clienteParaBase(cliente: ClienteIntegrado): Partial<BaseCustomer> {
  return {
    id: cliente.baseId,
    name: cliente.nome,
    cpfCnpj: cliente.cpfCnpj,
    email: cliente.email,
    phone: cliente.telefone,
    mobilePhone: cliente.celular,
    postalCode: cliente.cep,
    address: cliente.endereco,
    addressNumber: cliente.numero,
    complement: cliente.complemento,
    province: cliente.bairro,
    city: cliente.cidade,
    state: cliente.uf,
    municipalInscription: cliente.inscricaoMunicipal,
    stateInscription: cliente.inscricaoEstadual,
    observations: cliente.observacoes,
    externalReference: cliente.id, // Nosso ID como referência
    asaasCustomerId: cliente.asaasId, // Guardar ID do Asaas
  };
}

/**
 * Converte cliente local para formato Asaas
 */
export function clienteParaAsaas(cliente: ClienteIntegrado): Partial<AsaasCustomer> {
  return {
    id: cliente.asaasId,
    name: cliente.nome,
    cpfCnpj: cliente.cpfCnpj,
    email: cliente.email,
    phone: cliente.telefone,
    mobilePhone: cliente.celular,
    postalCode: cliente.cep,
    address: cliente.endereco,
    addressNumber: cliente.numero,
    complement: cliente.complemento,
    province: cliente.bairro,
    city: cliente.cidade,
    municipalInscription: cliente.inscricaoMunicipal,
    stateInscription: cliente.inscricaoEstadual,
    observations: cliente.observacoes,
    externalReference: cliente.id, // Nosso ID como referência
  };
}

/**
 * Converte pedido local para formato Base ERP
 */
export function pedidoParaBase(pedido: PedidoIntegrado): Partial<BaseSalesOrder> {
  return {
    id: pedido.basePedidoId ? Number(pedido.basePedidoId) : undefined,
    customerId: pedido.clienteBaseId ? Number(pedido.clienteBaseId) : undefined!, // Cliente deve estar cadastrado no Base
    issueDate: pedido.dataPedido.toISOString().split('T')[0],
    orderItems: pedido.itens.map(item => ({
      productId: item.baseProdutoId ? Number(item.baseProdutoId) : undefined,
      quantity: item.quantidade,
      unitPrice: item.precoUnitario,
      discountValue: item.desconto || 0,
      itemValue: item.valorTotal,
    })),
    discountValue: pedido.desconto,
    costOfShipping: pedido.frete,
    observations: pedido.observacoes,
    externalReference: pedido.id, // Nosso ID como referência
  };
}

/**
 * Converte pedido local para cobrança Asaas
 */
export function pedidoParaAsaasCobranca(pedido: PedidoIntegrado): Partial<AsaasPayment> {
  return {
    id: pedido.asaasCobrancaId,
    customer: pedido.clienteAsaasId!, // Cliente deve estar cadastrado no Asaas
    billingType: (pedido.formaPagamento || 'BOLETO') as AsaasBillingType,
    value: pedido.valorTotal,
    dueDate: pedido.dataVencimento?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    description: `Pedido #${pedido.id} - ${pedido.itens.length} item(ns)`,
    externalReference: pedido.id, // Nosso ID como referência
  };
}

/**
 * Mapeia status do Asaas para status do pedido integrado
 */
export function statusAsaasParaPedido(statusAsaas: AsaasPaymentStatus): StatusPedidoIntegrado {
  const mapa: Record<AsaasPaymentStatus, StatusPedidoIntegrado> = {
    PENDING: StatusPedidoIntegrado.AGUARDANDO_PAGAMENTO,
    CONFIRMED: StatusPedidoIntegrado.PAGAMENTO_CONFIRMADO,
    RECEIVED: StatusPedidoIntegrado.PAGAMENTO_CONFIRMADO,
    RECEIVED_IN_CASH: StatusPedidoIntegrado.PAGAMENTO_CONFIRMADO,
    OVERDUE: StatusPedidoIntegrado.ATRASADO,
    REFUNDED: StatusPedidoIntegrado.CANCELADO,
    REFUND_REQUESTED: StatusPedidoIntegrado.CANCELADO,
    CHARGEBACK_REQUESTED: StatusPedidoIntegrado.CANCELADO,
    CHARGEBACK_DISPUTE: StatusPedidoIntegrado.AGUARDANDO_PAGAMENTO,
    AWAITING_CHARGEBACK_REVERSAL: StatusPedidoIntegrado.AGUARDANDO_PAGAMENTO,
    DUNNING_REQUESTED: StatusPedidoIntegrado.ATRASADO,
    DUNNING_RECEIVED: StatusPedidoIntegrado.PAGAMENTO_CONFIRMADO,
    AWAITING_RISK_ANALYSIS: StatusPedidoIntegrado.AGUARDANDO_PAGAMENTO,
  };

  return mapa[statusAsaas] || StatusPedidoIntegrado.AGUARDANDO_PAGAMENTO;
}

// ============================================
// EVENTOS DE SINCRONIZAÇÃO
// ============================================

export interface EventoSincronizacao {
  id: string;
  tipo: 'CLIENTE' | 'PEDIDO' | 'PAGAMENTO' | 'NOTA_FISCAL';
  acao: 'CRIAR' | 'ATUALIZAR' | 'DELETAR' | 'SINCRONIZAR';
  origem: 'BASE' | 'ASAAS' | 'SISTEMA';
  entidadeId: string; // ID da entidade afetada
  dados: any; // Dados do evento
  sucesso: boolean;
  erro?: string;
  timestamp: Date;
}
