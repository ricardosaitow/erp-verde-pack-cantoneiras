
import React, { useState, useCallback, useEffect } from 'react';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useUserRole } from './hooks/useUserRole';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import MateriaPrimasPage from './pages/MateriaPrimasPage';
import ClientesPage from './pages/ClientesPage';
import FornecedoresPage from './pages/FornecedoresPage';
import TransportadorasPage from './pages/TransportadorasPage';
import CategoriasPage from './pages/CategoriasPage';
import PedidosPage from './pages/PedidosPage';
import OrdensProducaoPage from './pages/OrdensProducaoPage';
import ProdutosRevendaPage from './pages/ProdutosRevendaPage';
import MateriasPrimasEstoquePage from './pages/MateriasPrimasEstoquePage';
import MovimentacoesPage from './pages/MovimentacoesPage';
import InventarioPage from './pages/InventarioPage';
import AlertasPage from './pages/AlertasPage';
import UsuariosPage from './pages/UsuariosPage';
import LinhaProducaoPage from './pages/LinhaProducaoPage';
import DespachoPage from './pages/DespachoPage';
import DespachoPublicoPage from './pages/DespachoPublicoPage';
import ConferenciaPalletPage from './pages/ConferenciaPalletPage';
import ComprasPage from './pages/ComprasPage';
import PlaceholderPage from './pages/PlaceholderPage';
import TesteAsaas from './pages/TesteAsaas';
import TesteAsaasCompleto from './pages/TesteAsaasCompleto';
import TesteFluxoCliente from './pages/TesteFluxoCliente';
import TesteBase from './pages/TesteBase';
import TesteClienteIntegrado from './pages/TesteClienteIntegrado';
import ImportarProdutosBasePage from './pages/ImportarProdutosBasePage';

export type Page = 'Dashboard' | 'Clientes' | 'Orçamentos' | 'Pedidos' | 'Despacho' | 'Relatórios de Vendas' | 'Ordens de Produção' | 'Linha de Produção' | 'Relatórios de Produção' | 'Produtos Revenda' | 'Matérias-Primas' | 'Compras' | 'Movimentações' | 'Inventário' | 'Alertas' | 'Produtos' | 'Matéria-Prima' | 'Fornecedores' | 'Transportadoras' | 'Categorias' | 'Contas a Receber' | 'Contas a Pagar' | 'Fluxo de Caixa' | 'Análise de Lucratividade' | 'Relatórios Gerais' | 'Usuários' | 'Permissões' | 'Parâmetros' | 'Teste Asaas' | 'Teste Asaas Completo' | 'Fluxo Cliente ERP+Asaas' | 'Teste Base ERP' | 'Teste Cliente Integrado' | 'Importar Produtos Base';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isPublicDespacho, setIsPublicDespacho] = useState(false);
  const [isPublicPalletConferencia, setIsPublicPalletConferencia] = useState(false);

  // Check if it's public despacho page or pallet conferencia page
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/despacho/publico')) {
      setIsPublicDespacho(true);
    } else if (path.includes('/pallet/conferir')) {
      setIsPublicPalletConferencia(true);
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <DashboardPage />;
      case 'Produtos':
        return <ProductsPage />;
      case 'Matéria-Prima':
        return <MateriaPrimasPage />;
      case 'Clientes':
        return <ClientesPage />;
      case 'Fornecedores':
        return <FornecedoresPage />;
      case 'Transportadoras':
        return <TransportadorasPage />;
      case 'Categorias':
        return <CategoriasPage />;
      case 'Pedidos':
        return <PedidosPage />;
      case 'Ordens de Produção':
        return <OrdensProducaoPage />;
      case 'Linha de Produção':
        return <LinhaProducaoPage />;
      case 'Despacho':
        return <DespachoPage />;
      case 'Produtos Revenda':
        return <ProdutosRevendaPage />;
      case 'Matérias-Primas':
        return <MateriasPrimasEstoquePage />;
      case 'Compras':
        return <ComprasPage />;
      case 'Movimentações':
        return <MovimentacoesPage />;
      case 'Inventário':
        return <InventarioPage />;
      case 'Alertas':
        return <AlertasPage />;
      case 'Usuários':
        return <UsuariosPage />;
      case 'Teste Asaas':
        return <TesteAsaas />;
      case 'Teste Asaas Completo':
        return <TesteAsaasCompleto />;
      case 'Fluxo Cliente ERP+Asaas':
        return <TesteFluxoCliente />;
      case 'Teste Base ERP':
        return <TesteBase />;
      case 'Teste Cliente Integrado':
        return <TesteClienteIntegrado />;
      case 'Importar Produtos Base':
        return <ImportarProdutosBasePage />;
      default:
        return <PlaceholderPage title={currentPage} />;
    }
  };

  const handleSetPage = useCallback((page: Page) => {
    setCurrentPage(page);
  }, []);

  const userRole = useUserRole();

  // If it's public despacho page, show it without authentication
  if (isPublicDespacho) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" richColors closeButton />
        <DespachoPublicoPage />
      </div>
    );
  }

  // If it's public pallet conferencia page, show it without authentication
  if (isPublicPalletConferencia) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" richColors closeButton />
        <ConferenciaPalletPage />
      </div>
    );
  }

  // Se o usuário for de produção, mostrar apenas a interface de linha de produção
  if (userRole === 'producao') {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gray-50 text-gray-800">
          <Toaster position="top-right" richColors closeButton />
          <div className="flex-1 flex flex-col">
            <main className="flex-1 overflow-y-auto">
              <LinhaProducaoPage />
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Interface completa para admin e user
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 text-gray-800">
        <Toaster position="top-right" richColors closeButton />
        <Sidebar currentPage={currentPage} setPage={handleSetPage} isOpen={isSidebarOpen} setOpen={setSidebarOpen} />
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <Header sidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage}/>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {renderPage()}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default App;
