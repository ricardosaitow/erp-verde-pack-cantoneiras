import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Search } from 'lucide-react';
import type { OrdemProducaoCompleta } from '../../lib/database.types';

export interface FilterState {
  search: string;
  status: string;
}

interface OrdensProducaoFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  ordens: OrdemProducaoCompleta[];
}

export function OrdensProducaoFilter({ filters, onFiltersChange, ordens }: OrdensProducaoFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'todos',
    });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'todos';

  const activeFilterCount = [
    filters.search !== '',
    filters.status !== 'todos',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search Bar e Toggle de Filtros */}
      <div className="flex gap-3">
        {/* Busca Rápida */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número da OP, produto, responsável..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        {/* Botão de Filtros */}
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="h-11 gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 min-w-5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Botão Limpar Filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="h-11 gap-2"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Filtros Avançados */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="filterStatus" className="text-sm font-medium">
                Status
              </Label>
              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger id="filterStatus" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="em_producao">Em Produção</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function applyFilters(ordens: OrdemProducaoCompleta[], filters: FilterState): OrdemProducaoCompleta[] {
  return ordens.filter((ordem) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const numeroOp = (ordem.numero_op || '').toLowerCase();
      const produtoNome = (ordem.produto?.nome || '').toLowerCase();
      const responsavel = (ordem.responsavel_producao || '').toLowerCase();

      if (
        !numeroOp.includes(searchLower) &&
        !produtoNome.includes(searchLower) &&
        !responsavel.includes(searchLower)
      ) {
        return false;
      }
    }

    // Status filter
    if (filters.status !== 'todos' && ordem.status !== filters.status) {
      return false;
    }

    return true;
  });
}
