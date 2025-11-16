import { useState, useMemo } from 'react';
import { useProdutos } from '../hooks/useProdutos';
import { useMateriasPrimas } from '../hooks/useMateriasPrimas';
import { formatQuantity } from '../lib/format';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
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
import { RefreshCw, AlertTriangle, Package2 } from 'lucide-react';
import { InventarioFilter, applyFilters, type FilterState, type InventarioItem } from '@/components/inventario/InventarioFilter';
import { InventarioDetailModal } from '@/components/inventario/InventarioDetailModal';

export default function InventarioPage() {
  const { produtos, loading: loadingProdutos, error: errorProdutos, refresh: refreshProdutos } = useProdutos();
  const { materiasPrimas, loading: loadingMateriasPrimas, error: errorMateriasPrimas, refresh: refreshMateriasPrimas } = useMateriasPrimas();

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tipo: 'todos',
    estoqueStatus: 'todos',
  });

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventarioItem | null>(null);

  const produtosRevenda = useMemo(() => {
    return produtos.filter(p => p.tipo === 'revenda');
  }, [produtos]);

  const inventarioCompleto = useMemo(() => {
    const itens: InventarioItem[] = [];

    produtosRevenda.forEach(produto => {
      const estoqueAtual = Number(produto.estoque_atual) || 0;
      const estoqueMinimo = Number(produto.estoque_minimo) || 0;
      const estoquePontoReposicao = Number(produto.estoque_ponto_reposicao) || 0;

      let nivelAlerta: 'critico' | 'baixo' | 'normal' = 'normal';
      if (estoqueAtual < estoquePontoReposicao) {
        nivelAlerta = 'critico';
      } else if (estoqueAtual < estoqueMinimo) {
        nivelAlerta = 'baixo';
      }

      itens.push({
        id: produto.id,
        nome: produto.nome,
        tipo: 'produto_revenda',
        estoque_atual: estoqueAtual,
        estoque_minimo: estoqueMinimo,
        estoque_ponto_reposicao: estoquePontoReposicao,
        unidade: produto.unidade_venda,
        local_armazenamento: produto.local_armazenamento,
        nivel_alerta: nivelAlerta,
      });
    });

    materiasPrimas.forEach(mp => {
      const estoqueAtual = Number(mp.estoque_atual) || 0;
      const estoqueMinimo = Number(mp.estoque_minimo) || 0;
      const estoquePontoReposicao = Number(mp.estoque_ponto_reposicao) || 0;

      let nivelAlerta: 'critico' | 'baixo' | 'normal' = 'normal';
      if (estoqueAtual < estoquePontoReposicao) {
        nivelAlerta = 'critico';
      } else if (estoqueAtual < estoqueMinimo) {
        nivelAlerta = 'baixo';
      }

      itens.push({
        id: mp.id,
        nome: mp.nome,
        tipo: 'materia_prima',
        estoque_atual: estoqueAtual,
        estoque_minimo: estoqueMinimo,
        estoque_ponto_reposicao: estoquePontoReposicao,
        unidade: mp.unidade_estoque,
        local_armazenamento: mp.local_armazenamento,
        nivel_alerta: nivelAlerta,
      });
    });

    return itens;
  }, [produtosRevenda, materiasPrimas]);

  const filteredInventario = useMemo(() => {
    return applyFilters(inventarioCompleto, filters);
  }, [inventarioCompleto, filters]);

  const getNivelBadgeVariant = (nivel: string): 'destructive' | 'warning' | 'success' => {
    switch (nivel) {
      case 'critico':
        return 'destructive';
      case 'baixo':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getNivelLabel = (nivel: string) => {
    switch (nivel) {
      case 'critico':
        return 'Crítico';
      case 'baixo':
        return 'Baixo';
      default:
        return 'Normal';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'produto_revenda':
        return 'Produto Revenda';
      case 'materia_prima':
        return 'Matéria-Prima';
      default:
        return tipo;
    }
  };

  // Handle row click - open detail modal
  const handleRowClick = (item: InventarioItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const loading = loadingProdutos || loadingMateriasPrimas;
  const error = errorProdutos || errorMateriasPrimas;

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar inventário</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <Button
              onClick={() => {
                refreshProdutos();
                refreshMateriasPrimas();
              }}
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
        title="Inventário"
        description={inventarioCompleto.length > 0 ? `${inventarioCompleto.length} ${inventarioCompleto.length === 1 ? 'item cadastrado' : 'itens cadastrados'}` : undefined}
      >
        <Button
          onClick={() => {
            refreshProdutos();
            refreshMateriasPrimas();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </PageHeader>

      {/* Filters */}
      <InventarioFilter
        filters={filters}
        onFiltersChange={setFilters}
        totalItens={inventarioCompleto.length}
      />

      {/* Table */}
      <Card>
        {filteredInventario.length === 0 && inventarioCompleto.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Package2 size={48} />}
              title="Nenhum item cadastrado"
              description="Cadastre produtos ou matérias-primas para visualizar o inventário"
            />
          </div>
        ) : filteredInventario.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Package2 size={48} />}
              title="Nenhum item encontrado"
              description="Nenhum item encontrado com os filtros selecionados"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Nome</TableHead>
                  <TableHead className="min-w-[140px]">Tipo</TableHead>
                  <TableHead className="text-right min-w-[120px]">Estoque Atual</TableHead>
                  <TableHead className="text-right min-w-[120px]">Estoque Mínimo</TableHead>
                  <TableHead className="text-right min-w-[140px]">Ponto Reposição</TableHead>
                  <TableHead className="min-w-[150px]">Local</TableHead>
                  <TableHead className="text-center min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventario.map((item) => {
                  return (
                    <TableRow
                      key={`${item.tipo}-${item.id}`}
                      onClick={() => handleRowClick(item)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTipoLabel(item.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatQuantity(item.estoque_atual, item.unidade)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatQuantity(item.estoque_minimo, item.unidade)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatQuantity(item.estoque_ponto_reposicao, item.unidade)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.local_armazenamento || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getNivelBadgeVariant(item.nivel_alerta)}>
                          {getNivelLabel(item.nivel_alerta)}
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

      {/* Detail Modal */}
      <InventarioDetailModal
        item={selectedItem}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}
