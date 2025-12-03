import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { baseClient } from '../lib/base';
import type { PedidoCompleto, Cliente, PedidoItem, Produto } from '../lib/database.types';
import type { BaseSalesOrder, BaseSalesOrderItem, BaseCustomer, BaseProduct } from '../types/base';

// Tipo para item do pedido com produto
type PedidoItemComProduto = PedidoItem & { produto?: Produto };

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
   * Monta o nome do produto com comprimento
   * Ex: "CANTONEIRA 40X40X3" + 1500mm = "CANTONEIRA 40X40X3_1500MM"
   */
  const montarNomeProdutoComComprimento = (nomeProduto: string, comprimentoMm: number): string => {
    // Remove espaços extras e padroniza
    const nomeBase = nomeProduto.trim().toUpperCase();
    return `${nomeBase}_${comprimentoMm}MM`;
  };

  /**
   * Busca ou cria produto no Base com o comprimento específico
   * Retorna o ID do produto no Base
   */
  const buscarOuCriarProdutoBase = async (
    item: PedidoItemComProduto
  ): Promise<{ baseProductId: number | null; error: string | null }> => {
    try {
      const produto = item.produto;
      if (!produto) {
        return { baseProductId: null, error: 'Item sem produto vinculado' };
      }

      // Se não tem comprimento, usar o produto base diretamente
      if (!item.comprimento_cada_mm) {
        if (produto.base_id) {
          return { baseProductId: Number(produto.base_id), error: null };
        }
        return { baseProductId: null, error: 'Produto sem ID do Base' };
      }

      // Montar nome com comprimento
      const nomeComComprimento = montarNomeProdutoComComprimento(
        produto.nome,
        item.comprimento_cada_mm
      );

      // Criar externalReference único: produto_id + comprimento
      const externalRef = `${produto.id}_${item.comprimento_cada_mm}mm`;

      console.log(`🔍 Buscando produto no Base: ${nomeComComprimento} (ref: ${externalRef})`);

      // Buscar no Base por externalReference
      const searchResponse = await baseClient.listProducts({
        externalReference: externalRef,
        limit: 1
      });

      const produtosEncontrados = searchResponse.data as any;
      const content = produtosEncontrados?.content || produtosEncontrados || [];

      if (Array.isArray(content) && content.length > 0) {
        const produtoExistente = content[0];
        console.log(`✅ Produto já existe no Base: ${produtoExistente.id}`);
        return { baseProductId: Number(produtoExistente.id), error: null };
      }

      // Produto não existe, criar no Base
      console.log(`📦 Criando produto no Base: ${nomeComComprimento}`);

      const novoProduto: BaseProduct = {
        name: nomeComComprimento,
        code: produto.codigo_interno ? `${produto.codigo_interno}_${item.comprimento_cada_mm}` : undefined,
        ncm: produto.ncm || undefined,
        unit: produto.unidade_venda === 'unidade' ? 'UN' : produto.unidade_venda?.toUpperCase() || 'UN',
        price: Number(item.preco_unitario) || Number(produto.preco_venda_unitario) || 0,
        externalReference: externalRef,
      };

      const createResponse = await baseClient.createProduct(novoProduto);

      if (!createResponse.data?.id) {
        return { baseProductId: null, error: 'Erro ao criar produto no Base: resposta sem ID' };
      }

      console.log(`✅ Produto criado no Base: ${createResponse.data.id}`);
      return { baseProductId: Number(createResponse.data.id), error: null };
    } catch (err: any) {
      console.error('Erro ao buscar/criar produto:', err);
      return { baseProductId: null, error: err.message || 'Erro ao buscar/criar produto' };
    }
  };

  /**
   * Prepara os itens do pedido para o Base ERP
   * Cria produtos com comprimento no Base se necessário
   *
   * IMPORTANTE: Para frete CIF, o valor do frete é EMBUTIDO no preço unitário
   * do produto (calculado manualmente pelo usuário e salvo em preco_unitario_com_frete).
   * Não enviamos frete separado na NF-e para CIF.
   *
   * Campos da API: productId, unitPrice, quantity, costOfShipping, discountValue, itemValue
   */
  const prepararItensBase = async (pedido: PedidoCompleto): Promise<BaseSalesOrderItem[]> => {
    if (!pedido.itens || pedido.itens.length === 0) {
      return [];
    }

    const isCIF = pedido.tipo_frete === 'CIF';

    const itensProcessados: BaseSalesOrderItem[] = [];

    for (const item of pedido.itens) {
      // Buscar ou criar produto no Base com comprimento
      const { baseProductId, error } = await buscarOuCriarProdutoBase(item);

      if (error || !baseProductId) {
        console.error(`Erro no item ${item.produto?.nome}: ${error}`);
        // Continua com o produto base se houver erro
        const produtoBaseId = item.produto?.base_id ? Number(item.produto.base_id) : undefined;
        if (!produtoBaseId) {
          throw new Error(`Item ${item.produto?.nome} não tem produto válido no Base`);
        }
      }

      // Calcular quantidade (sempre em peças)
      const quantidade = item.quantidade_pecas || item.quantidade_simples || 1;

      // Para CIF: usar valores COM frete salvos no item (distribuídos manualmente pelo usuário)
      // Para FOB: usar valores SEM frete (frete vai separado no pedido)
      const usarValoresComFrete = isCIF && item.preco_unitario_com_frete && item.subtotal_com_frete;

      // Calcular preço unitário por peça
      let precoUnitarioFinal: number;
      let itemValue: number;

      if (usarValoresComFrete) {
        // CIF: preço unitário já tem frete embutido (distribuído manualmente pelo usuário)
        // O preco_unitario_com_frete é por peça
        precoUnitarioFinal = Number(item.preco_unitario_com_frete);
        itemValue = Number(item.subtotal_com_frete);

        console.log(`📦 Item CIF: ${quantidade} peças`);
        console.log(`   Preço unit. base: R$ ${Number(item.preco_unitario).toFixed(2)}`);
        console.log(`   + Frete unit.: R$ ${(Number(item.frete_unitario) || 0).toFixed(2)}`);
        console.log(`   = Preço unit. final: R$ ${precoUnitarioFinal.toFixed(2)}`);
        console.log(`   Total item: R$ ${itemValue.toFixed(2)}`);
      } else {
        // FOB ou sem distribuição de frete: usar valores base
        const subtotal = Number(item.subtotal) || 0;
        precoUnitarioFinal = quantidade > 0 ? subtotal / quantidade : 0;
        itemValue = subtotal;

        console.log(`📦 Item FOB: ${quantidade} peças`);
        console.log(`   Preço unit.: R$ ${precoUnitarioFinal.toFixed(2)}`);
        console.log(`   Total item: R$ ${itemValue.toFixed(2)}`);
      }

      itensProcessados.push({
        productId: baseProductId || undefined,
        unitPrice: precoUnitarioFinal,
        quantity: quantidade,
        costOfShipping: 0, // Frete vai separado (FOB) ou está no preço (CIF)
        discountValue: 0,
        itemValue: itemValue,
      });
    }

    return itensProcessados;
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
   * Busca a transportadora do pedido e retorna o base_id
   */
  const buscarTransportadoraBase = async (transportadoraId: string): Promise<number | null> => {
    try {
      const { data: transportadora, error } = await supabase
        .from('transportadoras')
        .select('base_id')
        .eq('id', transportadoraId)
        .single();

      if (error || !transportadora) {
        console.warn(`⚠️ Transportadora ${transportadoraId} não encontrada`);
        return null;
      }

      return transportadora.base_id || null;
    } catch (err) {
      console.error('Erro ao buscar transportadora:', err);
      return null;
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

      // Preparar itens (busca/cria produtos com comprimento no Base)
      console.log(`📦 Preparando ${pedido.itens?.length || 0} itens...`);
      const itens = await prepararItensBase(pedido);

      if (itens.length === 0) {
        return { baseSalesOrderId: null, error: 'Pedido sem itens' };
      }

      // Preparar pedido - usando nomes de campos da API do Base
      const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Buscar próximo número disponível no Base
      console.log('🔢 Buscando próximo número de pedido no Base...');
      const numeroPedido = await baseClient.getNextOrderNumber();
      console.log(`🔢 Próximo número: ${numeroPedido}`);

      // Calcular valor total (soma dos itens, que já inclui frete CIF embutido)
      const valorTotalItens = itens.reduce((sum, item) => sum + (item.itemValue || 0), 0);

      // Para FOB, o frete vai separado. Para CIF, já está no preço do produto
      const isCIF = pedido.tipo_frete === 'CIF';
      const freteSeparado = isCIF ? 0 : (Number(pedido.valor_frete) || 0);

      const pedidoBase: BaseSalesOrder = {
        number: numeroPedido, // Número do pedido obtido do Base
        customerId: Number(baseCustomerId), // API espera número, não string
        issueDate: hoje, // Data de emissão (obrigatório)
        orderItems: itens, // API usa orderItems, não items
        orderPayments: [
          {
            dueDate: paymentData.dueDate,
            value: valorTotalItens + freteSeparado, // Valor do pagamento = itens + frete FOB (se houver)
            billingType: paymentData.billingType,
            bankId: paymentData.bankId,
          }
        ],
        discountValue: Number(pedido.valor_desconto) || 0,
        costOfShipping: freteSeparado, // Só envia frete se for FOB
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
