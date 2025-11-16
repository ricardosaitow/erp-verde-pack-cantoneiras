import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Usuario {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  user_metadata?: {
    nome?: string;
    role?: string;
  };
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const callEdgeFunction = async (action: string, method: string = 'GET', body?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}?action=${action}`, {
      method,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro na requisição');
    }

    return await response.json();
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await callEdgeFunction('list', 'GET');
      setUsuarios(data.users as Usuario[]);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const createUsuario = async (email: string, password: string, metadata?: { nome?: string; role?: string }) => {
    try {
      const data = await callEdgeFunction('create', 'POST', {
        email,
        password,
        user_metadata: metadata || {},
      });

      await fetchUsuarios();
      return { data: data.user, error: null };
    } catch (err: any) {
      console.error('Error creating user:', err);
      return { data: null, error: err.message || 'Erro ao criar usuário' };
    }
  };

  const updateUsuario = async (userId: string, updates: { email?: string; password?: string; user_metadata?: any }) => {
    try {
      const data = await callEdgeFunction('update', 'PUT', { userId, updates });

      await fetchUsuarios();
      return { data: data.user, error: null };
    } catch (err: any) {
      console.error('Error updating user:', err);
      return { data: null, error: err.message || 'Erro ao atualizar usuário' };
    }
  };

  const deleteUsuario = async (userId: string) => {
    try {
      await callEdgeFunction('delete', 'DELETE', { userId });

      await fetchUsuarios();
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting user:', err);
      return { error: err.message || 'Erro ao excluir usuário' };
    }
  };

  const refresh = fetchUsuarios;

  return {
    usuarios,
    loading,
    error,
    create: createUsuario,
    update: updateUsuario,
    delete: deleteUsuario,
    refresh,
  };
}
