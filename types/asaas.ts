// ============================================
// TIPOS ASAAS
// ============================================
// Tipos para integração com a API do Asaas
// Documentação: https://docs.asaas.com/reference
// ============================================

export enum AsaasPaymentStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  CONFIRMED = 'CONFIRMED',
  OVERDUE = 'OVERDUE',
  REFUNDED = 'REFUNDED',
  RECEIVED_IN_CASH = 'RECEIVED_IN_CASH',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  CHARGEBACK_REQUESTED = 'CHARGEBACK_REQUESTED',
  CHARGEBACK_DISPUTE = 'CHARGEBACK_DISPUTE',
  AWAITING_CHARGEBACK_REVERSAL = 'AWAITING_CHARGEBACK_REVERSAL',
  DUNNING_REQUESTED = 'DUNNING_REQUESTED',
  DUNNING_RECEIVED = 'DUNNING_RECEIVED',
  AWAITING_RISK_ANALYSIS = 'AWAITING_RISK_ANALYSIS',
}

export enum AsaasBillingType {
  BOLETO = 'BOLETO',
  CREDIT_CARD = 'CREDIT_CARD',
  PIX = 'PIX',
  DEBIT_CARD = 'DEBIT_CARD',
  UNDEFINED = 'UNDEFINED',
}

export enum AsaasWebhookEvent {
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_UPDATED = 'PAYMENT_UPDATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  PAYMENT_DELETED = 'PAYMENT_DELETED',
  PAYMENT_RESTORED = 'PAYMENT_RESTORED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_RECEIVED_IN_CASH_UNDONE = 'PAYMENT_RECEIVED_IN_CASH_UNDONE',
  PAYMENT_CHARGEBACK_REQUESTED = 'PAYMENT_CHARGEBACK_REQUESTED',
  PAYMENT_CHARGEBACK_DISPUTE = 'PAYMENT_CHARGEBACK_DISPUTE',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL = 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  PAYMENT_DUNNING_RECEIVED = 'PAYMENT_DUNNING_RECEIVED',
  PAYMENT_DUNNING_REQUESTED = 'PAYMENT_DUNNING_REQUESTED',
  PAYMENT_BANK_SLIP_VIEWED = 'PAYMENT_BANK_SLIP_VIEWED',
  PAYMENT_CHECKOUT_VIEWED = 'PAYMENT_CHECKOUT_VIEWED',
}

// Cliente Asaas
export interface AsaasCustomer {
  id?: string;
  name: string; // OBRIGATÓRIO
  email?: string;
  phone?: string; // Telefone fixo
  mobilePhone?: string; // Celular
  cpfCnpj?: string; // CPF (11 dígitos) ou CNPJ (14 dígitos)
  postalCode?: string; // CEP - Se informar, não precisa enviar city, province e address
  address?: string; // Logradouro
  addressNumber?: string; // Número
  complement?: string; // Complemento
  province?: string; // Bairro
  city?: string; // Cidade (não precisa se enviar postalCode)
  state?: string; // UF (2 letras)
  externalReference?: string; // Referência externa do seu sistema
  notificationDisabled?: boolean; // Desabilitar notificações
  additionalEmails?: string; // Emails adicionais (separados por vírgula)
  municipalInscription?: string; // Inscrição municipal
  stateInscription?: string; // Inscrição estadual
  observations?: string; // Observações
  groupName?: string; // Nome do grupo
}

// Cobrança Asaas
export interface AsaasPayment {
  id?: string;
  customer: string; // ID do cliente
  billingType: AsaasBillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value?: number;
    dueDateLimitDays?: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  interest?: {
    value: number;
  };
  fine?: {
    value: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  postalService?: boolean;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>;
  callback?: {
    successUrl: string;
    autoRedirect?: boolean;
  };
}

// Response de criação de cobrança
export interface AsaasPaymentResponse extends AsaasPayment {
  id: string;
  status: AsaasPaymentStatus;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  invoiceNumber?: string;
  pixTransaction?: {
    payload: string;
    qrCode: {
      encodedImage: string;
      payload: string;
    };
    expirationDate: string;
  };
  creditCard?: {
    creditCardNumber: string;
    creditCardBrand: string;
    creditCardToken: string;
  };
  netValue?: number;
  nossoNumero?: string;
  confirmedDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  installment?: string;
  transactionReceiptUrl?: string;
  deleted?: boolean;
  anticipated?: boolean;
  anticipable?: boolean;
}

// Webhook Asaas Payload
export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  payment: AsaasPaymentResponse;
}

// Resposta padrão Asaas
export interface AsaasResponse<T = any> {
  data?: T;
  errors?: Array<{
    code: string;
    description: string;
  }>;
  hasMore?: boolean;
  totalCount?: number;
  limit?: number;
  offset?: number;
}
