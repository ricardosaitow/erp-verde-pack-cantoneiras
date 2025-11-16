import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useCompras } from '../hooks/useCompras';
import { useFornecedores } from '../hooks/useFornecedores';
import { useMateriasPrimas } from '../hooks/useMateriasPrimas';
import { useProdutos } from '../hooks/useProdutos';
import type { CompraCompleta } from '../lib/database.types';
import { formatCurrency } from '../lib/format';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Plus, RefreshCw, AlertTriangle, ShoppingCart, X, Search } from 'lucide-react';
import { CompraFormModal } from '../components/compras/CompraFormModal';
import { CompraDetailModal } from '../components/compras/CompraDetailModal';

export default function ComprasPage() {
  const { compras, loading, error, refresh } = useCompras();
  const { fornecedores } = useFornecedores();
  const { materiasPrimas } = useMateriasPrimas();
  const { produtos } = useProdutos();

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<CompraCompleta | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');

  const filteredCompras = useMemo(() => {
    return compras.filter((compra) => {
      const matchesSearch =
        !searchTerm ||
        compra.numero_compra.toLowerCase().includes(searchTerm.toLowerCase()) ||
        compra.fornecedor?.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        compra.fornecedor?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || compra.status === filterStatus;
      const matchesTipo = filterTipo === 'all' || compra.tipo_compra === filterTipo;

      return matchesSearch && matchesStatus && matchesTipo;
    });
  }, [compras, searchTerm, filterStatus, filterTipo]);

  const handleViewDetails = (compra: CompraCompleta) => {
    setSelectedCompra(compra);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      pendente: { label: 'Pendente', variant: 'secondary' },
      aprovado: { label: 'Aprovado', variant: 'default' },
      pedido_enviado: { label: 'Pedido Enviado', variant: 'default' },
      parcialmente_recebido: { label: 'Parcialmente Recebido', variant: 'outline' },
      recebido: { label: 'Recebido', variant: 'success' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar compras</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <Button onClick={() => refresh()} variant="outline" size="sm" className="mt-4">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Compras"
        description={
          compras.length > 0
            ? `${compras.length} ${compras.length === 1 ? 'compra cadastrada' : 'compras cadastradas'}`
            : undefined
        }
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button onClick={() => setShowFormModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Compra
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por número, fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Todos os Tipos</option>
              <option value="materia_prima">Matéria-Prima</option>
              <option value="revenda">Revenda</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="pedido_enviado">Pedido Enviado</option>
              <option value="parcialmente_recebido">Parcialmente Recebido</option>
              <option value="recebido">Recebido</option>
              <option value="cancelado">Cancelado</option>
            </select>

            {(searchTerm || filterStatus !== 'all' || filterTipo !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterTipo('all');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Fornecedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Data Compra</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Valor Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {compras.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <EmptyState
                      icon={<ShoppingCart size={48} />}
                      title="Nenhuma compra cadastrada"
                      description="Clique em 'Nova Compra' para começar"
                      action={{
                        label: '+ Nova Compra',
                        onClick: () => setShowFormModal(true),
                      }}
                    />
                  </td>
                </tr>
              ) : filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <EmptyState
                      icon={<ShoppingCart size={48} />}
                      title="Nenhuma compra encontrada"
                      description="Tente ajustar os filtros de busca"
                    />
                  </td>
                </tr>
              ) : (
                filteredCompras.map((compra) => (
                  <tr
                    key={compra.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleViewDetails(compra)}
                  >
                    <td className="px-6 py-4 text-sm font-medium">{compra.numero_compra}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {compra.fornecedor?.nome_fantasia || compra.fornecedor?.razao_social || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">
                        {compra.tipo_compra === 'materia_prima' ? 'Matéria-Prima' : 'Revenda'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(compra.data_compra).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {formatCurrency(compra.valor_final)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(compra.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {showFormModal && (
        <CompraFormModal
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSuccess={() => {
            setShowFormModal(false);
            refresh();
          }}
          fornecedores={fornecedores}
          materiasPrimas={materiasPrimas}
          produtos={produtos.filter(p => p.tipo === 'revenda')}
        />
      )}

      {showDetailModal && selectedCompra && (
        <CompraDetailModal
          compra={selectedCompra}
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCompra(null);
          }}
          onUpdate={refresh}
        />
      )}
    </div>
  );
}
