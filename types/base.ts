// ============================================
// TIPOS BASE ERP
// ============================================
// Tipos para integração com a API do Base ERP
// Documentação: https://docs.baseerp.com.br
// ============================================

// ============================================
// CLIENTE
// ============================================

export interface BaseAddress {
  postalCode?: string; // CEP
  address?: string; // Logradouro
  addressNumber?: string;
  complement?: string;
  province?: string; // Bairro
  cityName?: string; // Nome da cidade
  stateAbbrev?: string; // UF (2 letras)
  country?: string;
  name?: string; // Para deliveryAddress
  cpfCnpj?: string; // Para deliveryAddress
  email?: string; // Para deliveryAddress
  phone?: string; // Para deliveryAddress
}

export interface BaseTaxInformation {
  stateInscription?: string;
  municipalInscription?: string;
  typeOfTaxPayer?: string;
  finalConsumer?: boolean;
  simpleTax?: boolean;
  ruralProducer?: boolean;
}

export interface BaseCustomer {
  id?: string;
  name: string; // OBRIGATÓRIO
  email?: string;
  cpfCnpj?: string; // CPF (11 dígitos) ou CNPJ (14 dígitos)
  phone?: string;
  mobilePhone?: string;
  billingAddress?: BaseAddress; // Endereço de cobrança
  deliveryAddress?: BaseAddress; // Endereço de entrega
  taxInformation?: BaseTaxInformation; // Informações fiscais
  observations?: string;
  externalReference?: string; // Referência externa do seu sistema
  asaasCustomerId?: string; // ID do cliente no Asaas (para integração)

  // ⚠️ DEPRECATED - Manter para compatibilidade, mas usar billingAddress
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  municipalInscription?: string;
  stateInscription?: string;
}

// ============================================
// PRODUTO
// ============================================

export interface BaseProduct {
  id?: string;
  name: string; // OBRIGATÓRIO
  code?: string; // Código do produto (pode ser obrigatório)
  description?: string;
  sku?: string; // Código interno
  ncm?: string; // Código NCM
  price: number; // Preço de venda
  cost?: number; // Custo
  unit: string; // Unidade (UN, KG, MT, etc)
  inventory?: number; // Estoque atual
  minInventory?: number; // Estoque mínimo
  observations?: string;
  externalReference?: string;
}

// ============================================
// PEDIDO DE VENDA
// ============================================

export enum BaseSalesOrderStatus {
  PENDING = 'PENDING', // Pendente
  APPROVED = 'APPROVED', // Aprovado
  INVOICED = 'INVOICED', // Faturado
  CANCELLED = 'CANCELLED', // Cancelado
}

export interface BaseSalesOrderItem {
  productId?: number; // ID do produto (se cadastrado) - API espera número
  quantity: number; // Quantidade
  unitPrice: number; // Preço unitário
  costOfShipping?: number; // Custo de frete do item
  discountValue?: number; // Desconto do item
  itemValue: number; // Valor total do item
}

export interface BaseSalesOrderPayment {
  dueDate: string; // Data de vencimento (YYYY-MM-DD)
  value: number; // Valor
  billingType: string; // Tipo de cobrança (BOLETO, PIX, etc)
  bankId: number; // ID do banco
  receiptDate?: string; // Data de recebimento
  paymentId?: string; // ID do pagamento (gerado pela API)
}

export interface BaseSalesOrder {
  id?: number;
  number: number; // Número do pedido OBRIGATÓRIO - deve ser inteiro
  customerId: number; // ID do cliente OBRIGATÓRIO - API espera número
  issueDate: string; // Data de emissão OBRIGATÓRIO (YYYY-MM-DD)
  status?: BaseSalesOrderStatus;
  typeOfShipping?: string; // Tipo de frete
  shippingCompanyId?: number; // ID da transportadora
  costOfShipping?: number; // Valor do frete
  discountValue?: number; // Desconto total
  orderItems: BaseSalesOrderItem[]; // Itens do pedido OBRIGATÓRIO
  orderPayments?: BaseSalesOrderPayment[]; // Pagamentos do pedido OBRIGATÓRIO
  observations?: string;
  externalReference?: string; // Referência externa

  // Campos calculados (retornados pela API)
  itemsValue?: number; // Valor total dos itens
  orderValue?: number; // Valor total do pedido

  // Dados para emissão de NF-e
  invoiceNumber?: string; // Número da nota fiscal
  invoiceId?: number; // ID da nota fiscal
  invoiceKey?: string; // Chave de acesso da NF-e
  invoiceDate?: string; // Data de emissão da NF-e
  invoiceStatus?: string; // Status da NF-e
}

// ============================================
// TRANSPORTADORA
// ============================================

export interface BaseCarrier {
  id?: string;
  name: string; // OBRIGATÓRIO
  cnpj?: string;
  phone?: string;
  email?: string;
  observations?: string;
  externalReference?: string;
}

// ============================================
// BANCO
// ============================================

export interface BaseBank {
  id: string;
  code: string; // Código do banco (ex: 001, 237)
  name: string; // Nome do banco
}

// ============================================
// WEBHOOK
// ============================================

export enum BaseWebhookEvent {
  SALES_ORDER_CREATED = 'SALES_ORDER_CREATED',
  SALES_ORDER_UPDATED = 'SALES_ORDER_UPDATED',
  SALES_ORDER_DELETED = 'SALES_ORDER_DELETED',
  SALES_ORDER_INVOICED = 'SALES_ORDER_INVOICED',
  SALES_ORDER_CANCELLED = 'SALES_ORDER_CANCELLED',
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  CUSTOMER_DELETED = 'CUSTOMER_DELETED',
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
}

export interface BaseWebhook {
  id?: string;
  name: string; // Nome do webhook
  url: string; // URL que receberá os eventos
  events: BaseWebhookEvent[]; // Eventos que irão disparar o webhook
  enabled?: boolean; // Webhook ativo/inativo
  authToken?: string; // Token de autenticação (opcional)
}

export interface BaseWebhookPayload {
  event: BaseWebhookEvent;
  data: any; // Dados do evento (varia conforme o tipo)
  timestamp: string; // Data/hora do evento
}

// ============================================
// RESPOSTA PADRÃO DA API
// ============================================

export interface BaseResponse<T = any> {
  data?: T;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  pagination?: {
    totalCount: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================
// PARÂMETROS DE LISTAGEM
// ============================================

export interface BaseListParams {
  limit?: number; // Limite de registros (default: 20, max: 100)
  offset?: number; // Offset para paginação
  page?: number; // Número da página (zero-based)
  search?: string; // Busca por texto
  externalReference?: string; // Filtrar por referência externa
}
