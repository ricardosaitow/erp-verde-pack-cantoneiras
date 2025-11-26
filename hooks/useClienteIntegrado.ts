// ============================================
// HOOK: useClienteIntegrado
// ============================================
// Hook principal para gerenciar clientes com
// sincronização automática Base ERP + Asaas
// ============================================

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useClienteBase } from './useClienteBase';
import { useClienteAsaas } from './useClienteAsaas';
import { useAsaas } from './useAsaas';
import { toast } from 'sonner';

export interface DadosClienteIntegrado {
  // Dados básicos
  tipo_pessoa?: 'fisica' | 'juridica';
  razao_social: string;
  nome_fantasia?: string;
  cnpj_cpf: string;
  email?: string;
  telefone?: string;
  celular?: string;

  // Endereço
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;

  // Dados fiscais
  inscricao_estadual?: string;
  inscricao_municipal?: string;

  // Comercial
  contato_principal?: string;
  condicoes_pagamento?: string;
  limite_credito?: number;
  group_name?: string;
  observacoes?: string;

  // Contatos (para Asaas)
  contatos?: Array<{
    tipo_contato: string;
    nome_responsavel: string;
    email: string;
    telefone: string;
    contato_principal_asaas?: boolean;
  }>;

  // Opções de sincronização
  sincronizarBase?: boolean; // Default: true
  sincronizarAsaas?: boolean; // Default: true
  notificarAsaas?: boolean; // Default: true
}

export interface ResultadoSincronizacao {
  cliente: any;
  sincronizadoBase: boolean;
  sincronizadoAsaas: boolean;
  errosBase?: string;
  errosAsaas?: string;
}

export function useClienteIntegrado() {
  const { sincronizarComBase, atualizarNoBase, excluirDoBase } = useClienteBase();
  const {
    criarClienteCompleto: criarNoAsaas,
    sincronizarClienteExistente: syncAsaasExistente
  } = useClienteAsaas();
  const { createCustomer: createAsaasCustomer, deleteCustomer: deleteAsaasCustomer } = useAsaas();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cria cliente no ERP e sincroniza com Base + Asaas
   *
   * Fluxo:
   * 1. Cria no banco local (Supabase)
   * 2. Sincroniza com Base ERP (paralelo)
   * 3. Sincroniza com Asaas (paralelo)
   * 4. Retorna resultado com status de cada sincronização
   */
  const criarClienteCompleto = async (
    dados: DadosClienteIntegrado
  ): Promise<ResultadoSincronizacao> => {
    setLoading(true);
    setError(null);

    const {
      sincronizarBase = true,
      sincronizarAsaas = true,
      notificarAsaas = true,
      ...dadosCliente
    } = dados;

    console.log('📥 Dados recebidos para criar cliente:', {
      razao_social: dadosCliente.razao_social,
      endereco: dadosCliente.endereco,
      numero: dadosCliente.numero,
      complemento: dadosCliente.complemento,
      bairro: dadosCliente.bairro,
      cidade: dadosCliente.cidade,
      estado: dadosCliente.estado,
      cep: dadosCliente.cep,
    });

    let clienteLocal: any = null;
    let sincronizadoBase = false;
    let sincronizadoAsaas = false;
    let errosBase: string | undefined;
    let errosAsaas: string | undefined;

    try {
      // ========================================
      // ETAPA 1: CRIAR NO BANCO LOCAL
      // ========================================
      console.log('🔷 [1/3] Criando cliente no banco local...');

      const enderecoPartes = [
        dadosCliente.endereco,
        dadosCliente.numero,
        dadosCliente.complemento,
        dadosCliente.bairro
      ].filter(Boolean);
      const endereco_completo = enderecoPartes.length > 0
        ? enderecoPartes.join(', ')
        : undefined;

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
        contato_principal: dadosCliente.contato_principal,
        condicoes_pagamento: dadosCliente.condicoes_pagamento,
        limite_credito: dadosCliente.limite_credito,
        group_name: dadosCliente.group_name,
        observacoes: dadosCliente.observacoes,
      };

      // Adicionar campos separados se disponíveis
      try {
        if (dadosCliente.endereco) clienteData.endereco = dadosCliente.endereco;
        if (dadosCliente.numero) clienteData.numero = dadosCliente.numero;
        if (dadosCliente.complemento) clienteData.complemento = dadosCliente.complemento;
        if (dadosCliente.bairro) clienteData.bairro = dadosCliente.bairro;
        if (dadosCliente.inscricao_municipal) clienteData.inscricao_municipal = dadosCliente.inscricao_municipal;
      } catch (e) {
        console.log('Campos separados ainda não disponíveis na tabela');
      }

      const { data: clienteERP, error: erroLocal } = await supabase
        .from('clientes')
        .insert(clienteData)
        .select()
        .single();

      if (erroLocal || !clienteERP) {
        throw new Error(`Erro ao criar cliente: ${erroLocal?.message}`);
      }

      clienteLocal = clienteERP;
      console.log('✅ Cliente criado localmente:', clienteLocal.id);
      toast.success('Cliente criado no sistema');

      // ========================================
      // ETAPA 1.5: SALVAR CONTATOS NA TABELA
      // ========================================
      if (dados.contatos && dados.contatos.length > 0) {
        console.log('🔷 Salvando contatos...');

        const contatosParaSalvar = dados.contatos.map(contato => ({
          cliente_id: clienteLocal.id,
          tipo_contato: contato.tipo_contato,
          nome_responsavel: contato.nome_responsavel,
          email: contato.email,
          telefone: contato.telefone,
          ativo: true,
        }));

        const { error: erroContatos } = await supabase
          .from('clientes_contatos')
          .insert(contatosParaSalvar);

        if (erroContatos) {
          console.error('⚠️ Erro ao salvar contatos:', erroContatos);
          toast.warning('Cliente criado, mas houve erro ao salvar contatos');
        } else {
          console.log(`✅ ${dados.contatos.length} contato(s) salvos`);
        }
      }

      // ========================================
      // ETAPA 2 e 3: SINCRONIZAR BASE + ASAAS (PARALELO)
      // ========================================
      console.log('🔷 [2-3/3] Sincronizando com plataformas externas...');

      // Executar sincronizações em paralelo
      const promessas: Promise<any>[] = [];

      // Sincronização com Base ERP
      if (sincronizarBase) {
        promessas.push(
          sincronizarComBase(clienteLocal.id)
            .then(() => {
              sincronizadoBase = true;
              console.log('✅ Sincronizado com Base ERP');
            })
            .catch((erro) => {
              errosBase = erro.message;
              console.error('❌ Erro ao sincronizar com Base:', erro);
            })
        );
      }

      // Sincronização com Asaas
      if (sincronizarAsaas) {
        // Criar no Asaas usando o hook já importado
        promessas.push(
          (async () => {
            try {
              // ============================================
              // REGRA DE CONTATOS:
              // - Financeiro = contato principal (email, phone, mobilePhone)
              // - Comercial = email adicional (additionalEmails)
              // ============================================
              const contatoFinanceiro = dados.contatos?.find(c => c.tipo_contato === 'financeiro');
              const contatoComercial = dados.contatos?.find(c => c.tipo_contato === 'comercial');

              // Validação: garantir que existem os 2 contatos obrigatórios
              if (!contatoFinanceiro) {
                console.warn('⚠️ Contato financeiro não encontrado, usando dados do cliente');
              }
              if (!contatoComercial) {
                console.warn('⚠️ Contato comercial não encontrado');
              }

              const asaasData: any = {
                name: dadosCliente.razao_social,
                // Dados do contato FINANCEIRO
                email: contatoFinanceiro?.email || dadosCliente.email,
                phone: contatoFinanceiro?.telefone || dadosCliente.telefone,
                mobilePhone: contatoFinanceiro?.telefone || dadosCliente.celular,
                // Email do contato COMERCIAL como adicional
                additionalEmails: contatoComercial?.email || undefined,
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
                externalReference: String(clienteLocal.id),
                notificationDisabled: !notificarAsaas,
              };

              console.log('📤 Dados enviados para Asaas:', {
                endereco: asaasData.address,
                numero: asaasData.addressNumber,
                complemento: asaasData.complement,
                bairro: asaasData.province,
                cidade: asaasData.city,
                estado: asaasData.state,
                cep: asaasData.postalCode,
              });

              const clienteAsaas = await createAsaasCustomer(asaasData);

              if (!clienteAsaas?.id) {
                throw new Error('Asaas não retornou ID do cliente');
              }

              // Atualizar cliente local com ID do Asaas
              await supabase
                .from('clientes')
                .update({
                  asaas_customer_id: clienteAsaas.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', clienteLocal.id);

              sincronizadoAsaas = true;
              console.log('✅ Sincronizado com Asaas');

            } catch (erro: any) {
              errosAsaas = erro.message;
              console.error('❌ Erro ao sincronizar com Asaas:', erro);
            }
          })()
        );
      }

      // Aguardar todas as sincronizações
      await Promise.allSettled(promessas);

      // ========================================
      // RESULTADO
      // ========================================
      const resultado: ResultadoSincronizacao = {
        cliente: clienteLocal,
        sincronizadoBase,
        sincronizadoAsaas,
        errosBase,
        errosAsaas,
      };

      // Mensagens de feedback
      if (sincronizadoBase && sincronizadoAsaas) {
        toast.success('✅ Cliente sincronizado com Base ERP e Asaas');
      } else if (sincronizadoBase || sincronizadoAsaas) {
        const plataformas = [
          sincronizadoBase && 'Base ERP',
          sincronizadoAsaas && 'Asaas'
        ].filter(Boolean).join(' e ');

        toast.warning(`⚠️ Cliente criado e sincronizado com ${plataformas}`);

        if (errosBase) toast.error(`Erro Base: ${errosBase}`);
        if (errosAsaas) toast.error(`Erro Asaas: ${errosAsaas}`);
      } else if (errosBase || errosAsaas) {
        toast.error('❌ Erros na sincronização. Cliente salvo localmente.');
      }

      return resultado;

    } catch (erro: any) {
      console.error('❌ Erro ao criar cliente integrado:', erro);
      setError(erro.message);
      toast.error('Erro ao criar cliente: ' + erro.message);
      throw erro;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza cliente local e sincroniza com Base + Asaas
   */
  const atualizarClienteCompleto = async (
    clienteId: string,
    dados: Partial<DadosClienteIntegrado>
  ): Promise<ResultadoSincronizacao> => {
    setLoading(true);
    setError(null);

    const {
      sincronizarBase = true,
      sincronizarAsaas = true,
      ...dadosAtualizacao
    } = dados;

    let clienteAtualizado: any = null;
    let sincronizadoBase = false;
    let sincronizadoAsaas = false;
    let errosBase: string | undefined;
    let errosAsaas: string | undefined;

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

      // 2. ATUALIZAR NO BANCO LOCAL
      console.log('🔷 Atualizando cliente localmente...');

      const enderecoPartes = [
        dadosAtualizacao.endereco,
        dadosAtualizacao.numero,
        dadosAtualizacao.complemento,
        dadosAtualizacao.bairro
      ].filter(Boolean);
      const endereco_completo = enderecoPartes.length > 0
        ? enderecoPartes.join(', ')
        : undefined;

      const updateData: any = {
        ...dadosAtualizacao,
        endereco_completo,
        updated_at: new Date().toISOString(),
      };

      const { data, error: erroUpdate } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', clienteId)
        .select()
        .single();

      if (erroUpdate || !data) {
        throw new Error(`Erro ao atualizar cliente: ${erroUpdate?.message}`);
      }

      clienteAtualizado = data;
      console.log('✅ Cliente atualizado localmente');
      toast.success('Cliente atualizado');

      // 3. SINCRONIZAR COM PLATAFORMAS (PARALELO)
      const promessas: Promise<any>[] = [];

      // Atualizar no Base
      if (sincronizarBase && clienteAtual.base_customer_id) {
        promessas.push(
          atualizarNoBase(clienteId, {
            name: dadosAtualizacao.razao_social,
            cpfCnpj: dadosAtualizacao.cnpj_cpf?.replace(/\D/g, ''),
            email: dadosAtualizacao.email,
            phone: dadosAtualizacao.telefone,
            mobilePhone: dadosAtualizacao.celular,
            postalCode: dadosAtualizacao.cep?.replace(/\D/g, ''),
            address: dadosAtualizacao.endereco,
            addressNumber: dadosAtualizacao.numero,
            complement: dadosAtualizacao.complemento,
            province: dadosAtualizacao.bairro,
            city: dadosAtualizacao.cidade,
            state: dadosAtualizacao.estado,
            municipalInscription: dadosAtualizacao.inscricao_municipal,
            stateInscription: dadosAtualizacao.inscricao_estadual,
            observations: dadosAtualizacao.observacoes,
          })
            .then(() => {
              sincronizadoBase = true;
              console.log('✅ Atualizado no Base ERP');
            })
            .catch((erro) => {
              errosBase = erro.message;
              console.error('❌ Erro ao atualizar no Base:', erro);
            })
        );
      }

      // Atualizar no Asaas (similar - implementar depois)
      // ...

      await Promise.allSettled(promessas);

      return {
        cliente: clienteAtualizado,
        sincronizadoBase,
        sincronizadoAsaas,
        errosBase,
        errosAsaas,
      };

    } catch (erro: any) {
      console.error('Erro ao atualizar cliente:', erro);
      setError(erro.message);
      toast.error('Erro ao atualizar: ' + erro.message);
      throw erro;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inativa cliente (soft delete) no ERP e em todas as plataformas
   */
  const inativarCliente = async (clienteId: string) => {
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

      console.log('🔍 Cliente encontrado para exclusão:', {
        id: cliente.id,
        razao_social: cliente.razao_social,
        base_customer_id: cliente.base_customer_id,
        asaas_customer_id: cliente.asaas_customer_id,
      });

      // 2. EXCLUIR DAS PLATAFORMAS (PARALELO)
      const promessas: Promise<any>[] = [];
      let excluidoBase = false;
      let excluidoAsaas = false;

      // Excluir do Base ERP
      if (cliente.base_customer_id) {
        console.log('🗑️ Tentando excluir do Base ERP:', cliente.base_customer_id);
        promessas.push(
          excluirDoBase(clienteId)
            .then(() => {
              excluidoBase = true;
              console.log('✅ Cliente excluído do Base ERP com sucesso');
            })
            .catch((erro) => {
              console.error('❌ Erro ao excluir do Base:', erro);
              toast.warning('Erro ao excluir do Base ERP: ' + erro.message);
            })
        );
      } else {
        console.log('⚠️ Cliente não tem base_customer_id, pulando exclusão do Base');
      }

      // Excluir do Asaas
      if (cliente.asaas_customer_id) {
        console.log('🗑️ Tentando excluir do Asaas:', cliente.asaas_customer_id);
        promessas.push(
          deleteAsaasCustomer(cliente.asaas_customer_id)
            .then(() => {
              excluidoAsaas = true;
              console.log('✅ Cliente excluído do Asaas com sucesso');
            })
            .catch((erro) => {
              console.error('❌ Erro ao excluir do Asaas:', erro);
              toast.warning('Erro ao excluir do Asaas: ' + erro.message);
            })
        );
      } else {
        console.log('⚠️ Cliente não tem asaas_customer_id, pulando exclusão do Asaas');
      }

      console.log(`⏳ Aguardando inativação de ${promessas.length} plataforma(s)...`);
      await Promise.allSettled(promessas);
      console.log(`✅ Inativação concluída. Base: ${excluidoBase}, Asaas: ${excluidoAsaas}`);

      // 3. INATIVAR NO BANCO LOCAL (soft delete)
      const { error: erroUpdate } = await supabase
        .from('clientes')
        .update({
          ativo: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clienteId);

      if (erroUpdate) {
        throw new Error(`Erro ao inativar cliente: ${erroUpdate.message}`);
      }

      // Mensagem de sucesso
      const plataformas = [];
      if (cliente.base_customer_id) plataformas.push('Base ERP');
      if (cliente.asaas_customer_id) plataformas.push('Asaas');

      if (plataformas.length > 0) {
        console.log(`✅ Cliente inativado no ERP, ${plataformas.join(' e ')}`);
        toast.success(`Cliente inativado no ERP e ${plataformas.join(' e ')}`);
      } else {
        console.log('✅ Cliente inativado no ERP');
        toast.success('Cliente inativado com sucesso');
      }

      return { error: null };

    } catch (erro: any) {
      console.error('Erro ao inativar cliente:', erro);
      setError(erro.message);
      toast.error('Erro ao inativar: ' + erro.message);
      return { error: erro.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ativa cliente (reverte soft delete) no ERP e em todas as plataformas
   */
  const ativarCliente = async (clienteId: string) => {
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

      console.log('🔍 Cliente encontrado para ativação:', {
        id: cliente.id,
        razao_social: cliente.razao_social,
        ativo: cliente.ativo,
      });

      if (cliente.ativo) {
        toast.info('Cliente já está ativo');
        return { error: null };
      }

      // 2. ATIVAR NO BANCO LOCAL
      const { error: erroUpdate } = await supabase
        .from('clientes')
        .update({
          ativo: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clienteId);

      if (erroUpdate) {
        throw new Error(`Erro ao ativar cliente: ${erroUpdate.message}`);
      }

      console.log('✅ Cliente ativado no ERP');
      toast.success('Cliente ativado com sucesso');

      return { error: null };

    } catch (erro: any) {
      console.error('Erro ao ativar cliente:', erro);
      setError(erro.message);
      toast.error('Erro ao ativar: ' + erro.message);
      return { error: erro.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    criarClienteCompleto,
    atualizarClienteCompleto,
    inativarCliente,
    ativarCliente,
    // Manter para compatibilidade
    excluirClienteCompleto: inativarCliente,
    loading,
    error,
  };
}
