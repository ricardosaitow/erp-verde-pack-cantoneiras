import { useAuth } from '../contexts/AuthContext';

export function useIsAdmin(): boolean {
  const { user } = useAuth();

  if (!user) return false;

  // Verificar se o usuário tem role 'admin' no user_metadata
  const role = user.user_metadata?.role || 'user';
  return role === 'admin';
}
