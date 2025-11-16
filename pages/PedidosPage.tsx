import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { usePedidos } from '../hooks/usePedidos';
import { useClientes } from '../hooks/useClientes';
import { useProdutos } from '../hooks/useProdutos';
import { useMateriasPrimas } from '../hooks/useMateriasPrimas';
import type { PedidoCompleto, PedidoItem } from '../lib/database.types';
import { formatCurrency } from '../lib/format';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, RefreshCw, AlertTriangle, ShoppingCart } from 'lucide-react';
import { PedidosFilter, applyFilters, type FilterState } from '@/components/pedidos/PedidosFilter';
import { PedidoDetailModal } from '@/components/pedidos/PedidoDetailModal';
import PedidoFormModal from '../components/pedidos/PedidoFormModal';
import { isTransitionAllowed, type PedidoStatus, type PedidoTipo } from '@/lib/pedido-workflow';

export default function PedidosPage() {
  const { pedidos, loading, error, create, update, delete: deletePedido, refresh } = usePedidos();
  const { clientes, loading: loadingClientes } = useClientes();
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { materiasPrimas, loading: loadingMateriasPrimas } = useMateriasPrimas();

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tipo: 'todos',
    status: 'todos',
  });

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<PedidoCompleto | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoCompleto | null>(null);

  const filteredPedidos = useMemo(() => {
    return applyFilters(pedidos, filters);
  }, [pedidos, filters]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Handle row click - open detail modal
  const handleRowClick = (pedido: PedidoCompleto) => {
    setSelectedPedido(pedido);
    setShowDetailModal(true);
  };

  // Handle edit from detail modal
  const handleEditFromDetail = (pedido: PedidoCompleto) => {
    setShowDetailModal(false);
    setEditingPedido(pedido);
    setIsFormModalOpen(true);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    confirmAction({
      title: 'Excluir pedido',
      description: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Confirmar Exclusão',
      onConfirm: async () => {
        const { error: err } = await deletePedido(id);
        if (err) {
          toast.error('Erro ao excluir pedido: ' + err);
        } else {
          toast.success('Pedido excluído com sucesso!');
          setShowDetailModal(false);
          setSelectedPedido(null);
        }
      }
    });
  };

  // Handle update status from detail modal
  const handleUpdateStatus = async (pedido: PedidoCompleto, newStatus: string) => {
    // Validar transição usando a máquina de estados
    const validation = isTransitionAllowed(
      pedido.status as PedidoStatus,
      newStatus as PedidoStatus,
      pedido.tipo as PedidoTipo
    );

    if (!validation.allowed) {
      toast.error(validation.reason || 'Transição de status não permitida');
      return;
    }

    let tipoAtualizado = pedido.tipo;

    // Conversão automática de orçamento aprovado para pedido confirmado
    if (newStatus === 'aprovado' && pedido.tipo === 'orcamento') {
      tipoAtualizado = 'pedido_confirmado';
    }

    const dadosAtualizacao = {
      status: newStatus,
      tipo: tipoAtualizado,
    };

    const { error } = await update(pedido.id, dadosAtualizacao);

    if (error) {
      toast.error('Erro ao atualizar status: ' + error);
    } else {
      toast.success('Status atualizado com sucesso!');
      setSelectedPedido({ ...pedido, status: newStatus as any, tipo: tipoAtualizado });
      refresh();
    }
  };

  if (loading || loadingClientes || loadingProdutos || loadingMateriasPrimas) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar pedidos</AlertTitle>
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
        title="Pedidos"
        description={pedidos.length > 0 ? `${pedidos.length} ${pedidos.length === 1 ? 'pedido cadastrado' : 'pedidos cadastrados'}` : undefined}
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button onClick={() => { setEditingPedido(null); setIsFormModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
      </PageHeader>

      {/* Filters */}
      <PedidosFilter
        filters={filters}
        onFiltersChange={setFilters}
        pedidos={pedidos}
      />

      {/* Table */}
      <Card>
        {filteredPedidos.length === 0 && pedidos.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<ShoppingCart size={48} />}
              title="Nenhum pedido cadastrado"
              description="Clique em 'Novo Pedido' para começar"
              action={{ label: '+ Novo Pedido', onClick: () => { setEditingPedido(null); setIsFormModalOpen(true); } }}
            />
          </div>
        ) : filteredPedidos.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<ShoppingCart size={48} />}
              title="Nenhum pedido encontrado"
              description="Nenhum pedido encontrado com os filtros selecionados"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Número</TableHead>
                  <TableHead className="min-w-[200px]">Cliente</TableHead>
                  <TableHead className="min-w-[120px]">Tipo</TableHead>
                  <TableHead className="min-w-[120px]">Data</TableHead>
                  <TableHead className="text-right min-w-[120px]">Valor Total</TableHead>
                  <TableHead className="text-center min-w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.map((pedido) => {
                  const clienteNome = pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social || 'Cliente não identificado';
                  return (
                    <TableRow
                      key={pedido.id}
                      onClick={() => handleRowClick(pedido)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{pedido.numero_pedido}</TableCell>
                      <TableCell>{clienteNome}</TableCell>
                      <TableCell>
                        <Badge variant={pedido.tipo === 'pedido_confirmado' ? 'default' : 'secondary'} className={
                          pedido.tipo === 'pedido_confirmado' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                        }>
                          {pedido.tipo === 'pedido_confirmado' ? 'Pedido' : 'Orçamento'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(pedido.data_pedido)}</TableCell>
                      <TableCell className="text-right font-medium text-purple-600">
                        {formatCurrency(Number(pedido.valor_total) || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={pedido.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Form Modal */}
      {isFormModalOpen && (
        <PedidoFormModal
          isOpen={isFormModalOpen}
          onClose={() => { setIsFormModalOpen(false); setEditingPedido(null); }}
          onCreate={create}
          onUpdate={update}
          pedido={editingPedido}
          clientes={clientes}
          produtos={produtos}
          materiasPrimas={materiasPrimas}
          onSuccess={() => {
            setIsFormModalOpen(false);
            setEditingPedido(null);
            refresh();
          }}
        />
      )}

      {/* Detail Modal */}
      <PedidoDetailModal
        pedido={selectedPedido}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPedido(null);
        }}
        onEdit={handleEditFromDetail}
        onDelete={handleDelete}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
