import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { baseClient } from '../lib/base';
import type { PedidoCompleto, Cliente } from '../lib/database.types';
import type { BaseSalesOrder, BaseSalesOrderItem, BaseCustomer } from '../types/base';

interface EmitirNFeResult {
  success: boolean;
  error?: string;
  invoiceNumber?: string;
  invoiceKey?: string;
}

export interface NFePaymentData {
  dueDate: string;
  value: number;
  billingType: string;
  bankId: number;
}

export function useNFe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Prepara os dados do cliente para o Base ERP
   */
  const prepararClienteBase = (cliente: Cliente): BaseCustomer => {
    // Limpar CPF/CNPJ (remover pontos, traços, barras)
    const cpfCnpjLimpo = cliente.cnpj_cpf?.replace(/[^\d]/g, '') || '';

    return {
      name: cliente.nome_fantasia || cliente.razao_social || 'Cliente',
      email: cliente.email || undefined,
      cpfCnpj: cpfCnpjLimpo || undefined,
      phone: cliente.telefone?.replace(/[^\d]/g, '') || undefined,
      externalReference: cliente.id,
      billingAddress: {
        postalCode: cliente.cep?.replace(/[^\d]/g, '') || undefined,
        address: cliente.endereco || undefined,
        addressNumber: cliente.numero || undefined,
        complement: cliente.complemento || undefined,
        province: cliente.bairro || undefined,
        cityName: cliente.cidade || undefined,
        stateAbbrev: cliente.estado || undefined,
      },
      taxInformation: {
        stateInscription: cliente.inscricao_estadual || undefined,
        finalConsumer: !cliente.cnpj_cpf || cliente.cnpj_cpf.replace(/[^\d]/g, '').length === 11,
      },
    };
  };

  /**
   * Prepara os itens do pedido para o Base ERP
   * Campos da API: productId, unitPrice, quantity, costOfShipping, discountValue, itemValue
   */
  const prepararItensBase = (pedido: PedidoCompleto): BaseSalesOrderItem[] => {
    if (!pedido.itens || pedido.itens.length === 0) {
      return [];
    }

    return pedido.itens.map((item) => {
      const produto = item.produto;

      // Calcular quantidade baseado no tipo de venda
      let quantidade = 1;

      if (item.quantidade_pecas && item.comprimento_cada_mm) {
        // Venda composta (peças x comprimento)
        quantidade = item.quantidade_pecas;
      } else if (item.quantidade_simples) {
        // Venda simples
        quantidade = item.quantidade_simples;
      }

      return {
        productId: produto?.base_id ? Number(produto.base_id) : undefined,
        unitPrice: Number(item.preco_unitario) || 0,
        quantity: quantidade,
        costOfShipping: 0,
        discountValue: 0,
        itemValue: Number(item.subtotal) || 0,
      };
    });
  };

  /**
   * Sincroniza cliente com o Base ERP
   * Retorna o ID do cliente no Base
   */
  const sincronizarCliente = async (cliente: Cliente): Promise<{ baseCustomerId: string | null; error: string | null }> => {
    try {
      // Se já tem ID do Base, retornar
      if (cliente.base_customer_id) {
        console.log(`✅ Cliente já sincronizado: ${cliente.base_customer_id}`);
        return { baseCustomerId: cliente.base_customer_id, error: null };
      }

      console.log(`🔄 Sincronizando cliente ${cliente.razao_social || cliente.nome_fantasia} com Base...`);

      // Preparar dados do cliente
      const clienteBase = prepararClienteBase(cliente);

      // Criar cliente no Base
      const response = await baseClient.createCustomer(clienteBase);

      if (!response.data?.id) {
        return { baseCustomerId: null, error: 'Erro ao criar cliente no Base: resposta sem ID' };
      }

      // Atualizar cliente local com ID do Base
      const { error: updateError } = await supabase
        .from('clientes')
        .update({ base_customer_id: response.data.id })
        .eq('id', cliente.id);

      if (updateError) {
        console.error('Erro ao atualizar cliente local:', updateError);
      }

      console.log(`✅ Cliente criado no Base: ${response.data.id}`);
      return { baseCustomerId: response.data.id, error: null };
    } catch (err: any) {
      console.error('Erro ao sincronizar cliente:', err);
      return { baseCustomerId: null, error: err.message || 'Erro ao sincronizar cliente' };
    }
  };

  /**
   * Sincroniza pedido com o Base ERP
   * Retorna o ID do pedido no Base
   */
  const sincronizarPedido = async (
    pedido: PedidoCompleto,
    baseCustomerId: string,
    paymentData: NFePaymentData
  ): Promise<{ baseSalesOrderId: string | null; error: string | null }> => {
    try {
      // Se já tem ID do Base, retornar
      if (pedido.base_sales_order_id) {
        console.log(`✅ Pedido já sincronizado: ${pedido.base_sales_order_id}`);
        return { baseSalesOrderId: pedido.base_sales_order_id, error: null };
      }

      console.log(`🔄 Sincronizando pedido ${pedido.numero_pedido} com Base...`);

      // Preparar itens
      const itens = prepararItensBase(pedido);

      if (itens.length === 0) {
        return { baseSalesOrderId: null, error: 'Pedido sem itens' };
      }

      // Preparar pedido - usando nomes de campos da API do Base
      const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Buscar próximo número disponível no Base
      console.log('🔢 Buscando próximo número de pedido no Base...');
      const numeroPedido = await baseClient.getNextOrderNumber();
      console.log(`🔢 Próximo número: ${numeroPedido}`);

      const pedidoBase: BaseSalesOrder = {
        number: numeroPedido, // Número do pedido obtido do Base
        customerId: Number(baseCustomerId), // API espera número, não string
        issueDate: hoje, // Data de emissão (obrigatório)
        orderItems: itens, // API usa orderItems, não items
        orderPayments: [
          {
            dueDate: paymentData.dueDate,
            value: paymentData.value,
            billingType: paymentData.billingType,
            bankId: paymentData.bankId,
          }
        ],
        discountValue: Number(pedido.valor_desconto) || 0, // API usa discountValue
        costOfShipping: Number(pedido.valor_frete) || 0, // API usa costOfShipping
        observations: pedido.observacoes || undefined,
        externalReference: pedido.id,
      };

      // Criar pedido no Base
      const response = await baseClient.createSalesOrder(pedidoBase);

      if (!response.data?.id) {
        return { baseSalesOrderId: null, error: 'Erro ao criar pedido no Base: resposta sem ID' };
      }

      const baseOrderId = String(response.data.id);

      // Atualizar pedido local com ID do Base
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          base_sales_order_id: baseOrderId,
          sincronizado_base: true,
          ultima_sincronizacao_base: new Date().toISOString(),
        })
        .eq('id', pedido.id);

      if (updateError) {
        console.error('Erro ao atualizar pedido local:', updateError);
      }

      console.log(`✅ Pedido criado no Base: ${baseOrderId}`);
      return { baseSalesOrderId: baseOrderId, error: null };
    } catch (err: any) {
      console.error('Erro ao sincronizar pedido:', err);
      return { baseSalesOrderId: null, error: err.message || 'Erro ao sincronizar pedido' };
    }
  };

  /**
   * Emite NF-e para um pedido
   * Se paymentData não for fornecido, usa os dados do pedido
   */
  const emitirNFe = async (pedido: PedidoCompleto, paymentData?: NFePaymentData): Promise<EmitirNFeResult> => {
    // Se não tiver dados de pagamento, usar do pedido
    const dadosPagamento: NFePaymentData = paymentData || {
      dueDate: pedido.data_vencimento || calcularDataVencimento(),
      value: Number(pedido.valor_total) || 0,
      billingType: pedido.tipo_cobranca || 'BOLETO',
      bankId: pedido.banco_id || 0,
    };

    // Função auxiliar para calcular data de vencimento padrão (30 dias)
    function calcularDataVencimento(): string {
      const data = new Date();
      data.setDate(data.getDate() + 30);
      return data.toISOString().split('T')[0];
    }
    setLoading(true);
    setError(null);

    try {
      // Validar pedido
      if (!pedido.cliente) {
        throw new Error('Pedido sem cliente vinculado');
      }

      if (pedido.status !== 'entregue') {
        throw new Error('Apenas pedidos entregues podem ter NF-e emitida');
      }

      if (pedido.base_invoice_number) {
        throw new Error(`NF-e já emitida: ${pedido.base_invoice_number}`);
      }

      console.log(`📋 Iniciando emissão de NF-e para pedido ${pedido.numero_pedido}...`);

      // 1. Sincronizar cliente com Base
      const { baseCustomerId, error: clienteError } = await sincronizarCliente(pedido.cliente);
      if (clienteError || !baseCustomerId) {
        throw new Error(clienteError || 'Erro ao sincronizar cliente');
      }

      // 2. Sincronizar pedido com Base
      const { baseSalesOrderId, error: pedidoError } = await sincronizarPedido(pedido, baseCustomerId, dadosPagamento);
      if (pedidoError || !baseSalesOrderId) {
        throw new Error(pedidoError || 'Erro ao sincronizar pedido');
      }

      // 3. Emitir NF-e
      console.log(`📤 Emitindo NF-e para pedido ${baseSalesOrderId}...`);
      const invoiceResponse = await baseClient.invoiceSalesOrder(baseSalesOrderId);

      if (!invoiceResponse.data) {
        throw new Error('Erro ao emitir NF-e: resposta vazia');
      }

      const { invoiceId, invoiceNumber, invoiceKey, invoiceDate } = invoiceResponse.data;

      console.log('📄 Dados da NF-e:', { invoiceId, invoiceNumber, invoiceKey, invoiceDate });

      // 4. Atualizar pedido local com dados da NF-e
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          base_invoice_id: invoiceId || null,
          base_invoice_number: invoiceNumber,
          base_invoice_key: invoiceKey,
          data_emissao_nf: invoiceDate || new Date().toISOString(),
        })
        .eq('id', pedido.id);

      if (updateError) {
        console.error('Erro ao atualizar pedido com dados da NF-e:', updateError);
      }

      console.log(`✅ NF-e emitida com sucesso! Número: ${invoiceNumber}`);

      setLoading(false);
      return {
        success: true,
        invoiceNumber: invoiceNumber || undefined,
        invoiceKey: invoiceKey || undefined,
      };
    } catch (err: any) {
      console.error('Erro ao emitir NF-e:', err);
      const errorMessage = err.message || 'Erro ao emitir NF-e';
      setError(errorMessage);
      setLoading(false);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  /**
   * Cancela NF-e de um pedido
   */
  const cancelarNFe = async (pedido: PedidoCompleto, motivo: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      if (!pedido.base_sales_order_id) {
        throw new Error('Pedido não sincronizado com Base');
      }

      if (!pedido.base_invoice_number) {
        throw new Error('Pedido não tem NF-e emitida');
      }

      console.log(`❌ Cancelando NF-e ${pedido.base_invoice_number}...`);

      const response = await baseClient.cancelInvoice(pedido.base_sales_order_id, motivo);

      if (!response.data) {
        throw new Error('Erro ao cancelar NF-e');
      }

      // Atualizar pedido local
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          base_invoice_number: null,
          base_invoice_key: null,
          data_emissao_nf: null,
        })
        .eq('id', pedido.id);

      if (updateError) {
        console.error('Erro ao atualizar pedido:', updateError);
      }

      console.log(`✅ NF-e cancelada com sucesso!`);

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao cancelar NF-e:', err);
      const errorMessage = err.message || 'Erro ao cancelar NF-e';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  return {
    loading,
    error,
    emitirNFe,
    cancelarNFe,
    sincronizarCliente,
    sincronizarPedido,
  };
}
