// ============================================
// HOOK: useClienteBase
// ============================================
// Hook para sincronizar clientes com Base ERP
// ============================================

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBase } from './useBase';
import type { BaseCustomer } from '../types/base';
import { toast } from 'sonner';

export function useClienteBase() {
  const { createCustomer, updateCustomer, deleteCustomer, restoreCustomer } = useBase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sincroniza cliente do ERP com Base
   *
   * Fluxo:
   * 1. Busca cliente no banco (Supabase)
   * 2. Envia para Base ERP com externalReference = ID do ERP
   * 3. Salva base_customer_id de volta no banco
   */
  const sincronizarComBase = async (clienteId: string) => {
    setLoading(true);
    setError(null);

    try {
      // 1. BUSCAR CLIENTE NO BANCO
      console.log('🔍 Buscando cliente no ERP...', clienteId);

      const { data: cliente, error: erroCliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (erroCliente || !cliente) {
        throw new Error('Cliente não encontrado no banco de dados');
      }

      // Verificar se já está sincronizado
      if (cliente.base_customer_id) {
        toast.info('Cliente já está sincronizado com Base ERP');
        return {
          ...cliente,
          jaEstavaSincronizado: true,
        };
      }

      // Buscar contatos do cliente
      const { data: contatos } = await supabase
        .from('clientes_contatos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('ativo', true);

      // ============================================
      // REGRA DE CONTATOS:
      // - Financeiro = contato principal (email, phone, mobilePhone)
      // - Base ERP não suporta emails adicionais
      // ============================================
      const contatoFinanceiro = contatos?.find(c => c.tipo_contato === 'financeiro');

      // 2. PREPARAR DADOS PARA BASE ERP
      console.log('📝 Preparando dados para Base ERP...');

      // Montar dados no formato correto do Base ERP
      const baseData: any = {
        name: cliente.razao_social,
        cpfCnpj: cliente.cnpj_cpf?.replace(/\D/g, ''),
        email: contatoFinanceiro?.email || cliente.email,
        phone: contatoFinanceiro?.telefone || cliente.telefone,
        mobilePhone: contatoFinanceiro?.telefone || cliente.celular,
        externalReference: String(cliente.id),
        observations: cliente.observacoes,

        // ============================================
        // ENDEREÇO DE COBRANÇA (billingAddress)
        // ============================================
        billingAddress: {
          postalCode: cliente.cep?.replace(/\D/g, ''),
          address: cliente.endereco,
          addressNumber: cliente.numero,
          complement: cliente.complemento,
          province: cliente.bairro,
          cityName: cliente.cidade,
          stateAbbrev: cliente.estado,
          country: 'Brasil',
        },

        // ============================================
        // ENDEREÇO DE ENTREGA (mesmo que cobrança)
        // ============================================
        deliveryAddress: {
          postalCode: cliente.cep?.replace(/\D/g, ''),
          address: cliente.endereco,
          addressNumber: cliente.numero,
          complement: cliente.complemento,
          province: cliente.bairro,
          cityName: cliente.cidade,
          stateAbbrev: cliente.estado,
          country: 'Brasil',
        },

        // ============================================
        // INFORMAÇÕES FISCAIS (taxInformation)
        // ============================================
        taxInformation: {
          stateInscription: cliente.inscricao_estadual,
          municipalInscription: cliente.inscricao_municipal,
          finalConsumer: false,
          simpleTax: false,
          ruralProducer: false,
        },
      };

      // Adicionar Asaas ID se existir
      if (cliente.asaas_customer_id) {
        baseData.asaasCustomerId = cliente.asaas_customer_id;
      }

      console.log('📤 Dados enviados para Base ERP (nova estrutura):', {
        billingAddress: baseData.billingAddress,
        deliveryAddress: baseData.deliveryAddress,
        taxInformation: baseData.taxInformation,
      });

      console.log('📊 Cliente do banco:', {
        endereco: cliente.endereco,
        numero: cliente.numero,
        complemento: cliente.complemento,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        cep: cliente.cep,
      });

      // 3. CRIAR NO BASE ERP
      const response = await createCustomer(baseData);

      if (!response?.data?.id) {
        console.error('❌ Base ERP não retornou ID. Resposta:', response);
        throw new Error('Base ERP não retornou ID do cliente');
      }

      const baseCustomerId = response.data.id;
      console.log('✅ Cliente criado no Base ERP:', baseCustomerId);

      // 4. SALVAR base_customer_id NO BANCO
      try {
        const { error: erroUpdate } = await supabase
          .from('clientes')
          .update({
            base_customer_id: baseCustomerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clienteId);

        if (erroUpdate) {
          if (erroUpdate.message.includes('base_customer_id')) {
            console.error('⚠️ Coluna base_customer_id não existe. Execute a migration para adicionar o campo');
            toast.warning('Cliente criado no Base, mas execute a migration SQL para salvar o vínculo');
          } else {
            console.error('Erro ao salvar base_customer_id:', erroUpdate);
            toast.warning('Cliente criado no Base, mas houve erro ao salvar ID');
          }
        } else {
          console.log('✅ Cliente vinculado ao Base ERP');
          toast.success('Cliente sincronizado com Base ERP');
        }
      } catch (errUpdate: any) {
        console.error('Erro ao atualizar com base_customer_id:', errUpdate);
        toast.warning('Cliente criado no Base. Execute a migration SQL para ativar sincronização completa');
      }

      // Retornar cliente com ID do Base
      return {
        ...cliente,
        base_customer_id: baseCustomerId,
        base_customer: response.data,
      };

    } catch (erro: any) {
      console.error('❌ Erro ao sincronizar com Base:', erro);
      setError(erro.message);
      toast.error('Erro ao sincronizar com Base ERP: ' + erro.message);
      throw erro;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza cliente no Base ERP
   */
  const atualizarNoBase = async (
    clienteId: string,
    dadosAtualizados: Partial<BaseCustomer>
  ) => {
    setLoading(true);
    setError(null);

    try {
      // 1. BUSCAR CLIENTE
      const { data: cliente, error: erroCliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (erroCliente || !cliente) {
        throw new Error('Cliente não encontrado');
      }

      if (!cliente.base_customer_id) {
        throw new Error('Cliente não está sincronizado com Base ERP');
      }

      // 2. ATUALIZAR NO BASE
      console.log('🔄 Atualizando cliente no Base ERP:', cliente.base_customer_id);

      await updateCustomer(cliente.base_customer_id, dadosAtualizados);

      console.log('✅ Cliente atualizado no Base ERP');
      toast.success('Cliente atualizado no Base ERP');

      return { error: null };

    } catch (erro: any) {
      console.error('Erro ao atualizar no Base:', erro);
      setError(erro.message);
      toast.error('Erro ao atualizar no Base: ' + erro.message);
      return { error: erro.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exclui cliente do Base ERP
   */
  const excluirDoBase = async (clienteId: string) => {
    setLoading(true);
    setError(null);

    try {
      // 1. BUSCAR CLIENTE
      const { data: cliente, error: erroCliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (erroCliente || !cliente) {
        throw new Error('Cliente não encontrado');
      }

      if (!cliente.base_customer_id) {
        toast.info('Cliente não está sincronizado com Base ERP');
        return { error: null };
      }

      // 2. EXCLUIR DO BASE
      console.log('🗑️ Excluindo cliente do Base ERP:', cliente.base_customer_id);

      await deleteCustomer(cliente.base_customer_id);

      console.log('✅ Cliente excluído do Base ERP');

      // 3. REMOVER base_customer_id DO BANCO
      await supabase
        .from('clientes')
        .update({
          base_customer_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clienteId);

      toast.success('Cliente removido do Base ERP');

      return { error: null };

    } catch (erro: any) {
      console.error('Erro ao excluir do Base:', erro);
      setError(erro.message);
      toast.error('Erro ao excluir do Base: ' + erro.message);
      return { error: erro.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restaura cliente deletado no Base ERP
   */
  const restaurarNoBase = async (clienteId: string) => {
    setLoading(true);
    setError(null);

    try {
      // 1. BUSCAR CLIENTE
      const { data: cliente, error: erroCliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (erroCliente || !cliente) {
        throw new Error('Cliente não encontrado');
      }

      if (!cliente.base_customer_id) {
        throw new Error('Cliente não tem ID do Base ERP para restaurar');
      }

      // 2. RESTAURAR NO BASE
      console.log('♻️ Restaurando cliente no Base ERP:', cliente.base_customer_id);

      await restoreCustomer(cliente.base_customer_id);

      console.log('✅ Cliente restaurado no Base ERP');
      toast.success('Cliente restaurado no Base ERP');

      return { error: null };

    } catch (erro: any) {
      console.error('Erro ao restaurar no Base:', erro);
      setError(erro.message);
      toast.error('Erro ao restaurar no Base: ' + erro.message);
      return { error: erro.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sincroniza múltiplos clientes com Base (bulk)
   */
  const sincronizarClientesBulk = async (filtro?: {
    somenteNaoSincronizados?: boolean; // Default: true
    limite?: number; // Default: sem limite
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { somenteNaoSincronizados = true, limite } = filtro || {};

      // 1. BUSCAR CLIENTES
      console.log('🔍 Buscando clientes para sincronizar com Base...');
      let query = supabase.from('clientes').select('*');

      if (somenteNaoSincronizados) {
        query = query.is('base_customer_id', null);
      }

      if (limite) {
        query = query.limit(limite);
      }

      const { data: clientes, error: erroClientes } = await query;

      if (erroClientes) {
        throw new Error(`Erro ao buscar clientes: ${erroClientes.message}`);
      }

      if (!clientes || clientes.length === 0) {
        toast.info('Nenhum cliente encontrado para sincronizar com Base');
        return { sincronizados: 0, erros: 0, total: 0 };
      }

      console.log(`📋 ${clientes.length} cliente(s) para sincronizar com Base`);

      // 2. SINCRONIZAR CADA CLIENTE
      let sincronizados = 0;
      let erros = 0;

      for (const cliente of clientes) {
        try {
          await sincronizarComBase(cliente.id);
          sincronizados++;
        } catch (erroSync: any) {
          console.error(`Erro ao sincronizar cliente ${cliente.razao_social}:`, erroSync);
          erros++;
        }
      }

      // 3. RESULTADO
      const resultado = {
        sincronizados,
        erros,
        total: clientes.length,
      };

      if (sincronizados > 0) {
        toast.success(`${sincronizados} cliente(s) sincronizado(s) com Base ERP`);
      }

      if (erros > 0) {
        toast.warning(`${erros} erro(s) durante a sincronização com Base`);
      }

      console.log('📊 Resultado da sincronização Base:', resultado);

      return resultado;

    } catch (erro: any) {
      console.error('Erro na sincronização bulk com Base:', erro);
      setError(erro.message);
      toast.error('Erro na sincronização: ' + erro.message);
      throw erro;
    } finally {
      setLoading(false);
    }
  };

  return {
    sincronizarComBase,
    atualizarNoBase,
    excluirDoBase,
    restaurarNoBase,
    sincronizarClientesBulk,
    loading,
    error,
  };
}
