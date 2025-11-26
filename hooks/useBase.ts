// ============================================
// HOOK: useBase
// ============================================
// Hook React para integração com Base ERP
// ============================================

import { useState, useCallback } from 'react';
import { baseClient } from '../lib/base';
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
import { toast } from 'sonner';

export function useBase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // CLIENTES
  // ============================================

  const createCustomer = useCallback(async (customer: BaseCustomer) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.createCustomer(customer);

      if (!response.data) {
        throw new Error('Base retornou resposta vazia');
      }

      toast.success('Cliente criado no Base');
      return response;
    } catch (err: any) {
      console.error('❌ Erro no useBase.createCustomer:', err);
      setError(err.message);
      toast.error('Erro ao criar cliente no Base: ' + err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCustomer = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.getCustomer(customerId);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao buscar cliente no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCustomer = useCallback(async (customerId: string, customer: Partial<BaseCustomer>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.updateCustomer(customerId, customer);
      toast.success('Cliente atualizado no Base');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao atualizar cliente no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCustomer = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      await baseClient.deleteCustomer(customerId);
      toast.success('Cliente excluído do Base');
      return { error: null };
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao excluir cliente do Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreCustomer = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      await baseClient.restoreCustomer(customerId);
      toast.success('Cliente restaurado no Base');
      return { error: null };
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao restaurar cliente no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listCustomers = useCallback(async (params?: BaseListParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.listCustomers(params);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao listar clientes no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // PRODUTOS
  // ============================================

  const createProduct = useCallback(async (product: BaseProduct) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.createProduct(product);
      toast.success('Produto criado no Base');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao criar produto no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProduct = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.getProduct(productId);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao buscar produto no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (productId: string, product: Partial<BaseProduct>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.updateProduct(productId, product);
      toast.success('Produto atualizado no Base');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao atualizar produto no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);
    try {
      await baseClient.deleteProduct(productId);
      toast.success('Produto excluído do Base');
      return { error: null };
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao excluir produto do Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listProducts = useCallback(async (params?: BaseListParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.listProducts(params);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao listar produtos no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // PEDIDOS DE VENDA
  // ============================================

  const createSalesOrder = useCallback(async (order: BaseSalesOrder) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.createSalesOrder(order);
      toast.success('Pedido criado no Base');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao criar pedido no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSalesOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.getSalesOrder(orderId);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao buscar pedido no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSalesOrder = useCallback(async (orderId: string, order: Partial<BaseSalesOrder>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.updateSalesOrder(orderId, order);
      toast.success('Pedido atualizado no Base');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao atualizar pedido no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSalesOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      await baseClient.deleteSalesOrder(orderId);
      toast.success('Pedido excluído do Base');
      return { error: null };
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao excluir pedido do Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listSalesOrders = useCallback(async (params?: BaseListParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.listSalesOrders(params);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao listar pedidos no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Emissão de NF-e
  const invoiceSalesOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.invoiceSalesOrder(orderId);
      toast.success('NF-e emitida com sucesso!');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao emitir NF-e');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelInvoice = useCallback(async (orderId: string, reason: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.cancelInvoice(orderId, reason);
      toast.success('NF-e cancelada com sucesso');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao cancelar NF-e');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // TRANSPORTADORAS
  // ============================================

  const createCarrier = useCallback(async (carrier: BaseCarrier) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.createCarrier(carrier);
      toast.success('Transportadora criada no Base');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao criar transportadora no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listCarriers = useCallback(async (params?: BaseListParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.listCarriers(params);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao listar transportadoras no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // BANCOS
  // ============================================

  const listBanks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.listBanks();
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao listar bancos no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // WEBHOOKS
  // ============================================

  const createWebhook = useCallback(async (webhook: BaseWebhook) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.createWebhook(webhook);
      toast.success('Webhook criado no Base');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao criar webhook no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listWebhooks = useCallback(async (params?: BaseListParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await baseClient.listWebhooks(params);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao listar webhooks no Base');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    // Clientes
    createCustomer,
    getCustomer,
    updateCustomer,
    deleteCustomer,
    restoreCustomer,
    listCustomers,
    // Produtos
    createProduct,
    getProduct,
    updateProduct,
    deleteProduct,
    listProducts,
    // Pedidos
    createSalesOrder,
    getSalesOrder,
    updateSalesOrder,
    deleteSalesOrder,
    listSalesOrders,
    invoiceSalesOrder,
    cancelInvoice,
    // Transportadoras
    createCarrier,
    listCarriers,
    // Bancos
    listBanks,
    // Webhooks
    createWebhook,
    listWebhooks,
  };
}
