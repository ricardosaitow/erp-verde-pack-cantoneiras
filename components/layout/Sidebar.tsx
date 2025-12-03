import React, { useState } from 'react';
import { Page } from '../../App';
import {
  Home,
  ShoppingCart,
  Factory,
  Package,
  Wallet,
  Grid3x3,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  FileText,
  TrendingUp,
  PackageSearch,
  Boxes,
  ArrowRightLeft,
  ClipboardList,
  Bell,
  CalendarDays,
  Shield,
  Sliders,
  DollarSign,
  TrendingDown,
  Tag,
  Layers
} from 'lucide-react';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, isOpen, setOpen }) => {
  const menuItems = [
    { name: 'Dashboard', icon: <Home className="h-5 w-5" />, page: 'Dashboard' as Page },
    {
      group: 'GESTÃO',
      items: [
        { name: 'Vendas', icon: <ShoppingCart className="h-5 w-5" />, page: 'Pedidos' as Page, subItems: ['Pedidos', 'Despacho', 'Relatórios de Vendas'] },
        { name: 'Produção', icon: <Factory className="h-5 w-5" />, page: 'Ordens de Produção' as Page, subItems: ['Ordens de Produção', 'Linha de Produção', 'Relatórios de Produção'] },
        { name: 'Estoque', icon: <Package className="h-5 w-5" />, page: 'Movimentações' as Page, subItems: ['Produtos Revenda', 'Matérias-Primas', 'Compras', 'Movimentações', 'Inventário', 'Alertas'] },
        { name: 'Financeiro', icon: <Wallet className="h-5 w-5" />, page: 'Contas a Receber' as Page, subItems: ['Contas a Receber', 'Contas a Pagar', 'Fluxo de Caixa', 'Análise de Lucratividade'] },
      ]
    },
    {
      group: 'CONFIGURAÇÃO',
      items: [
        { name: 'Cadastros', icon: <Grid3x3 className="h-5 w-5" />, page: 'Clientes' as Page, subItems: ['Clientes', 'Fornecedores', 'Transportadoras', 'Produtos', 'Matéria-Prima', 'Categorias'] },
        { name: 'Relatórios', icon: <FileBarChart className="h-5 w-5" />, page: 'Relatórios Gerais' as Page },
        { name: 'Sistema', icon: <Settings className="h-5 w-5" />, page: 'Usuários' as Page, subItems: ['Usuários', 'Permissões', 'Parâmetros', 'Teste Asaas', 'Teste Asaas Completo', 'Fluxo Cliente ERP+Asaas', 'Teste Base ERP', 'Teste Cliente Integrado', 'Importar Produtos Base'] },
      ]
    }
  ];

  const findInitialGroup = () => {
    for (const menu of menuItems) {
        if (menu.group) {
            for (const item of menu.items) {
                if (item.subItems?.includes(currentPage)) {
                    return item.name;
                }
            }
        }
    }
    return null;
  };

  const [openGroup, setOpenGroup] = useState<string | null>(findInitialGroup());


  // FIX: Explicitly type NavItem as a React.FC to allow TypeScript to correctly handle special props like `key`.
  interface NavItemProps {
    item: any;
    isSubItem?: boolean;
  }

  const NavItem: React.FC<NavItemProps> = ({ item, isSubItem = false }) => {
    const isActive = currentPage === item.page || (item.subItems && item.subItems.includes(currentPage));
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isGroupOpen = openGroup === item.name;
    const hasActiveSubItem = item.subItems && item.subItems.includes(currentPage);

    const handleGroupClick = () => {
      setPage(item.page);
      if (hasSubItems) {
        setOpenGroup(isGroupOpen ? null : item.name);
      } else {
        setOpenGroup(null);
      }
    };

    const handleSubItemClick = (page: Page, groupName: string) => {
        setPage(page);
        setOpenGroup(groupName);
    };


    return (
      <div className="flex flex-col">
        <button
          onClick={handleGroupClick}
          className={`flex items-center w-full text-sm font-medium rounded-md transition-colors duration-200 ${isSubItem ? 'pl-10 pr-2 py-2' : 'px-3 py-2'} ${
            isActive || hasActiveSubItem ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-emerald-800 hover:text-white'
          }`}
        >
          {item.icon && <span className="mr-3 flex-shrink-0">{item.icon}</span>}
          {isOpen && <span className="truncate">{item.name}</span>}
        </button>
        {isOpen && hasSubItems && isGroupOpen && (
          <div className="mt-1 flex flex-col space-y-1 border-l-2 border-emerald-500 ml-4 pl-1">
            {item.subItems.map((sub: string) => {
              const isSubActive = currentPage === sub;
              return (
                <button
                  key={`${item.name}-${sub}`}
                  onClick={() => handleSubItemClick(sub as Page, item.name)}
                  className={`w-full text-left text-sm rounded-md transition-all duration-200 pl-8 pr-2 py-2 flex items-center gap-2 ${
                    isSubActive
                      ? 'bg-emerald-700 text-white font-semibold shadow-md border-l-4 border-emerald-300'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isSubActive ? 'bg-emerald-300' : 'bg-gray-600'
                  }`} />
                  <span className="truncate">{sub}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`fixed top-0 left-0 h-full bg-gray-800 text-white flex flex-col transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}>
       <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
        {isOpen && <h1 className="text-xl font-bold text-emerald-400">VerdePack</h1>}
        <button onClick={() => setOpen(!isOpen)} className="p-1 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white">
          {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
        {menuItems.map((menu, index) => (
          <div key={index}>
            {menu.name && <NavItem item={menu} />}
            {menu.group && (
              <div className="mt-4">
                {isOpen && <h3 className="px-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">{menu.group}</h3>}
                <div className="mt-2 space-y-1">
                  {menu.items.map((item: any) => <NavItem key={item.name} item={item} />)}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
