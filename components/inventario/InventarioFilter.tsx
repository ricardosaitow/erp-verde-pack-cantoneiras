import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

export interface FilterState {
  search: string;
  tipo: string;
  estoqueStatus: string;
}

interface InventarioFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  totalItens: number;
}

export function InventarioFilter({
  filters,
  onFiltersChange,
  totalItens,
}: InventarioFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    filters.tipo !== 'todos',
    filters.estoqueStatus !== 'todos',
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      tipo: 'todos',
      estoqueStatus: 'todos',
    });
  };

  const hasActiveFilters = filters.search || activeFilterCount > 0;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        {/* Search bar and filter button */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar item do inventário..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={filters.tipo}
                onValueChange={(value) => onFiltersChange({ ...filters, tipo: value })}
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="produto_revenda">Produtos Revenda</SelectItem>
                  <SelectItem value="materia_prima">Matérias-Primas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estoqueStatus">Status do Estoque</Label>
              <Select
                value={filters.estoqueStatus}
                onValueChange={(value) => onFiltersChange({ ...filters, estoqueStatus: value })}
              >
                <SelectTrigger id="estoqueStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="baixo">Estoque Baixo</SelectItem>
                  <SelectItem value="critico">Estoque Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export interface InventarioItem {
  id: string;
  nome: string;
  tipo: 'produto_revenda' | 'materia_prima';
  estoque_atual: number;
  estoque_minimo: number;
  estoque_ponto_reposicao: number;
  unidade: string;
  local_armazenamento?: string;
  nivel_alerta: 'critico' | 'baixo' | 'normal';
}

export function applyFilters(itens: InventarioItem[], filters: FilterState): InventarioItem[] {
  return itens.filter((item) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        item.nome.toLowerCase().includes(searchLower) ||
        item.local_armazenamento?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Tipo filter
    if (filters.tipo !== 'todos' && item.tipo !== filters.tipo) return false;

    // Estoque status filter
    if (filters.estoqueStatus !== 'todos' && item.nivel_alerta !== filters.estoqueStatus) return false;

    return true;
  });
}
