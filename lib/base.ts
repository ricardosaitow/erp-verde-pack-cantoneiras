// ============================================
// CLIENTE BASE ERP
// ============================================
// Cliente para integração com API Base ERP
// Documentação: https://docs.baseerp.com.br
// ============================================

import type {
  BaseCustomer,
  BaseProduct,
  BaseSalesOrder,
  BaseCarrier,
  BaseBank,
  BaseWebhook,
  BaseResponse,
  BaseListParams,
} from '../types/base';

// Usar Edge Function proxy ao invés da API direta (evita CORS e protege API Key)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const BASE_PROXY_URL = `${SUPABASE_URL}/functions/v1/base-proxy`;

export class BaseClient {
  private proxyUrl: string;
  private supabaseKey: string;

  constructor() {
    this.proxyUrl = BASE_PROXY_URL;
    this.supabaseKey = SUPABASE_ANON_KEY;

    if (!this.supabaseKey) {
      console.warn('BASE: Supabase Key não configurada');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BaseResponse<T>> {
    const requestData = options.body ? JSON.parse(options.body as string) : undefined;

    console.log(`📤 BASE API: ${options.method || 'GET'} ${endpoint}`);
    console.log('📦 Payload completo:', JSON.stringify(requestData, null, 2));

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseKey}`,
      },
      body: JSON.stringify({
        endpoint,
        method: options.method || 'GET',
        data: requestData,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ BASE API ERRO:');
      console.error('   Status:', response.status, response.statusText);
      console.error('   Mensagem:', data.error || data.errors?.[0]?.message || 'Sem mensagem');
      console.error('   Detalhes completos:', JSON.stringify(data, null, 2));

      // Tentar extrair mensagem de erro
      let errorMessage = 'Erro na API do Base';

      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        errorMessage = data.errors[0].message || data.errors[0].description || errorMessage;
      } else if (data.error) {
        errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data.message) {
        errorMessage = data.message;
      }

      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }

    return data;
  }

  // ============================================
  // CLIENTES
  // ============================================

  async createCustomer(customer: BaseCustomer): Promise<BaseResponse<BaseCustomer>> {
    return this.request<BaseCustomer>('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async getCustomer(customerId: string): Promise<BaseResponse<BaseCustomer>> {
    return this.request<BaseCustomer>(`/api/v1/customers/${customerId}`, {
      method: 'GET',
    });
  }

  async updateCustomer(
    customerId: string,
    customer: Partial<BaseCustomer>
  ): Promise<BaseResponse<BaseCustomer>> {
    return this.request<BaseCustomer>(`/api/v1/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  }

  async deleteCustomer(customerId: string): Promise<BaseResponse<void>> {
    console.log('🗑️ BASE DELETE - Customer ID:', customerId);
    console.log('🗑️ BASE DELETE - Endpoint:', `/api/v1/customers/${customerId}`);
    console.log('🗑️ BASE DELETE - Method:', 'DELETE');

    const response = await this.request<void>(`/api/v1/customers/${customerId}`, {
      method: 'DELETE',
    });

    console.log('🗑️ BASE DELETE - Resposta completa:', JSON.stringify(response, null, 2));

    return response;
  }

  async restoreCustomer(customerId: string): Promise<BaseResponse<BaseCustomer>> {
    return this.request<BaseCustomer>(`/api/v1/customers/${customerId}/restore`, {
      method: 'POST',
    });
  }

  async listCustomers(params?: BaseListParams): Promise<BaseResponse<BaseCustomer[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request<BaseCustomer[]>(`/api/v1/customers?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  // ============================================
  // PRODUTOS
  // ============================================

  async createProduct(product: BaseProduct): Promise<BaseResponse<BaseProduct>> {
    return this.request<BaseProduct>('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async getProduct(productId: string): Promise<BaseResponse<BaseProduct>> {
    return this.request<BaseProduct>(`/api/v1/products/${productId}`, {
      method: 'GET',
    });
  }

  async updateProduct(
    productId: string,
    product: Partial<BaseProduct>
  ): Promise<BaseResponse<BaseProduct>> {
    return this.request<BaseProduct>(`/api/v1/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(productId: string): Promise<BaseResponse<void>> {
    return this.request<void>(`/api/v1/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async restoreProduct(productId: string): Promise<BaseResponse<BaseProduct>> {
    return this.request<BaseProduct>(`/api/v1/products/${productId}/restore`, {
      method: 'POST',
    });
  }

  async listProducts(params?: BaseListParams): Promise<BaseResponse<BaseProduct[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request<BaseProduct[]>(`/api/v1/products?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  // ============================================
  // PEDIDOS DE VENDA
  // ============================================

  async createSalesOrder(order: BaseSalesOrder): Promise<BaseResponse<BaseSalesOrder>> {
    return this.request<BaseSalesOrder>('/api/v1/salesOrders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async getSalesOrder(orderId: string): Promise<BaseResponse<BaseSalesOrder>> {
    return this.request<BaseSalesOrder>(`/api/v1/salesOrders/${orderId}`, {
      method: 'GET',
    });
  }

  async updateSalesOrder(
    orderId: string,
    order: Partial<BaseSalesOrder>
  ): Promise<BaseResponse<BaseSalesOrder>> {
    return this.request<BaseSalesOrder>(`/api/v1/salesOrders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    });
  }

  async deleteSalesOrder(orderId: string): Promise<BaseResponse<void>> {
    return this.request<void>(`/api/v1/salesOrders/${orderId}`, {
      method: 'DELETE',
    });
  }

  async listSalesOrders(params?: BaseListParams): Promise<BaseResponse<BaseSalesOrder[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request<BaseSalesOrder[]>(`/api/v1/salesOrders?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  // Buscar próximo número de pedido disponível
  async getNextOrderNumber(): Promise<number> {
    try {
      // Buscar última página para pegar os pedidos mais recentes (maiores números)
      const firstResponse = await this.request<any>('/api/v1/salesOrders?limit=10', {
        method: 'GET',
      });

      const totalPages = firstResponse.data?.totalPages || 1;
      const totalElements = firstResponse.data?.totalElements || 0;

      console.log(`📊 Total de pedidos: ${totalElements}, páginas: ${totalPages}`);

      // Ir para a última página onde estão os maiores números
      const lastPage = totalPages - 1; // API usa zero-based
      const lastPageResponse = await this.request<any>(`/api/v1/salesOrders?limit=10&page=${lastPage}`, {
        method: 'GET',
      });

      const orders = lastPageResponse.data?.content || lastPageResponse.data || [];

      if (Array.isArray(orders) && orders.length > 0) {
        const allNumbers = orders.map((o: any) => o.number || 0);
        const maxNumber = Math.max(...allNumbers);
        console.log(`📊 Maior número na última página: ${maxNumber}, próximo: ${maxNumber + 1}`);
        return maxNumber + 1;
      }

      // Fallback: usar totalElements + buffer
      console.log(`📊 Usando totalElements como fallback: ${totalElements + 1}`);
      return totalElements + 1;
    } catch (error) {
      console.error('Erro ao buscar próximo número:', error);
      return Math.floor(Date.now() / 1000) % 1000000;
    }
  }

  // Emissão de NF-e
  async invoiceSalesOrder(orderId: string): Promise<BaseResponse<BaseSalesOrder>> {
    return this.request<BaseSalesOrder>(`/api/v1/salesOrders/${orderId}/invoice`, {
      method: 'POST',
    });
  }

  async cancelInvoice(orderId: string, reason: string): Promise<BaseResponse<BaseSalesOrder>> {
    return this.request<BaseSalesOrder>(`/api/v1/salesOrders/${orderId}/cancelInvoice`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Download do PDF da NF-e via proxy (retorna base64)
  // Usa o invoiceId, não o salesOrderId
  async downloadInvoicePdf(invoiceId: string): Promise<{ base64: string; fileName: string }> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseKey}`,
      },
      body: JSON.stringify({
        endpoint: `/api/v1/invoices/${invoiceId}/pdf`,
        method: 'GET',
        responseType: 'pdf',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.data?.base64) {
      throw new Error(data.error || 'Erro ao baixar PDF');
    }

    return {
      base64: data.data.base64,
      fileName: `nfe-${invoiceId}.pdf`,
    };
  }

  // Download do XML da NF-e via proxy (retorna base64)
  // Usa o invoiceId, não o salesOrderId
  async downloadInvoiceXml(invoiceId: string): Promise<{ base64: string; fileName: string }> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseKey}`,
      },
      body: JSON.stringify({
        endpoint: `/api/v1/invoices/${invoiceId}/xml`,
        method: 'GET',
        responseType: 'xml',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.data?.base64) {
      throw new Error(data.error || 'Erro ao baixar XML');
    }

    return {
      base64: data.data.base64,
      fileName: `nfe-${invoiceId}.xml`,
    };
  }

  // Buscar detalhes do pedido (inclui URLs de NF-e)
  async getSalesOrderDetails(orderId: string): Promise<BaseResponse<any>> {
    return this.request<any>(`/api/v1/salesOrders/${orderId}`, {
      method: 'GET',
    });
  }

  // ============================================
  // TRANSPORTADORAS
  // ============================================

  async createCarrier(carrier: BaseCarrier): Promise<BaseResponse<BaseCarrier>> {
    return this.request<BaseCarrier>('/api/v1/carriers', {
      method: 'POST',
      body: JSON.stringify(carrier),
    });
  }

  async getCarrier(carrierId: string): Promise<BaseResponse<BaseCarrier>> {
    return this.request<BaseCarrier>(`/api/v1/carriers/${carrierId}`, {
      method: 'GET',
    });
  }

  async updateCarrier(
    carrierId: string,
    carrier: Partial<BaseCarrier>
  ): Promise<BaseResponse<BaseCarrier>> {
    return this.request<BaseCarrier>(`/api/v1/carriers/${carrierId}`, {
      method: 'PUT',
      body: JSON.stringify(carrier),
    });
  }

  async deleteCarrier(carrierId: string): Promise<BaseResponse<void>> {
    return this.request<void>(`/api/v1/carriers/${carrierId}`, {
      method: 'DELETE',
    });
  }

  async listCarriers(params?: BaseListParams): Promise<BaseResponse<BaseCarrier[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request<BaseCarrier[]>(`/api/v1/carriers?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  // ============================================
  // BANCOS
  // ============================================

  async listBanks(): Promise<BaseResponse<BaseBank[]>> {
    return this.request<BaseBank[]>('/api/v1/banks', {
      method: 'GET',
    });
  }

  async getBank(bankId: string): Promise<BaseResponse<BaseBank>> {
    return this.request<BaseBank>(`/api/v1/banks/${bankId}`, {
      method: 'GET',
    });
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  async createWebhook(webhook: BaseWebhook): Promise<BaseResponse<BaseWebhook>> {
    return this.request<BaseWebhook>('/api/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook),
    });
  }

  async getWebhook(webhookId: string): Promise<BaseResponse<BaseWebhook>> {
    return this.request<BaseWebhook>(`/api/v1/webhooks/${webhookId}`, {
      method: 'GET',
    });
  }

  async updateWebhook(
    webhookId: string,
    webhook: Partial<BaseWebhook>
  ): Promise<BaseResponse<BaseWebhook>> {
    return this.request<BaseWebhook>(`/api/v1/webhooks/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify(webhook),
    });
  }

  async deleteWebhook(webhookId: string): Promise<BaseResponse<void>> {
    return this.request<void>(`/api/v1/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  async listWebhooks(params?: BaseListParams): Promise<BaseResponse<BaseWebhook[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request<BaseWebhook[]>(`/api/v1/webhooks?${queryParams.toString()}`, {
      method: 'GET',
    });
  }
}

// Singleton
export const baseClient = new BaseClient();
