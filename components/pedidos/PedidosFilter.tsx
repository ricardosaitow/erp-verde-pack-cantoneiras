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
import type { PedidoCompleto } from '../../lib/database.types';

export interface FilterState {
  search: string;
  tipo: string;
  status: string;
}

interface PedidosFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  pedidos: PedidoCompleto[];
}

export function PedidosFilter({ filters, onFiltersChange, pedidos }: PedidosFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      tipo: 'todos',
      status: 'todos',
    });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.tipo !== 'todos' ||
    filters.status !== 'todos';

  const activeFilterCount = [
    filters.search !== '',
    filters.tipo !== 'todos',
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
            placeholder="Buscar por número do pedido, cliente..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="filterTipo" className="text-sm font-medium">
                Tipo
              </Label>
              <Select value={filters.tipo} onValueChange={(value) => updateFilter('tipo', value)}>
                <SelectTrigger id="filterTipo" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="orcamento">Orçamentos</SelectItem>
                  <SelectItem value="pedido_confirmado">Pedidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="producao">Em Produção</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="recusado">Recusado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function applyFilters(pedidos: PedidoCompleto[], filters: FilterState): PedidoCompleto[] {
  return pedidos.filter((pedido) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const clienteNome = (pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social || '').toLowerCase();
      const numeroPedido = (pedido.numero_pedido || '').toLowerCase();

      if (
        !numeroPedido.includes(searchLower) &&
        !clienteNome.includes(searchLower)
      ) {
        return false;
      }
    }

    // Tipo filter
    if (filters.tipo !== 'todos' && pedido.tipo !== filters.tipo) {
      return false;
    }

    // Status filter
    if (filters.status !== 'todos' && pedido.status !== filters.status) {
      return false;
    }

    return true;
  });
}
