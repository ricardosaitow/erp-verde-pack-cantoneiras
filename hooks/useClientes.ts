import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Cliente, ClienteContato } from '../lib/database.types';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchClientes() {
    try {
      setLoading(true);
      setError(null);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      }
      
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('razao_social');

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        
        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
          throw new Error('Credenciais do Supabase não configuradas ou inválidas. Configure o arquivo .env.local com suas credenciais.');
        }
        
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          throw new Error('Tabela "clientes" não encontrada. Execute o schema SQL no Supabase.');
        }
        
        throw error;
      }
      
      setClientes(data || []);
      console.log(`✅ ${data?.length || 0} cliente(s) carregado(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar clientes';
      setError(errorMessage);
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClientes();
  }, []);

  async function createCliente(
    cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>,
    contatos?: Omit<ClienteContato, 'id' | 'cliente_id' | 'created_at' | 'updated_at'>[]
  ) {
    try {
      // 1. Criar cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .insert([cliente])
        .select()
        .single();

      if (clienteError) throw clienteError;

      // 2. Se houver contatos, criar os contatos
      if (contatos && contatos.length > 0 && clienteData) {
        const contatosComClienteId = contatos.map(contato => ({
          ...contato,
          cliente_id: clienteData.id,
          ativo: true
        }));

        const { error: contatosError } = await supabase
          .from('clientes_contatos')
          .insert(contatosComClienteId);

        if (contatosError) {
          console.error('Erro ao criar contatos:', contatosError);
          throw contatosError;
        }
      }

      await fetchClientes();
      return { data: clienteData, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao criar cliente' };
    }
  }

  async function updateCliente(
    id: string,
    cliente: Partial<Cliente>,
    contatos?: Omit<ClienteContato, 'id' | 'cliente_id' | 'created_at' | 'updated_at'>[]
  ) {
    try {
      // 1. Atualizar cliente
      const { data, error } = await supabase
        .from('clientes')
        .update(cliente)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 2. Se houver contatos, atualizar (deletar todos e recriar)
      if (contatos) {
        // Deletar contatos existentes
        await supabase
          .from('clientes_contatos')
          .delete()
          .eq('cliente_id', id);

        // Criar novos contatos
        if (contatos.length > 0) {
          const contatosComClienteId = contatos.map(contato => ({
            ...contato,
            cliente_id: id,
            ativo: true
          }));

          const { error: contatosError } = await supabase
            .from('clientes_contatos')
            .insert(contatosComClienteId);

          if (contatosError) {
            console.error('Erro ao atualizar contatos:', contatosError);
            throw contatosError;
          }
        }
      }

      await fetchClientes();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao atualizar cliente' };
    }
  }

  async function deleteCliente(id: string) {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchClientes();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir cliente' };
    }
  }

  async function fetchContatos(clienteId: string): Promise<ClienteContato[]> {
    try {
      const { data, error } = await supabase
        .from('clientes_contatos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .order('created_at');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
      return [];
    }
  }

  return {
    clientes,
    loading,
    error,
    refresh: fetchClientes,
    create: createCliente,
    update: updateCliente,
    delete: deleteCliente,
    fetchContatos,
  };
}

