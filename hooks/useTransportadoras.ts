// ============================================
// HOOK: useTransportadoras
// ============================================
// Hook com sincronização bidirecional:
// - Base ERP → Supabase (sync)
// - Supabase → Base ERP (create/update)
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const BASE_PROXY_URL = `${SUPABASE_URL}/functions/v1/base-proxy`;

// Interface para endereço
interface TransportadoraAddress {
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  cityName?: string;
  stateAbbrev?: string;
  country?: string;
}

// Interface para dados da transportadora (compatível com a página)
export interface Transportadora {
  id: string; // UUID do Supabase
  base_id?: number; // ID no Base ERP
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: TransportadoraAddress;
  externalReference?: string;
  observations?: string;
  deleted: boolean;
  created_at?: string;
  updated_at?: string;
}

// Interface para dados do Base ERP
interface TransportadoraBase {
  id: number;
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: TransportadoraAddress;
  externalReference?: string;
  observations?: string;
  deleted?: boolean;
}

interface UseTransportadorasOptions {
  autoFetch?: boolean;
}

interface CreateTransportadoraData {
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  cityName?: string;
  stateAbbrev?: string;
  country?: string;
  externalReference?: string;
  observations?: string;
}

// Helper para fazer requisições ao Base ERP via proxy
async function baseRequest(endpoint: string, method = 'GET', data?: any) {
  const response = await fetch(BASE_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ endpoint, method, data }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro na API do Base');
  }

  return result;
}

// Converte dados do Supabase para formato da interface
function convertFromSupabase(data: any): Transportadora {
  return {
    id: data.id,
    base_id: data.base_id,
    name: data.nome,
    cpfCnpj: data.cnpj,
    email: data.email,
    phone: data.telefone,
    mobilePhone: data.celular,
    address: {
      postalCode: data.cep,
      address: data.endereco,
      addressNumber: data.numero,
      complement: data.complemento,
      province: data.bairro,
      cityName: data.cidade,
      stateAbbrev: data.estado,
      country: data.pais || 'Brasil',
    },
    externalReference: data.referencia_externa,
    observations: data.observacoes,
    deleted: !data.ativo,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

// Converte dados da interface para formato do Supabase
function convertToSupabase(data: CreateTransportadoraData) {
  return {
    nome: data.name,
    cnpj: data.cpfCnpj || null,
    email: data.email || null,
    telefone: data.phone || null,
    celular: data.mobilePhone || null,
    cep: data.postalCode || null,
    endereco: data.address || null,
    numero: data.addressNumber || null,
    complemento: data.complement || null,
    bairro: data.province || null,
    cidade: data.cityName || null,
    estado: data.stateAbbrev || null,
    pais: data.country || 'Brasil',
    referencia_externa: data.externalReference || null,
    observacoes: data.observations || null,
  };
}

export function useTransportadoras(options: UseTransportadorasOptions = {}) {
  const { autoFetch = true } = options;

  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // BUSCAR DO BANCO LOCAL (Supabase)
  // ============================================
  const fetchTransportadoras = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('transportadoras')
        .select('*')
        .order('nome');

      if (dbError) {
        // Se a tabela não existir, retornar vazio sem erro
        if (dbError.code === 'PGRST204' || dbError.message?.includes('does not exist')) {
          console.log('⚠️ Tabela transportadoras não existe. Execute a migration.');
          setTransportadoras([]);
          return;
        }
        throw dbError;
      }

      // Converter para formato da interface
      const transportadorasConvertidas = (data || []).map(convertFromSupabase);
      setTransportadoras(transportadorasConvertidas);
    } catch (err: any) {
      console.error('❌ Erro ao buscar transportadoras:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // SINCRONIZAR DO BASE ERP → SUPABASE (BULK)
  // ============================================
  const sincronizarBulk = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Sincronizando transportadoras do Base ERP...');

      // 1. Buscar do Base ERP
      const response = await baseRequest('/api/v1/shippingCompanies', 'GET');
      const transportadorasBase: TransportadoraBase[] = response.data?.content || response.data || [];

      if (!Array.isArray(transportadorasBase)) {
        throw new Error('Resposta inválida do Base ERP');
      }

      console.log(`📥 ${transportadorasBase.length} transportadoras encontradas no Base`);

      // 2. Para cada transportadora do Base, inserir ou atualizar no Supabase
      let sincronizados = 0;
      let erros = 0;

      for (const tBase of transportadorasBase) {
        try {
          // Verificar se já existe no Supabase
          const { data: existente } = await supabase
            .from('transportadoras')
            .select('id')
            .eq('base_id', tBase.id)
            .single();

          const dadosLocal = {
            nome: tBase.name,
            base_id: tBase.id,
            cnpj: tBase.cpfCnpj || null,
            telefone: tBase.phone || null,
            celular: tBase.mobilePhone || null,
            email: tBase.email || null,
            cep: tBase.address?.postalCode || null,
            endereco: tBase.address?.address || null,
            numero: tBase.address?.addressNumber || null,
            complemento: tBase.address?.complement || null,
            bairro: tBase.address?.province || null,
            cidade: tBase.address?.cityName || null,
            estado: tBase.address?.stateAbbrev || null,
            pais: tBase.address?.country || 'Brasil',
            referencia_externa: tBase.externalReference || null,
            observacoes: tBase.observations || null,
            ativo: !tBase.deleted,
            updated_at: new Date().toISOString(),
          };

          if (existente) {
            // Atualizar
            await supabase
              .from('transportadoras')
              .update(dadosLocal)
              .eq('base_id', tBase.id);
          } else {
            // Inserir
            await supabase
              .from('transportadoras')
              .insert(dadosLocal);
          }
          sincronizados++;
        } catch (err) {
          console.error(`Erro ao sincronizar transportadora ${tBase.name}:`, err);
          erros++;
        }
      }

      console.log(`✅ Sincronização concluída: ${sincronizados} sincronizadas, ${erros} erros`);
      toast.success(`Sincronização concluída: ${sincronizados} transportadoras`);

      // 3. Recarregar lista local
      await fetchTransportadoras();

      return { sincronizados, erros, total: transportadorasBase.length };
    } catch (err: any) {
      console.error('❌ Erro na sincronização:', err);
      setError(err.message);
      toast.error('Erro na sincronização: ' + err.message);
      return { sincronizados: 0, erros: 0, total: 0 };
    } finally {
      setLoading(false);
    }
  }, [fetchTransportadoras]);

  // ============================================
  // CRIAR NOVA TRANSPORTADORA
  // Salva no Supabase E envia para o Base ERP
  // ============================================
  const create = useCallback(async (data: CreateTransportadoraData) => {
    try {
      console.log('➕ Criando transportadora...', data);

      // 1. Criar no Base ERP primeiro
      const baseData = {
        name: data.name,
        cpfCnpj: data.cpfCnpj,
        email: data.email,
        phone: data.phone,
        mobilePhone: data.mobilePhone,
        address: {
          postalCode: data.postalCode,
          address: data.address,
          addressNumber: data.addressNumber,
          complement: data.complement,
          province: data.province,
          cityName: data.cityName,
          stateAbbrev: data.stateAbbrev,
          country: data.country || 'Brasil',
        },
        externalReference: data.externalReference,
        observations: data.observations,
      };

      const baseResponse = await baseRequest('/api/v1/shippingCompanies', 'POST', baseData);
      const transportadoraCriada = baseResponse.data;

      if (!transportadoraCriada?.id) {
        throw new Error('Base ERP não retornou ID da transportadora criada');
      }

      console.log('✅ Criada no Base ERP com ID:', transportadoraCriada.id);

      // 2. Salvar no Supabase com o base_id
      const supabaseData = {
        ...convertToSupabase(data),
        base_id: transportadoraCriada.id,
        ativo: true,
      };

      const { data: localData, error: localError } = await supabase
        .from('transportadoras')
        .insert(supabaseData)
        .select()
        .single();

      if (localError) {
        console.error('Erro ao salvar localmente:', localError);
        // Mesmo com erro local, a transportadora foi criada no Base
        toast.warning('Transportadora criada no Base, mas erro ao salvar localmente');
      } else {
        console.log('✅ Salva no Supabase com ID:', localData.id);
        toast.success('Transportadora criada com sucesso!');
      }

      // 3. Recarregar lista
      await fetchTransportadoras();

      return { data: localData ? convertFromSupabase(localData) : null, error: null };
    } catch (err: any) {
      console.error('❌ Erro ao criar transportadora:', err);
      toast.error('Erro ao criar transportadora: ' + err.message);
      return { data: null, error: err.message };
    }
  }, [fetchTransportadoras]);

  // ============================================
  // ATUALIZAR TRANSPORTADORA
  // Atualiza no Supabase E no Base ERP
  // ============================================
  const update = useCallback(async (id: string, data: Partial<CreateTransportadoraData>) => {
    try {
      console.log('✏️ Atualizando transportadora...', id, data);

      // 1. Buscar transportadora para pegar o base_id
      const { data: transportadora } = await supabase
        .from('transportadoras')
        .select('base_id')
        .eq('id', id)
        .single();

      // 2. Se tiver base_id, atualizar no Base ERP
      if (transportadora?.base_id) {
        const baseData = {
          name: data.name,
          cpfCnpj: data.cpfCnpj,
          email: data.email,
          phone: data.phone,
          mobilePhone: data.mobilePhone,
          address: {
            postalCode: data.postalCode,
            address: data.address,
            addressNumber: data.addressNumber,
            complement: data.complement,
            province: data.province,
            cityName: data.cityName,
            stateAbbrev: data.stateAbbrev,
            country: data.country || 'Brasil',
          },
          externalReference: data.externalReference,
          observations: data.observations,
        };

        await baseRequest(`/api/v1/shippingCompanies/${transportadora.base_id}`, 'PUT', baseData);
        console.log('✅ Atualizada no Base ERP');
      }

      // 3. Atualizar no Supabase
      const supabaseData = {
        ...convertToSupabase(data as CreateTransportadoraData),
        updated_at: new Date().toISOString(),
      };

      const { error: localError } = await supabase
        .from('transportadoras')
        .update(supabaseData)
        .eq('id', id);

      if (localError) throw localError;

      console.log('✅ Atualizada no Supabase');
      toast.success('Transportadora atualizada com sucesso!');

      // 4. Recarregar lista
      await fetchTransportadoras();

      return { error: null };
    } catch (err: any) {
      console.error('❌ Erro ao atualizar transportadora:', err);
      toast.error('Erro ao atualizar: ' + err.message);
      return { error: err.message };
    }
  }, [fetchTransportadoras]);

  // ============================================
  // INATIVAR TRANSPORTADORA
  // ============================================
  const inativar = useCallback(async (id: string) => {
    try {
      console.log('🔒 Inativando transportadora...', id);

      // 1. Buscar base_id
      const { data: transportadora } = await supabase
        .from('transportadoras')
        .select('base_id')
        .eq('id', id)
        .single();

      // 2. Se tiver base_id, inativar no Base ERP
      if (transportadora?.base_id) {
        await baseRequest(`/api/v1/shippingCompanies/${transportadora.base_id}`, 'DELETE');
        console.log('✅ Inativada no Base ERP');
      }

      // 3. Inativar no Supabase
      await supabase
        .from('transportadoras')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      toast.success('Transportadora inativada');
      await fetchTransportadoras();

      return { error: null };
    } catch (err: any) {
      console.error('❌ Erro ao inativar:', err);
      toast.error('Erro ao inativar: ' + err.message);
      return { error: err.message };
    }
  }, [fetchTransportadoras]);

  // ============================================
  // ATIVAR TRANSPORTADORA
  // ============================================
  const ativar = useCallback(async (id: string) => {
    try {
      console.log('🔓 Ativando transportadora...', id);

      // Ativar no Supabase
      await supabase
        .from('transportadoras')
        .update({ ativo: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      toast.success('Transportadora ativada');
      await fetchTransportadoras();

      return { error: null };
    } catch (err: any) {
      console.error('❌ Erro ao ativar:', err);
      toast.error('Erro ao ativar: ' + err.message);
      return { error: err.message };
    }
  }, [fetchTransportadoras]);

  // Auto-fetch ao montar
  useEffect(() => {
    if (autoFetch) {
      fetchTransportadoras();
    }
  }, [autoFetch, fetchTransportadoras]);

  return {
    transportadoras,
    loading,
    error,
    refetch: fetchTransportadoras,
    sincronizarBulk,
    create,
    update,
    inativar,
    ativar,
  };
}
