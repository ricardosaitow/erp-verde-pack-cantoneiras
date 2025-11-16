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
import type { MateriaPrima } from '@/lib/database.types';

export interface FilterState {
  search: string;
  estoqueStatus: string;
  tipo: string;
}

interface MateriasPrimasEstoqueFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  materiasPrimas: MateriaPrima[];
}

export function MateriasPrimasEstoqueFilter({
  filters,
  onFiltersChange,
  materiasPrimas,
}: MateriasPrimasEstoqueFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    filters.estoqueStatus !== 'todos',
    filters.tipo !== 'todos',
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      estoqueStatus: 'todos',
      tipo: 'todos',
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
              placeholder="Buscar matéria-prima..."
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
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="papel_kraft">Papel Kraft</SelectItem>
                  <SelectItem value="papel_reciclado">Papel Reciclado</SelectItem>
                  <SelectItem value="cola">Cola</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function applyFilters(materiasPrimas: MateriaPrima[], filters: FilterState): MateriaPrima[] {
  return materiasPrimas.filter((mp) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        mp.nome.toLowerCase().includes(searchLower) ||
        mp.tipo?.toLowerCase().includes(searchLower) ||
        mp.local_armazenamento?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Estoque status filter
    if (filters.estoqueStatus !== 'todos') {
      const estoqueAtual = Number(mp.estoque_atual) || 0;
      const estoqueMinimo = Number(mp.estoque_minimo) || 0;
      const estoquePontoReposicao = Number(mp.estoque_ponto_reposicao) || 0;

      if (filters.estoqueStatus === 'critico' && estoqueAtual >= estoquePontoReposicao) return false;
      if (filters.estoqueStatus === 'baixo' && (estoqueAtual < estoquePontoReposicao || estoqueAtual >= estoqueMinimo)) return false;
      if (filters.estoqueStatus === 'normal' && estoqueAtual < estoqueMinimo) return false;
    }

    // Tipo filter
    if (filters.tipo !== 'todos' && mp.tipo !== filters.tipo) return false;

    return true;
  });
}
