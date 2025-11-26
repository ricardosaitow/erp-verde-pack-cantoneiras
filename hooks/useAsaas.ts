// ============================================
// HOOK: useAsaas
// ============================================
// Hook React para integração com Asaas
// ============================================

import { useState, useCallback } from 'react';
import { asaasClient } from '../lib/asaas';
import type {
  AsaasCustomer,
  AsaasPayment,
  AsaasPaymentResponse,
  AsaasResponse,
} from '../types/asaas';
import { toast } from 'sonner';

export function useAsaas() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // CLIENTES
  // ============================================

  const createCustomer = useCallback(async (customer: AsaasCustomer) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔵 useAsaas.createCustomer - Dados enviados:', customer);
      const response = await asaasClient.createCustomer(customer);
      console.log('🔵 useAsaas.createCustomer - Resposta completa:', response);
      console.log('🔵 useAsaas.createCustomer - response.data:', response.data);
      console.log('🔍 ASAAS RETORNOU - Endereço salvo:', {
        address: response.data.address,
        addressNumber: response.data.addressNumber,
        complement: response.data.complement,
        province: response.data.province,
        city: response.data.city,
        state: response.data.state,
        postalCode: response.data.postalCode,
      });

      if (!response.data) {
        console.error('❌ response.data está vazio. Resposta completa:', response);
        throw new Error('Asaas retornou resposta vazia');
      }

      toast.success('Cliente criado no Asaas');
      return response.data;
    } catch (err: any) {
      console.error('❌ Erro no useAsaas.createCustomer:', err);
      setError(err.message);
      toast.error('Erro ao criar cliente no Asaas: ' + err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCustomer = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.getCustomer(customerId);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao buscar cliente no Asaas');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCustomer = useCallback(async (customerId: string, customer: Partial<AsaasCustomer>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.updateCustomer(customerId, customer);
      toast.success('Cliente atualizado no Asaas');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao atualizar cliente no Asaas');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCustomer = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      await asaasClient.deleteCustomer(customerId);
      toast.success('Cliente excluído do Asaas');
      return { error: null };
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao excluir cliente do Asaas');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const syncCustomerToAsaas = useCallback(
    async (clienteERP: any): Promise<AsaasCustomer | undefined> => {
      // Se já tem ID Asaas, retornar
      if (clienteERP.asaas_customer_id) {
        return await getCustomer(clienteERP.asaas_customer_id);
      }

      // Criar novo cliente no Asaas
      const asaasCustomer: AsaasCustomer = {
        name: clienteERP.razao_social,
        email: clienteERP.email,
        phone: clienteERP.telefone,
        mobilePhone: clienteERP.celular,
        cpfCnpj: clienteERP.cnpj_cpf,
        postalCode: clienteERP.cep,
        address: clienteERP.endereco,
        addressNumber: clienteERP.numero,
        complement: clienteERP.complemento,
        province: clienteERP.bairro,
        externalReference: String(clienteERP.id),
        stateInscription: clienteERP.inscricao_estadual,
        observations: clienteERP.observacoes,
      };

      return await createCustomer(asaasCustomer);
    },
    [createCustomer, getCustomer]
  );

  // ============================================
  // COBRANÇAS
  // ============================================

  const createPayment = useCallback(async (payment: AsaasPayment) => {
    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.createPayment(payment);
      toast.success('Cobrança criada no Asaas');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao criar cobrança no Asaas');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPayment = useCallback(async (paymentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.getPayment(paymentId);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao buscar cobrança no Asaas');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refundPayment = useCallback(async (paymentId: string, value?: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.refundPayment(paymentId, value);
      toast.success('Pagamento estornado com sucesso');
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao estornar pagamento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const receiveInCash = useCallback(
    async (paymentId: string, paymentDate: string, value?: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await asaasClient.receiveInCash(paymentId, {
          paymentDate,
          value,
          notifyCustomer: true,
        });
        toast.success('Pagamento confirmado manualmente');
        return response.data;
      } catch (err: any) {
        setError(err.message);
        toast.error('Erro ao confirmar pagamento');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createPaymentFromPedido = useCallback(
    async (pedido: any, customerId: string): Promise<AsaasPaymentResponse | undefined> => {
      const payment: AsaasPayment = {
        customer: customerId,
        billingType: pedido.forma_pagamento || 'BOLETO',
        value: pedido.valor_total,
        dueDate: pedido.data_vencimento || new Date().toISOString().split('T')[0],
        description: `Pedido ${pedido.numero_pedido}`,
        externalReference: String(pedido.id),
      };

      return await createPayment(payment);
    },
    [createPayment]
  );

  // ============================================
  // QR CODE PIX
  // ============================================

  const getPixQrCode = useCallback(async (paymentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.getPixQrCode(paymentId);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao buscar QR Code PIX');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // BOLETO
  // ============================================

  const getBankSlip = useCallback(async (paymentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await asaasClient.getBankSlip(paymentId);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao buscar boleto');
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
    syncCustomerToAsaas,
    // Cobranças
    createPayment,
    getPayment,
    refundPayment,
    receiveInCash,
    createPaymentFromPedido,
    // Pix
    getPixQrCode,
    // Boleto
    getBankSlip,
  };
}
