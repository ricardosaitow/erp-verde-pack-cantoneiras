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
import type { Categoria } from '@/lib/database.types';

export interface FilterState {
  search: string;
  tipo: 'todos' | 'fabricado' | 'revenda';
  status: 'todos' | 'ativo' | 'inativo';
}

interface CategoriasFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categorias: Categoria[];
}

export function CategoriasFilter({
  filters,
  onFiltersChange,
  categorias,
}: CategoriasFilterProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof FilterState) => {
    const defaultValues: FilterState = {
      search: '',
      tipo: 'todos',
      status: 'todos',
    };
    onFiltersChange({ ...filters, [key]: defaultValues[key] });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      tipo: 'todos',
      status: 'todos',
    });
    setShowAdvancedFilters(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
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
              placeholder="Buscar por nome da categoria..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
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
                  <SelectItem value="fabricado">Fabricado</SelectItem>
                  <SelectItem value="revenda">Revenda</SelectItem>
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
                Tipo: {filters.tipo === 'fabricado' ? 'Fabricado' : 'Revenda'}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => clearFilter('tipo')}
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
 * Apply filters to categorias list
 */
export function applyFilters(
  categorias: Categoria[],
  filters: FilterState
): Categoria[] {
  return categorias.filter((categoria) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = categoria.nome?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Tipo filter
    if (filters.tipo !== 'todos') {
      if (categoria.tipo !== filters.tipo) return false;
    }

    // Status filter
    if (filters.status !== 'todos') {
      const isAtivo = filters.status === 'ativo';
      if (categoria.ativo !== isAtivo) return false;
    }

    return true;
  });
}
