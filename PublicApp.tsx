import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import DespachoPublicoPage from './pages/DespachoPublicoPage';

const PublicApp: React.FC = () => {
  const [route, setRoute] = useState<string>('');

  useEffect(() => {
    // Get route from URL
    const path = window.location.pathname;
    setRoute(path);
  }, []);

  const renderPublicPage = () => {
    if (route.startsWith('/despacho/publico')) {
      return <DespachoPublicoPage />;
    }

    // Default: redirect to main app
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">ERP Verde Pack</h1>
          <p className="text-gray-600 mt-2">Página não encontrada</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" richColors closeButton />
      {renderPublicPage()}
    </div>
  );
};

export default PublicApp;
