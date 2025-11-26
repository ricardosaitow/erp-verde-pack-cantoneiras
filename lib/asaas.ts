// ============================================
// CLIENTE ASAAS
// ============================================
// Cliente para integração com API Asaas
// Documentação: https://docs.asaas.com/reference
// ============================================

import type {
  AsaasCustomer,
  AsaasPayment,
  AsaasPaymentResponse,
  AsaasResponse,
} from '../types/asaas';

// Usar Edge Function proxy ao invés da API direta (evita CORS)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const ASAAS_PROXY_URL = `${SUPABASE_URL}/functions/v1/asaas-proxy`;

export class AsaasClient {
  private proxyUrl: string;
  private supabaseKey: string;

  constructor() {
    this.proxyUrl = ASAAS_PROXY_URL;
    this.supabaseKey = SUPABASE_ANON_KEY;

    if (!this.supabaseKey) {
      console.warn('ASAAS: Supabase Key não configurada');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<AsaasResponse<T>> {
    // Chamar Edge Function proxy
    console.log('🟢 asaasClient.request - Chamando proxy:', {
      url: this.proxyUrl,
      endpoint,
      method: options.method || 'GET',
      data: options.body ? JSON.parse(options.body as string) : undefined
    });

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseKey}`,
      },
      body: JSON.stringify({
        endpoint,
        method: options.method || 'GET',
        data: options.body ? JSON.parse(options.body as string) : undefined,
      }),
    });

    console.log('🟢 asaasClient.request - Status da resposta:', response.status, response.statusText);
    const data = await response.json();
    console.log('🟢 asaasClient.request - Dados retornados:', data);

    if (!response.ok) {
      console.error('❌ ASAAS Error:', data);
      throw new Error(
        data.errors?.[0]?.description || data.error || `Erro na requisição: ${response.status}`
      );
    }

    return data;
  }

  // ============================================
  // CLIENTES
  // ============================================

  async createCustomer(customer: AsaasCustomer): Promise<AsaasResponse<AsaasCustomer>> {
    return this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async getCustomer(customerId: string): Promise<AsaasResponse<AsaasCustomer>> {
    return this.request<AsaasCustomer>(`/customers/${customerId}`, {
      method: 'GET',
    });
  }

  async updateCustomer(
    customerId: string,
    customer: Partial<AsaasCustomer>
  ): Promise<AsaasResponse<AsaasCustomer>> {
    return this.request<AsaasCustomer>(`/customers/${customerId}`, {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async deleteCustomer(customerId: string): Promise<AsaasResponse<void>> {
    console.log('🗑️ ASAAS DELETE - Customer ID:', customerId);
    console.log('🗑️ ASAAS DELETE - Endpoint:', `/customers/${customerId}`);
    console.log('🗑️ ASAAS DELETE - Method:', 'DELETE');

    const response = await this.request<void>(`/customers/${customerId}`, {
      method: 'DELETE',
    });

    console.log('🗑️ ASAAS DELETE - Resposta completa:', JSON.stringify(response, null, 2));

    return response;
  }

  async listCustomers(params?: {
    name?: string;
    email?: string;
    cpfCnpj?: string;
    groupName?: string;
    externalReference?: string;
    offset?: number;
    limit?: number;
  }): Promise<AsaasResponse<AsaasCustomer[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request<AsaasCustomer[]>(`/customers?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  // ============================================
  // COBRANÇAS
  // ============================================

  async createPayment(payment: AsaasPayment): Promise<AsaasResponse<AsaasPaymentResponse>> {
    return this.request<AsaasPaymentResponse>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async getPayment(paymentId: string): Promise<AsaasResponse<AsaasPaymentResponse>> {
    return this.request<AsaasPaymentResponse>(`/payments/${paymentId}`, {
      method: 'GET',
    });
  }

  async updatePayment(
    paymentId: string,
    payment: Partial<AsaasPayment>
  ): Promise<AsaasResponse<AsaasPaymentResponse>> {
    return this.request<AsaasPaymentResponse>(`/payments/${paymentId}`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async deletePayment(paymentId: string): Promise<AsaasResponse<void>> {
    return this.request<void>(`/payments/${paymentId}`, {
      method: 'DELETE',
    });
  }

  async restorePayment(paymentId: string): Promise<AsaasResponse<AsaasPaymentResponse>> {
    return this.request<AsaasPaymentResponse>(`/payments/${paymentId}/restore`, {
      method: 'POST',
    });
  }

  async refundPayment(paymentId: string, value?: number): Promise<AsaasResponse<AsaasPaymentResponse>> {
    return this.request<AsaasPaymentResponse>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  }

  async receiveInCash(
    paymentId: string,
    data: {
      paymentDate: string;
      value?: number;
      notifyCustomer?: boolean;
    }
  ): Promise<AsaasResponse<AsaasPaymentResponse>> {
    return this.request<AsaasPaymentResponse>(`/payments/${paymentId}/receiveInCash`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async undoReceivedInCash(paymentId: string): Promise<AsaasResponse<AsaasPaymentResponse>> {
    return this.request<AsaasPaymentResponse>(`/payments/${paymentId}/undoReceivedInCash`, {
      method: 'POST',
    });
  }

  async listPayments(params?: {
    customer?: string;
    billingType?: string;
    status?: string;
    subscription?: string;
    installment?: string;
    externalReference?: string;
    paymentDate?: string;
    estimatedCreditDate?: string;
    pixQrCodeId?: string;
    anticipated?: boolean;
    'dateCreated[ge]'?: string;
    'dateCreated[le]'?: string;
    'paymentDate[ge]'?: string;
    'paymentDate[le]'?: string;
    'estimatedCreditDate[ge]'?: string;
    'estimatedCreditDate[le]'?: string;
    'dueDate[ge]'?: string;
    'dueDate[le]'?: string;
    offset?: number;
    limit?: number;
  }): Promise<AsaasResponse<AsaasPaymentResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request<AsaasPaymentResponse[]>(`/payments?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  // ============================================
  // PIX QR CODE
  // ============================================

  async getPixQrCode(paymentId: string): Promise<AsaasResponse<{
    encodedImage: string;
    payload: string;
    expirationDate: string;
  }>> {
    return this.request(`/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
    });
  }

  // ============================================
  // BOLETO
  // ============================================

  async getBankSlip(paymentId: string): Promise<AsaasResponse<{
    identificationField: string;
    nossoNumero: string;
    barCode: string;
    bankSlipUrl: string;
  }>> {
    return this.request(`/payments/${paymentId}/identificationField`, {
      method: 'GET',
    });
  }

  // ============================================
  // NOTIFICAÇÕES
  // ============================================

  async getPaymentNotifications(paymentId: string): Promise<AsaasResponse<Array<{
    id: string;
    enabled: boolean;
    emailEnabledForProvider: boolean;
    smsEnabledForProvider: boolean;
    phoneCallEnabledForProvider: boolean;
    whatsappEnabledForProvider: boolean;
    scheduleOffset: number;
    event: string;
  }>>> {
    return this.request(`/payments/${paymentId}/notifications`, {
      method: 'GET',
    });
  }

  // ============================================
  // ASSINATURAS (SUBSCRIPTIONS)
  // ============================================

  async listSubscriptions(params?: {
    customer?: string;
    billingType?: string;
    status?: string;
    deletedOnly?: boolean;
    includeDeleted?: boolean;
    externalReference?: string;
    offset?: number;
    limit?: number;
  }): Promise<AsaasResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request<any[]>(`/subscriptions?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  async getSubscription(subscriptionId: string): Promise<AsaasResponse<any>> {
    return this.request<any>(`/subscriptions/${subscriptionId}`, {
      method: 'GET',
    });
  }

  // ============================================
  // PARCELAMENTOS (INSTALLMENTS)
  // ============================================

  async listInstallments(params?: {
    customer?: string;
    billingType?: string;
    status?: string;
    externalReference?: string;
    offset?: number;
    limit?: number;
  }): Promise<AsaasResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request<any[]>(`/installments?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  async getInstallment(installmentId: string): Promise<AsaasResponse<any>> {
    return this.request<any>(`/installments/${installmentId}`, {
      method: 'GET',
    });
  }
}

// Singleton
export const asaasClient = new AsaasClient();
