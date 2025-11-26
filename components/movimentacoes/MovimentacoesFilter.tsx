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
import type { MovimentacaoEstoque } from '../../lib/database.types';

export interface FilterState {
  search: string;
  tipo: string;
  tipo_item: string;
  motivo: string;
}

interface MovimentacoesFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  movimentacoes: MovimentacaoEstoque[];
}

export function MovimentacoesFilter({ filters, onFiltersChange, movimentacoes }: MovimentacoesFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      tipo: 'todos',
      tipo_item: 'todos',
      motivo: 'todos',
    });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.tipo !== 'todos' ||
    filters.tipo_item !== 'todos' ||
    filters.motivo !== 'todos';

  const activeFilterCount = [
    filters.search !== '',
    filters.tipo !== 'todos',
    filters.tipo_item !== 'todos',
    filters.motivo !== 'todos',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search Bar e Toggle de Filtros */}
      <div className="flex gap-3">
        {/* Busca Rápida */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por item..."
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="filterTipo" className="text-sm font-medium">
                Tipo de Movimentação
              </Label>
              <Select value={filters.tipo} onValueChange={(value) => updateFilter('tipo', value)}>
                <SelectTrigger id="filterTipo" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Item */}
            <div className="space-y-2">
              <Label htmlFor="filterTipoItem" className="text-sm font-medium">
                Tipo de Item
              </Label>
              <Select value={filters.tipo_item} onValueChange={(value) => updateFilter('tipo_item', value)}>
                <SelectTrigger id="filterTipoItem" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Itens</SelectItem>
                  <SelectItem value="materia_prima">Matérias-Primas</SelectItem>
                  <SelectItem value="produto_revenda">Produtos Revenda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="filterMotivo" className="text-sm font-medium">
                Motivo
              </Label>
              <Select value={filters.motivo} onValueChange={(value) => updateFilter('motivo', value)}>
                <SelectTrigger id="filterMotivo" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Motivos</SelectItem>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="ajuste_inventario">Ajuste de Inventário</SelectItem>
                  <SelectItem value="devolucao">Devolução</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function applyFilters(
  movimentacoes: MovimentacaoEstoque[],
  filters: FilterState,
  getItemNome: (itemId: string, tipoItem: string) => string
): MovimentacaoEstoque[] {
  return movimentacoes.filter((mov) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const itemNome = getItemNome(mov.item_id, mov.tipo_item).toLowerCase();
      const documentoRef = (mov.documento_referencia || '').toLowerCase();

      if (!itemNome.includes(searchLower) && !documentoRef.includes(searchLower)) {
        return false;
      }
    }

    // Tipo filter
    if (filters.tipo !== 'todos' && mov.tipo !== filters.tipo) {
      return false;
    }

    // Tipo Item filter
    if (filters.tipo_item !== 'todos' && mov.tipo_item !== filters.tipo_item) {
      return false;
    }

    // Motivo filter
    if (filters.motivo !== 'todos' && mov.motivo !== filters.motivo) {
      return false;
    }

    return true;
  });
}
