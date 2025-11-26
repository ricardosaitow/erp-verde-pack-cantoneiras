import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useProdutos } from '../hooks/useProdutos';
import { useCategorias } from '../hooks/useCategorias';
import type { ProdutoComCusto } from '../lib/database.types';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '../lib/format';
import ProductFormModal from '../components/products/ProductFormModal';
import { ProdutosFilter, applyFilters, type FilterState } from '@/components/produtos/ProdutosFilter';
import { ProdutoDetailModal } from '@/components/produtos/ProdutoDetailModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, RefreshCw, AlertTriangle, Package, Cloud, CheckCircle2, XCircle } from 'lucide-react';

export default function ProductsPage() {
  const { produtos, loading, error, create, update, delete: deleteProd, refresh, sincronizarComBase, sincronizarTodos } = useProdutos();
  const { categorias, loading: loadingCategorias } = useCategorias();

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categoria: 'todas',
    estoqueStatus: 'todos',
    tipo: 'todos',
    status: 'todos',
  });

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProdutoComCusto | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComCusto | null>(null);

  const filteredProducts = useMemo(() => {
    return applyFilters(produtos, filters);
  }, [produtos, filters]);

  const handleSaveProduct = async (product: any) => {
    try {
      if (editingProduct) {
        const { error: err } = await update(editingProduct.id, product);
        if (err) {
          toast.error('Erro ao atualizar produto: ' + err);
          return;
        }
        toast.success('Produto atualizado com sucesso!');
      } else {
        const { error: err } = await create(product);
        if (err) {
          toast.error('Erro ao criar produto: ' + err);
          return;
        }
        toast.success('Produto criado com sucesso!');
      }
      setIsFormModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      toast.error('Erro ao salvar produto');
    }
  };

  // Handle row click - open detail modal
  const handleRowClick = (produto: ProdutoComCusto) => {
    setSelectedProduto(produto);
    setShowDetailModal(true);
  };

  // Handle edit from detail modal
  const handleEditFromDetail = (produto: ProdutoComCusto) => {
    setShowDetailModal(false);
    setEditingProduct(produto);
    setIsFormModalOpen(true);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    confirmAction({
      title: 'Excluir produto',
      description: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Confirmar Exclusão',
      onConfirm: async () => {
        const { error: err } = await deleteProd(id);
        if (err) {
          toast.error('Erro ao excluir produto: ' + err);
        } else {
          toast.success('Produto excluído com sucesso!');
          setShowDetailModal(false);
          setSelectedProduto(null);
        }
      }
    });
  };

  if (loading || loadingCategorias) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar produtos</AlertTitle>
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
        title="Produtos"
        description={produtos.length > 0 ? `${produtos.length} ${produtos.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}` : undefined}
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button
          onClick={async () => {
            await sincronizarTodos();
          }}
          variant="outline"
          size="sm"
          className="border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          <Cloud className="h-4 w-4 mr-2" />
          Sincronizar Todos
        </Button>
        <Button onClick={() => { setEditingProduct(null); setIsFormModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </PageHeader>

      {/* Filters */}
      <ProdutosFilter
        filters={filters}
        onFiltersChange={setFilters}
        produtos={produtos}
        categorias={categorias}
      />

      {/* Table */}
      <Card>
        {filteredProducts.length === 0 && produtos.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Package size={48} />}
              title="Nenhum produto cadastrado"
              description="Clique em 'Novo Produto' para começar"
              action={{ label: '+ Novo Produto', onClick: () => { setEditingProduct(null); setIsFormModalOpen(true); } }}
            />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Package size={48} />}
              title="Nenhum produto encontrado"
              description="Nenhum produto encontrado com os filtros selecionados"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Nome</TableHead>
                  <TableHead className="min-w-[120px]">Tipo</TableHead>
                  <TableHead className="min-w-[150px]">Categoria</TableHead>
                  <TableHead className="text-right min-w-[120px]">Preço</TableHead>
                  <TableHead className="text-center min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((produto) => {
                  const categoria = categorias.find(c => c.id === produto.categoria_id);
                  return (
                    <TableRow
                      key={produto.id}
                      onClick={() => handleRowClick(produto)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{produto.nome}</TableCell>
                      <TableCell>
                        <Badge variant={produto.tipo === 'fabricado' ? 'default' : 'secondary'} className={
                          produto.tipo === 'fabricado' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-sky-100 text-sky-800 hover:bg-sky-100'
                        }>
                          {produto.tipo === 'fabricado' ? 'Fabricado' : 'Revenda'}
                        </Badge>
                      </TableCell>
                      <TableCell>{categoria?.nome || '-'}</TableCell>
                      <TableCell className="text-right font-medium text-purple-600">
                        {formatCurrency(Number(produto.preco_venda_unitario) || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={produto.ativo ? 'success' : 'secondary'}>
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
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
        <ProductFormModal
          isOpen={isFormModalOpen}
          onClose={() => { setIsFormModalOpen(false); setEditingProduct(null); }}
          onSave={handleSaveProduct}
          product={editingProduct as any}
        />
      )}

      {/* Detail Modal */}
      <ProdutoDetailModal
        produto={selectedProduto}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProduto(null);
        }}
        onEdit={handleEditFromDetail}
        onDelete={handleDelete}
        onSync={sincronizarComBase}
        categoriaNome={categorias.find(c => c.id === selectedProduto?.categoria_id)?.nome}
      />
    </div>
  );
}
