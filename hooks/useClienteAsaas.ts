// ============================================
// HOOK: useClienteAsaas
// ============================================
// Hook para criar clientes no ERP e sincronizar
// automaticamente com o Asaas
// ============================================

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAsaas } from './useAsaas';
import type { AsaasCustomer } from '../types/asaas';
import { toast } from 'sonner';

export function useClienteAsaas() {
  const { createCustomer: createAsaasCustomer, updateCustomer: updateAsaasCustomer, deleteCustomer: deleteAsaasCustomer } = useAsaas();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cria cliente no ERP e automaticamente no Asaas
   *
   * Fluxo:
   * 1. Cria cliente no banco (Supabase)
   * 2. Pega o ID gerado
   * 3. Envia para Asaas com externalReference = ID do ERP
   * 4. Salva asaas_customer_id de volta no banco
   */
  const criarClienteCompleto = async (dadosCliente: {
    // Dados do ERP
    tipo_pessoa?: 'fisica' | 'juridica';
    razao_social: string;
    nome_fantasia?: string;
    cnpj_cpf: string;
    email?: string;
    telefone?: string;
    celular?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    inscricao_estadual?: string;
    inscricao_municipal?: string;
    observacoes?: string;
    // Contatos
    contatos?: Array<{
      tipo_contato: string;
      nome_responsavel: string;
      email: string;
      telefone: string;
      contato_principal_asaas?: boolean;
    }>;
    // Opções
    sincronizarAsaas?: boolean; // Default: true
    notificarAsaas?: boolean; // Default: true
    // Grupo Asaas
    group_name?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { sincronizarAsaas = true } = dadosCliente;

      // 1. CRIAR CLIENTE NO ERP (Supabase)
      console.log('📝 Criando cliente no ERP...');

      // Montar endereco_completo a partir dos campos separados
      const enderecoPartes = [
        dadosCliente.endereco,
        dadosCliente.numero,
        dadosCliente.complemento,
        dadosCliente.bairro
      ].filter(Boolean);
      const endereco_completo = enderecoPartes.length > 0 ? enderecoPartes.join(', ') : undefined;

      const clienteData: any = {
        tipo_pessoa: dadosCliente.tipo_pessoa || 'juridica',
        razao_social: dadosCliente.razao_social,
        nome_fantasia: dadosCliente.nome_fantasia,
        cnpj_cpf: dadosCliente.cnpj_cpf,
        email: dadosCliente.email,
        telefone: dadosCliente.telefone,
        celular: dadosCliente.celular,
        cep: dadosCliente.cep,
        endereco_completo: endereco_completo,
        cidade: dadosCliente.cidade,
        estado: dadosCliente.estado,
        inscricao_estadual: dadosCliente.inscricao_estadual,
        observacoes: dadosCliente.observacoes,
      };

      // Adicionar campos novos apenas se existirem na tabela (após migration)
      try {
        // Tentar adicionar campos separados se disponíveis
        if (dadosCliente.endereco) clienteData.endereco = dadosCliente.endereco;
        if (dadosCliente.numero) clienteData.numero = dadosCliente.numero;
        if (dadosCliente.complemento) clienteData.complemento = dadosCliente.complemento;
        if (dadosCliente.bairro) clienteData.bairro = dadosCliente.bairro;
        if (dadosCliente.inscricao_municipal) clienteData.inscricao_municipal = dadosCliente.inscricao_municipal;
      } catch (e) {
        // Campos novos ainda não existem, ignorar
        console.log('Campos de endereço separados ainda não disponíveis');
      }

      const { data: clienteERP, error: erroERP } = await supabase
        .from('clientes')
        .insert(clienteData)
        .select()
        .single();

      if (erroERP) {
        throw new Error(`Erro ao criar cliente no ERP: ${erroERP.message}`);
      }

      console.log('✅ Cliente criado no ERP:', clienteERP.id);
      toast.success('Cliente criado no sistema');

      // 2. SINCRONIZAR COM ASAAS (se habilitado)
      if (sincronizarAsaas) {
        console.log('🔄 Sincronizando com Asaas...');

        try {
          // ============================================
          // REGRA DE CONTATOS:
          // - Financeiro = contato principal (email, phone, mobilePhone)
          // - Comercial = email adicional (additionalEmails)
          // ============================================
          const contatoFinanceiro = dadosCliente.contatos?.find(c => c.tipo_contato === 'financeiro');
          const contatoComercial = dadosCliente.contatos?.find(c => c.tipo_contato === 'comercial');

          // Validação: garantir que existem os 2 contatos obrigatórios
          if (!contatoFinanceiro) {
            console.warn('⚠️ Contato financeiro não encontrado, usando dados do cliente');
          }
          if (!contatoComercial) {
            console.warn('⚠️ Contato comercial não encontrado');
          }

          // Preparar dados para Asaas
          const asaasData: AsaasCustomer = {
            name: dadosCliente.razao_social,
            // Dados do contato FINANCEIRO
            email: contatoFinanceiro?.email || dadosCliente.email,
            phone: contatoFinanceiro?.telefone || dadosCliente.telefone,
            mobilePhone: contatoFinanceiro?.telefone || dadosCliente.celular,
            // Email do contato COMERCIAL como adicional
            additionalEmails: contatoComercial?.email || undefined,
            cpfCnpj: dadosCliente.cnpj_cpf?.replace(/\D/g, ''), // Remove formatação
            postalCode: dadosCliente.cep?.replace(/\D/g, ''),
            address: dadosCliente.endereco,
            addressNumber: dadosCliente.numero,
            complement: dadosCliente.complemento,
            province: dadosCliente.bairro,
            city: dadosCliente.cidade,
            state: dadosCliente.estado,
            stateInscription: dadosCliente.inscricao_estadual,
            municipalInscription: dadosCliente.inscricao_municipal,
            observations: dadosCliente.observacoes,
            groupName: dadosCliente.group_name,
            externalReference: String(clienteERP.id), // 🔥 ID DO ERP COMO REFERÊNCIA
            notificationDisabled: !dadosCliente.notificarAsaas,
          };

          // Criar no Asaas
          const clienteAsaas = await createAsaasCustomer(asaasData);

          if (!clienteAsaas?.id) {
            throw new Error('Asaas não retornou ID do cliente');
          }

          // 3. ATUALIZAR CLIENTE NO ERP COM ID DO ASAAS
          try {
            const { error: erroUpdate } = await supabase
              .from('clientes')
              .update({
                asaas_customer_id: clienteAsaas.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', clienteERP.id);

            if (erroUpdate) {
              // Se erro for por coluna não existir, avisar usuário para executar migration
              if (erroUpdate.message.includes('asaas_customer_id')) {
                console.error('⚠️ Coluna asaas_customer_id não existe. Execute a migration 20241120_add_asaas_fields.sql');
                toast.warning('Cliente criado no Asaas, mas execute a migration SQL para salvar o vínculo');
              } else {
                console.error('Erro ao salvar asaas_customer_id:', erroUpdate);
                toast.warning('Cliente criado, mas houve erro ao salvar ID do Asaas');
              }
            } else {
              console.log('✅ Cliente vinculado ao Asaas');
              toast.success('Cliente sincronizado com Asaas');
            }
          } catch (errUpdate: any) {
            console.error('Erro ao atualizar com asaas_customer_id:', errUpdate);
            toast.warning('Cliente criado no Asaas. Execute a migration SQL para ativar sincronização completa');
          }

          // Retornar cliente com ID do Asaas
          return {
            ...clienteERP,
            asaas_customer_id: clienteAsaas.id,
            asaas_customer: clienteAsaas,
          };

        } catch (erroAsaas: any) {
          console.error('Erro ao sincronizar com Asaas:', erroAsaas);
          toast.warning(
            'Cliente criado no sistema, mas não foi possível sincronizar com Asaas: ' +
            erroAsaas.message
          );

          // Retornar cliente mesmo sem sincronizar com Asaas
          return clienteERP;
        }
      }

      // Retornar cliente sem sincronizar com Asaas
      return clienteERP;

    } catch (erro: any) {
      console.error('Erro ao criar cliente:', erro);
      setError(erro.message);
      toast.error('Erro ao criar cliente: ' + erro.message);
      throw erro;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sincroniza cliente existente no ERP com Asaas
   */
  const sincronizarClienteExistente = async (clienteId: number) => {
    setLoading(true);
    setError(null);

    try {
      // Buscar cliente no banco
      const { data: cliente, error: erroCliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (erroCliente || !cliente) {
        throw new Error('Cliente não encontrado');
      }

      // Verificar se já está sincronizado
      if (cliente.asaas_customer_id) {
        toast.info('Cliente já está sincronizado com Asaas');
        return cliente;
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
      // - Comercial = email adicional (additionalEmails)
      // ============================================
      const contatoFinanceiro = contatos?.find(c => c.tipo_contato === 'financeiro');
      const contatoComercial = contatos?.find(c => c.tipo_contato === 'comercial');

      // Criar no Asaas
      const asaasData: AsaasCustomer = {
        name: cliente.razao_social,
        // Dados do contato FINANCEIRO
        email: contatoFinanceiro?.email || cliente.email,
        phone: contatoFinanceiro?.telefone || cliente.telefone,
        mobilePhone: contatoFinanceiro?.telefone || cliente.celular,
        // Email do contato COMERCIAL como adicional
        additionalEmails: contatoComercial?.email || undefined,
        cpfCnpj: cliente.cnpj_cpf?.replace(/\D/g, ''),
        postalCode: cliente.cep?.replace(/\D/g, ''),
        address: cliente.endereco,
        addressNumber: cliente.numero,
        complement: cliente.complemento,
        province: cliente.bairro,
        city: cliente.cidade,
        state: cliente.estado,
        stateInscription: cliente.inscricao_estadual,
        municipalInscription: cliente.inscricao_municipal,
        observations: cliente.observacoes,
        groupName: cliente.group_name,
        externalReference: String(cliente.id), // ID do ERP
      };

      const clienteAsaas = await createAsaasCustomer(asaasData);

      // Atualizar no banco
      const { error: erroUpdate } = await supabase
        .from('clientes')
        .update({
          asaas_customer_id: clienteAsaas.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clienteId);

      if (erroUpdate) {
        throw erroUpdate;
      }

      toast.success('Cliente sincronizado com Asaas');

      return {
        ...cliente,
        asaas_customer_id: clienteAsaas.id,
      };

    } catch (erro: any) {
      console.error('Erro ao sincronizar cliente:', erro);
      setError(erro.message);
      toast.error('Erro ao sincronizar: ' + erro.message);
      throw erro;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza cliente no ERP e sincroniza com Asaas
   */
  const atualizarClienteCompleto = async (
    clienteId: number,
    dadosCliente: {
      // Dados do ERP
      razao_social?: string;
      nome_fantasia?: string;
      cnpj_cpf?: string;
      email?: string;
      telefone?: string;
      celular?: string;
      cep?: string;
      endereco?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      inscricao_estadual?: string;
      inscricao_municipal?: string;
      observacoes?: string;
      // Opções
      sincronizarAsaas?: boolean; // Default: true se já tiver asaas_customer_id
      // Grupo Asaas
      group_name?: string;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      // 1. BUSCAR CLIENTE ATUAL
      const { data: clienteAtual, error: erroCliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (erroCliente || !clienteAtual) {
        throw new Error('Cliente não encontrado');
      }

      // 2. ATUALIZAR CLIENTE NO ERP
      console.log('📝 Atualizando cliente no ERP...');

      // Montar endereco_completo a partir dos campos separados
      const enderecoPartes = [
        dadosCliente.endereco,
        dadosCliente.numero,
        dadosCliente.complemento,
        dadosCliente.bairro
      ].filter(Boolean);
      const endereco_completo = enderecoPartes.length > 0 ? enderecoPartes.join(', ') : undefined;

      const updateData: any = {
        razao_social: dadosCliente.razao_social,
        nome_fantasia: dadosCliente.nome_fantasia,
        cnpj_cpf: dadosCliente.cnpj_cpf,
        email: dadosCliente.email,
        telefone: dadosCliente.telefone,
        celular: dadosCliente.celular,
        cep: dadosCliente.cep,
        endereco_completo: endereco_completo,
        cidade: dadosCliente.cidade,
        estado: dadosCliente.estado,
        inscricao_estadual: dadosCliente.inscricao_estadual,
        observacoes: dadosCliente.observacoes,
        updated_at: new Date().toISOString(),
      };

      // Adicionar campos novos apenas se existirem na tabela (após migration)
      try {
        if (dadosCliente.endereco) updateData.endereco = dadosCliente.endereco;
        if (dadosCliente.numero) updateData.numero = dadosCliente.numero;
        if (dadosCliente.complemento) updateData.complemento = dadosCliente.complemento;
        if (dadosCliente.bairro) updateData.bairro = dadosCliente.bairro;
        if (dadosCliente.inscricao_municipal) updateData.inscricao_municipal = dadosCliente.inscricao_municipal;
      } catch (e) {
        console.log('Campos de endereço separados ainda não disponíveis');
      }

      const { data: clienteAtualizado, error: erroUpdate } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', clienteId)
        .select()
        .single();

      if (erroUpdate) {
        throw new Error(`Erro ao atualizar cliente no ERP: ${erroUpdate.message}`);
      }

      console.log('✅ Cliente atualizado no ERP');
      toast.success('Cliente atualizado no sistema');

      // 3. SINCRONIZAR COM ASAAS (se habilitado e tiver asaas_customer_id)
      const deveSincronizar = dadosCliente.sincronizarAsaas !== false && clienteAtual.asaas_customer_id;

      if (deveSincronizar) {
        console.log('🔄 Sincronizando com Asaas...');

        try {
          const asaasData: Partial<AsaasCustomer> = {
            name: dadosCliente.razao_social,
            email: dadosCliente.email,
            phone: dadosCliente.telefone,
            mobilePhone: dadosCliente.celular,
            cpfCnpj: dadosCliente.cnpj_cpf?.replace(/\D/g, ''),
            postalCode: dadosCliente.cep?.replace(/\D/g, ''),
            address: dadosCliente.endereco,
            addressNumber: dadosCliente.numero,
            complement: dadosCliente.complemento,
            province: dadosCliente.bairro,
            city: dadosCliente.cidade,
            state: dadosCliente.estado,
            stateInscription: dadosCliente.inscricao_estadual,
            municipalInscription: dadosCliente.inscricao_municipal,
            observations: dadosCliente.observacoes,
            groupName: dadosCliente.group_name,
          };

          // Atualizar no Asaas
          await updateAsaasCustomer(clienteAtual.asaas_customer_id, asaasData);

          console.log('✅ Cliente atualizado no Asaas');
          toast.success('Cliente sincronizado com Asaas');

        } catch (erroAsaas: any) {
          console.error('Erro ao sincronizar com Asaas:', erroAsaas);
          toast.warning(
            'Cliente atualizado no sistema, mas não foi possível sincronizar com Asaas: ' +
            erroAsaas.message
          );
        }
      }

      return clienteAtualizado;

    } catch (erro: any) {
      console.error('Erro ao atualizar cliente:', erro);
      setError(erro.message);
      toast.error('Erro ao atualizar cliente: ' + erro.message);
      throw erro;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sincroniza múltiplos clientes existentes com Asaas (bulk)
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
      console.log('🔍 Buscando clientes para sincronizar...');
      let query = supabase.from('clientes').select('*');

      if (somenteNaoSincronizados) {
        query = query.is('asaas_customer_id', null);
      }

      if (limite) {
        query = query.limit(limite);
      }

      const { data: clientes, error: erroClientes } = await query;

      if (erroClientes) {
        throw new Error(`Erro ao buscar clientes: ${erroClientes.message}`);
      }

      if (!clientes || clientes.length === 0) {
        toast.info('Nenhum cliente encontrado para sincronizar');
        return { sincronizados: 0, erros: 0, total: 0 };
      }

      console.log(`📋 ${clientes.length} cliente(s) para sincronizar`);

      // 2. SINCRONIZAR CADA CLIENTE
      let sincronizados = 0;
      let erros = 0;

      for (const cliente of clientes) {
        try {
          // Buscar contatos do cliente
          const { data: contatos } = await supabase
            .from('clientes_contatos')
            .select('*')
            .eq('cliente_id', cliente.id)
            .eq('ativo', true);

          // ============================================
          // REGRA DE CONTATOS:
          // - Financeiro = contato principal (email, phone, mobilePhone)
          // - Comercial = email adicional (additionalEmails)
          // ============================================
          const contatoFinanceiro = contatos?.find(c => c.tipo_contato === 'financeiro');
          const contatoComercial = contatos?.find(c => c.tipo_contato === 'comercial');

          // Preparar dados de endereço
          const endereco = cliente.endereco || cliente.endereco_completo?.split(',')[0]?.trim();
          const numero = cliente.numero || cliente.endereco_completo?.split(',')[1]?.trim();
          const complemento = cliente.complemento || cliente.endereco_completo?.split(',').slice(2).join(',').trim();
          const bairro = cliente.bairro;

          // Criar no Asaas
          const asaasData: AsaasCustomer = {
            name: cliente.razao_social,
            // Dados do contato FINANCEIRO
            email: contatoFinanceiro?.email || cliente.email,
            phone: contatoFinanceiro?.telefone || cliente.telefone,
            mobilePhone: contatoFinanceiro?.telefone || cliente.celular,
            // Email do contato COMERCIAL como adicional
            additionalEmails: contatoComercial?.email || undefined,
            cpfCnpj: cliente.cnpj_cpf?.replace(/\D/g, ''),
            postalCode: cliente.cep?.replace(/\D/g, ''),
            address: endereco,
            addressNumber: numero,
            complement: complemento,
            province: bairro,
            city: cliente.cidade,
            state: cliente.estado,
            stateInscription: cliente.inscricao_estadual,
            municipalInscription: cliente.inscricao_municipal,
            observations: cliente.observacoes,
            externalReference: String(cliente.id), // ID do ERP
          };

          const clienteAsaas = await createAsaasCustomer(asaasData);

          // Atualizar no banco
          try {
            const { error: erroUpdate } = await supabase
              .from('clientes')
              .update({
                asaas_customer_id: clienteAsaas.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', cliente.id);

            if (erroUpdate) {
              if (erroUpdate.message.includes('asaas_customer_id')) {
                console.error(`⚠️ Coluna asaas_customer_id não existe. Execute a migration 20241120_add_asaas_fields.sql`);
              } else {
                console.error(`Erro ao salvar asaas_customer_id do cliente ${cliente.id}:`, erroUpdate);
              }
              erros++;
            } else {
              console.log(`✅ Cliente ${cliente.razao_social} sincronizado (${clienteAsaas.id})`);
              sincronizados++;
            }
          } catch (errUpdate: any) {
            console.error(`Erro ao atualizar cliente ${cliente.id}:`, errUpdate);
            erros++;
          }

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
        toast.success(`${sincronizados} cliente(s) sincronizado(s) com Asaas`);
      }

      if (erros > 0) {
        toast.warning(`${erros} erro(s) durante a sincronização`);
      }

      console.log('📊 Resultado da sincronização:', resultado);

      return resultado;

    } catch (erro: any) {
      console.error('Erro na sincronização bulk:', erro);
      setError(erro.message);
      toast.error('Erro na sincronização: ' + erro.message);
      throw erro;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exclui cliente do ERP e também do Asaas (se estiver sincronizado)
   */
  const excluirClienteCompleto = async (clienteId: string) => {
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

      // 2. EXCLUIR DO ASAAS (se estiver sincronizado)
      if (cliente.asaas_customer_id) {
        console.log('🗑️ Excluindo cliente do Asaas:', cliente.asaas_customer_id);

        try {
          await deleteAsaasCustomer(cliente.asaas_customer_id);
          console.log('✅ Cliente excluído do Asaas');
        } catch (erroAsaas: any) {
          console.error('Erro ao excluir do Asaas:', erroAsaas);
          toast.warning(
            'Cliente será excluído do sistema, mas não foi possível excluir do Asaas: ' +
            erroAsaas.message
          );
        }
      }

      // 3. EXCLUIR DO ERP
      console.log('🗑️ Excluindo cliente do ERP:', clienteId);
      const { error: erroDelete } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteId);

      if (erroDelete) {
        throw new Error(`Erro ao excluir cliente do ERP: ${erroDelete.message}`);
      }

      console.log('✅ Cliente excluído do ERP');
      toast.success('Cliente excluído com sucesso');

      return { error: null };

    } catch (erro: any) {
      console.error('Erro ao excluir cliente:', erro);
      setError(erro.message);
      toast.error('Erro ao excluir cliente: ' + erro.message);
      return { error: erro.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    criarClienteCompleto,
    sincronizarClienteExistente,
    atualizarClienteCompleto,
    sincronizarClientesBulk,
    excluirClienteCompleto,
    loading,
    error,
  };
}
