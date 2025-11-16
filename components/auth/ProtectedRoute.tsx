import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginPage from '../../pages/LoginPage';
import { LoadingSpinner } from '@/components/erp';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
