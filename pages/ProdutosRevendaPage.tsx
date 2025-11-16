import { useState, useMemo } from 'react';
import { useProdutos } from '../hooks/useProdutos';
import { useCategorias } from '../hooks/useCategorias';
import type { ProdutoComCusto } from '../lib/database.types';
import { formatNumber, formatQuantity, formatCurrency } from '../lib/format';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { RefreshCw, AlertTriangle, Package, MapPin } from 'lucide-react';
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
import { toast } from 'sonner';

export default function ProdutosRevendaPage() {
  const { produtos, loading, error, refresh, delete: deleteProduto } = useProdutos();
  const { categorias } = useCategorias();

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categoria: 'todas',
    estoqueStatus: 'todos',
    tipo: 'revenda', // Default to revenda for this page
    status: 'todos',
  });

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComCusto | null>(null);

  const produtosRevenda = useMemo(() => {
    return produtos.filter(p => p.tipo === 'revenda');
  }, [produtos]);

  const filteredProducts = useMemo(() => {
    return applyFilters(produtosRevenda, filters);
  }, [produtosRevenda, filters]);

  const getEstoqueStatus = (produto: ProdutoComCusto) => {
    const estoqueAtual = Number(produto.estoque_atual) || 0;
    const estoqueMinimo = Number(produto.estoque_minimo) || 0;
    const estoquePontoReposicao = Number(produto.estoque_ponto_reposicao) || 0;

    if (estoqueAtual < estoquePontoReposicao) {
      return { nivel: 'critico', label: 'Crítico', variant: 'destructive' as const };
    }
    if (estoqueAtual < estoqueMinimo) {
      return { nivel: 'baixo', label: 'Baixo', variant: 'warning' as const };
    }
    return { nivel: 'normal', label: 'Normal', variant: 'success' as const };
  };

  const getEstoqueTextColor = (nivel: string) => {
    switch (nivel) {
      case 'critico':
        return 'text-red-600';
      case 'baixo':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  // Handle row click - open detail modal
  const handleRowClick = (produto: ProdutoComCusto) => {
    setSelectedProduto(produto);
    setShowDetailModal(true);
  };

  // Handle edit from detail modal
  const handleEdit = (produto: ProdutoComCusto) => {
    // TODO: Open edit modal/form
    toast.info('Funcionalidade de edição em desenvolvimento');
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      await deleteProduto(id);
      toast.success('Produto excluído com sucesso');
      setShowDetailModal(false);
      setSelectedProduto(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir produto');
    }
  };

  if (loading) {
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
            <Button
              onClick={() => refresh()}
              variant="outline"
              size="sm"
              className="mt-4"
            >
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
        title="Produtos Revenda"
        description={produtosRevenda.length > 0 ? `${produtosRevenda.length} ${produtosRevenda.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}` : 'Visualize o estoque de produtos de revenda'}
      >
        <Button
          onClick={() => refresh()}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </PageHeader>

      {/* Filters */}
      <ProdutosFilter
        filters={filters}
        onFiltersChange={setFilters}
        produtos={produtosRevenda}
        categorias={categorias.filter(c => c.tipo === 'revenda')}
      />

      {/* Products Table */}
      <Card>
        {filteredProducts.length === 0 && produtosRevenda.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Package size={48} />}
              title="Nenhum produto de revenda cadastrado"
              description="Cadastre produtos de revenda para ver o estoque"
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
                  <TableHead className="min-w-[250px]">Produto</TableHead>
                  <TableHead className="min-w-[120px]">Categoria</TableHead>
                  <TableHead className="text-right min-w-[120px]">Estoque Atual</TableHead>
                  <TableHead className="text-right min-w-[100px]">Estoque Mín.</TableHead>
                  <TableHead className="text-right min-w-[120px]">Ponto Repos.</TableHead>
                  <TableHead className="text-right min-w-[120px]">Preço Venda</TableHead>
                  <TableHead className="min-w-[150px]">Local</TableHead>
                  <TableHead className="text-center min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((produto) => {
                  const categoria = categorias.find(c => c.id === produto.categoria_id);
                  const categoriaNome = categoria?.nome || 'Sem categoria';
                  const estoqueStatus = getEstoqueStatus(produto);
                  const estoqueAtual = Number(produto.estoque_atual) || 0;
                  const estoqueMinimo = Number(produto.estoque_minimo) || 0;
                  const estoquePontoReposicao = Number(produto.estoque_ponto_reposicao) || 0;

                  return (
                    <TableRow
                      key={produto.id}
                      onClick={() => handleRowClick(produto)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{produto.nome}</p>
                          {produto.codigo_interno && (
                            <p className="text-xs text-muted-foreground">
                              Cód: {produto.codigo_interno}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoriaNome}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium ${getEstoqueTextColor(estoqueStatus.nivel)}`}>
                          {formatQuantity(estoqueAtual, produto.unidade_venda)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatQuantity(estoqueMinimo, produto.unidade_venda)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatQuantity(estoquePontoReposicao, produto.unidade_venda)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-purple-600">
                        {formatCurrency(Number(produto.preco_venda_unitario) || 0)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {produto.local_armazenamento ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-sm">{produto.local_armazenamento}</span>
                          </div>
                        ) : (
                          <span className="text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={estoqueStatus.variant} className="text-xs">
                            {estoqueStatus.label}
                          </Badge>
                          <Badge variant={produto.ativo ? 'success' : 'secondary'} className="text-xs">
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <ProdutoDetailModal
        produto={selectedProduto}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProduto(null);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        categoriaNome={
          selectedProduto
            ? categorias.find(c => c.id === selectedProduto.categoria_id)?.nome || 'Sem categoria'
            : undefined
        }
      />
    </div>
  );
}
