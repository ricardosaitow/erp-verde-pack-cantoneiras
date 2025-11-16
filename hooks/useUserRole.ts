import { useAuth } from '../contexts/AuthContext';

export type UserRole = 'admin' | 'producao' | 'user';

export function useUserRole(): UserRole {
  const { user } = useAuth();

  if (!user) return 'user';

  // Verificar role no user_metadata
  const role = user.user_metadata?.role || 'user';
  return role as UserRole;
}

export function useIsAdmin(): boolean {
  const role = useUserRole();
  return role === 'admin';
}

export function useIsProducao(): boolean {
  const role = useUserRole();
  return role === 'producao';
}

export function useCanAccessProducao(): boolean {
  const role = useUserRole();
  // Admin e producao podem acessar o módulo de produção
  return role === 'admin' || role === 'producao';
}
