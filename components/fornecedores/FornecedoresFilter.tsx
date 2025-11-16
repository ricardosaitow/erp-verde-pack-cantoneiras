import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Search } from 'lucide-react';
import type { Fornecedor } from '@/lib/database.types';

export interface FilterState {
  search: string;
  tipoPessoa: 'todos' | 'fisica' | 'juridica';
  status: 'todos' | 'ativo' | 'inativo';
  cidade: string;
  estado: string;
}

interface FornecedoresFilterProps {
  onFilterChange: (filters: FilterState) => void;
  fornecedoresOriginais: Fornecedor[];
}

export function FornecedoresFilter({ onFilterChange, fornecedoresOriginais }: FornecedoresFilterProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tipoPessoa: 'todos',
    status: 'todos',
    cidade: '',
    estado: '',
  });

  // Extrair cidades e estados únicos dos fornecedores
  const cidades = Array.from(new Set(fornecedoresOriginais.map(f => f.cidade).filter(Boolean))).sort();
  const estados = Array.from(new Set(fornecedoresOriginais.map(f => f.estado).filter(Boolean))).sort();

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterState = {
      search: '',
      tipoPessoa: 'todos',
      status: 'todos',
      cidade: '',
      estado: '',
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.tipoPessoa !== 'todos' ||
    filters.status !== 'todos' ||
    filters.cidade !== '' ||
    filters.estado !== '';

  const activeFilterCount = [
    filters.search !== '',
    filters.tipoPessoa !== 'todos',
    filters.status !== 'todos',
    filters.cidade !== '',
    filters.estado !== '',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search Bar e Toggle de Filtros */}
      <div className="flex gap-3">
        {/* Busca Rápida */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, razão social, CNPJ/CPF..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Botão de Filtros Avançados */}
        <div className="relative">
          <Button
            type="button"
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium pointer-events-none">
              {activeFilterCount}
            </span>
          )}
        </div>

        {/* Botão Limpar Filtros */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Painel de Filtros Avançados */}
      {showFilters && (
        <Card className="p-4 border-2 border-primary/20 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tipo de Pessoa */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tipo de Pessoa</Label>
              <Select
                value={filters.tipoPessoa}
                onValueChange={(value) => handleFilterChange('tipoPessoa', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cidade */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Cidade</Label>
              <Select
                value={filters.cidade || 'TODAS'}
                onValueChange={(value) => handleFilterChange('cidade', value === 'TODAS' ? '' : value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {cidades.map((cidade) => (
                    <SelectItem key={cidade} value={cidade}>
                      {cidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Estado</Label>
              <Select
                value={filters.estado || 'TODOS'}
                onValueChange={(value) => handleFilterChange('estado', value === 'TODOS' ? '' : value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {estados.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Indicadores de Filtros Ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Busca: "{filters.search}"
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleFilterChange('search', '')}
              />
            </Badge>
          )}
          {filters.tipoPessoa !== 'todos' && (
            <Badge variant="secondary" className="gap-1">
              {filters.tipoPessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleFilterChange('tipoPessoa', 'todos')}
              />
            </Badge>
          )}
          {filters.status !== 'todos' && (
            <Badge variant="secondary" className="gap-1">
              {filters.status === 'ativo' ? 'Ativo' : 'Inativo'}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleFilterChange('status', 'todos')}
              />
            </Badge>
          )}
          {filters.cidade && (
            <Badge variant="secondary" className="gap-1">
              Cidade: {filters.cidade}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleFilterChange('cidade', '')}
              />
            </Badge>
          )}
          {filters.estado && (
            <Badge variant="secondary" className="gap-1">
              Estado: {filters.estado}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleFilterChange('estado', '')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Função para aplicar os filtros na lista de fornecedores
 */
export function applyFilters(fornecedores: Fornecedor[], filters: FilterState): Fornecedor[] {
  return fornecedores.filter((fornecedor) => {
    // Filtro de busca (search)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        fornecedor.razao_social?.toLowerCase().includes(searchLower) ||
        fornecedor.nome_fantasia?.toLowerCase().includes(searchLower) ||
        fornecedor.cnpj_cpf?.toLowerCase().includes(searchLower) ||
        fornecedor.cidade?.toLowerCase().includes(searchLower) ||
        fornecedor.estado?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    // Filtro de tipo de pessoa
    if (filters.tipoPessoa !== 'todos' && fornecedor.tipo_pessoa !== filters.tipoPessoa) {
      return false;
    }

    // Filtro de status
    if (filters.status !== 'todos') {
      const isAtivo = filters.status === 'ativo';
      if (fornecedor.ativo !== isAtivo) return false;
    }

    // Filtro de cidade
    if (filters.cidade && fornecedor.cidade !== filters.cidade) {
      return false;
    }

    // Filtro de estado
    if (filters.estado && fornecedor.estado !== filters.estado) {
      return false;
    }

    return true;
  });
}
