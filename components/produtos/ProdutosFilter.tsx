import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Search, X, Filter } from 'lucide-react';
import type { ProdutoComCusto, Categoria } from '@/lib/database.types';

export interface FilterState {
  search: string;
  categoria: string;
  estoqueStatus: 'todos' | 'normal' | 'baixo' | 'critico';
  tipo: 'todos' | 'fabricado' | 'revenda';
  status: 'todos' | 'ativo' | 'inativo';
}

interface ProdutosFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  produtos: ProdutoComCusto[];
  categorias: Categoria[];
}

export function ProdutosFilter({
  filters,
  onFiltersChange,
  produtos,
  categorias,
}: ProdutosFilterProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Extract unique values for dynamic filters
  const categoriasDisponiveis = useMemo(() => {
    const uniqueCategorias = new Set(
      produtos
        .map(p => p.categoria_id)
        .filter(Boolean)
    );
    return categorias.filter(c => uniqueCategorias.has(c.id));
  }, [produtos, categorias]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof FilterState) => {
    const defaultValues: FilterState = {
      search: '',
      categoria: 'todas',
      estoqueStatus: 'todos',
      tipo: 'todos',
      status: 'todos',
    };
    onFiltersChange({ ...filters, [key]: defaultValues[key] });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      categoria: 'todas',
      estoqueStatus: 'todos',
      tipo: 'todos',
      status: 'todos',
    });
    setShowAdvancedFilters(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categoria !== 'todas') count++;
    if (filters.estoqueStatus !== 'todos') count++;
    if (filters.tipo !== 'todos') count++;
    if (filters.status !== 'todos') count++;
    return count;
  }, [filters]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome do produto..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9 h-10"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('search')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="h-10"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-10"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t">
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="filter-tipo" className="text-sm font-medium">
                Tipo
              </Label>
              <Select
                value={filters.tipo}
                onValueChange={(value) => handleFilterChange('tipo', value)}
              >
                <SelectTrigger id="filter-tipo" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="revenda">Revenda</SelectItem>
                  <SelectItem value="fabricado">Fabricado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="filter-categoria" className="text-sm font-medium">
                Categoria
              </Label>
              <Select
                value={filters.categoria}
                onValueChange={(value) => handleFilterChange('categoria', value)}
              >
                <SelectTrigger id="filter-categoria" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categoriasDisponiveis.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estoque Status */}
            <div className="space-y-2">
              <Label htmlFor="filter-estoque" className="text-sm font-medium">
                Status do Estoque
              </Label>
              <Select
                value={filters.estoqueStatus}
                onValueChange={(value) => handleFilterChange('estoqueStatus', value as FilterState['estoqueStatus'])}
              >
                <SelectTrigger id="filter-estoque" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="filter-status" className="text-sm font-medium">
                Status
              </Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger id="filter-status" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Active Filters Tags */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Busca: {filters.search}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => clearFilter('search')}
                />
              </Badge>
            )}
            {filters.tipo !== 'todos' && (
              <Badge variant="secondary" className="gap-1">
                Tipo: {filters.tipo === 'revenda' ? 'Revenda' : 'Fabricado'}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => clearFilter('tipo')}
                />
              </Badge>
            )}
            {filters.categoria !== 'todas' && (
              <Badge variant="secondary" className="gap-1">
                Categoria: {categorias.find(c => c.id === filters.categoria)?.nome || filters.categoria}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => clearFilter('categoria')}
                />
              </Badge>
            )}
            {filters.estoqueStatus !== 'todos' && (
              <Badge variant="secondary" className="gap-1">
                Estoque: {filters.estoqueStatus === 'normal' ? 'Normal' : filters.estoqueStatus === 'baixo' ? 'Baixo' : 'Crítico'}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => clearFilter('estoqueStatus')}
                />
              </Badge>
            )}
            {filters.status !== 'todos' && (
              <Badge variant="secondary" className="gap-1">
                Status: {filters.status === 'ativo' ? 'Ativo' : 'Inativo'}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => clearFilter('status')}
                />
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Apply filters to produtos list
 */
export function applyFilters(
  produtos: ProdutoComCusto[],
  filters: FilterState
): ProdutoComCusto[] {
  return produtos.filter((produto) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        produto.nome?.toLowerCase().includes(searchLower) ||
        produto.codigo_interno?.toLowerCase().includes(searchLower) ||
        produto.descricao?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Tipo filter
    if (filters.tipo !== 'todos') {
      if (produto.tipo !== filters.tipo) return false;
    }

    // Categoria filter
    if (filters.categoria !== 'todas') {
      if (produto.categoria_id !== filters.categoria) return false;
    }

    // Estoque status filter (only for revenda products)
    if (filters.estoqueStatus !== 'todos' && produto.tipo === 'revenda') {
      const estoqueAtual = Number(produto.estoque_atual) || 0;
      const estoqueMinimo = Number(produto.estoque_minimo) || 0;
      const estoquePontoReposicao = Number(produto.estoque_ponto_reposicao) || 0;

      if (filters.estoqueStatus === 'critico') {
        if (estoqueAtual >= estoquePontoReposicao) return false;
      } else if (filters.estoqueStatus === 'baixo') {
        if (estoqueAtual < estoquePontoReposicao || estoqueAtual >= estoqueMinimo) return false;
      } else if (filters.estoqueStatus === 'normal') {
        if (estoqueAtual < estoqueMinimo) return false;
      }
    }

    // Status filter
    if (filters.status !== 'todos') {
      const isAtivo = filters.status === 'ativo';
      if (produto.ativo !== isAtivo) return false;
    }

    return true;
  });
}
