import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Copy, Sparkles } from 'lucide-react';
import {
  ORIGENS_MERCADORIA,
  CFOPS_COMUNS,
  CST_ICMS_OPTIONS,
  CST_IPI_OPTIONS,
  CST_PIS_COFINS_OPTIONS,
  TRIBUTACAO_PADRAO_SIMPLES_NACIONAL,
  TRIBUTACAO_PADRAO_LUCRO_PRESUMIDO,
} from '@/lib/tributacao';
import { useProdutosSimilares, extrairDadosTributarios } from '@/hooks/useProdutosSimilares';

interface TributacaoSectionProps {
  formData: any;
  onChange: (field: string, value: any) => void;
}

export function TributacaoSection({ formData, onChange }: TributacaoSectionProps) {
  // Expandir por padrão se não tiver dados tributários preenchidos
  const temDadosTributarios = formData.cfop && formData.cst_icms && formData.cst_pis && formData.cst_cofins;
  const [isExpanded, setIsExpanded] = useState(!temDadosTributarios);

  // Buscar produtos similares
  const produtosSimilares = useProdutosSimilares(formData.nome);
  const [showSimilares, setShowSimilares] = useState(false);

  const aplicarPadrao = (tipo: 'simples' | 'presumido') => {
    const padrao = tipo === 'simples'
      ? TRIBUTACAO_PADRAO_SIMPLES_NACIONAL
      : TRIBUTACAO_PADRAO_LUCRO_PRESUMIDO;

    Object.entries(padrao).forEach(([key, value]) => {
      onChange(key, value);
    });
  };

  const copiarDeProduto = (produto: any) => {
    const dadosTributarios = extrairDadosTributarios(produto);

    Object.entries(dadosTributarios).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        onChange(key, value);
      }
    });

    setShowSimilares(false);
    alert(`✅ Tributação copiada de: ${produto.nome}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Informações Tributárias (NF-e)</CardTitle>
            <CardDescription>
              Campos obrigatórios para emissão de Nota Fiscal Eletrônica
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Botões de aplicar padrão */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => aplicarPadrao('simples')}
              >
                Aplicar Padrão Simples Nacional
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => aplicarPadrao('presumido')}
              >
                Aplicar Padrão Lucro Presumido
              </Button>

              {produtosSimilares.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={() => setShowSimilares(!showSimilares)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Copiar de Produto Similar ({produtosSimilares.length})
                </Button>
              )}
            </div>

            {/* Lista de produtos similares */}
            {showSimilares && produtosSimilares.length > 0 && (
              <div className="border rounded-lg p-3 bg-purple-50 space-y-2">
                <p className="text-sm font-medium text-purple-900">
                  Produtos similares encontrados:
                </p>
                {produtosSimilares.map(produto => (
                  <div
                    key={produto.id}
                    className="flex items-center justify-between p-2 bg-white rounded border hover:border-purple-400 cursor-pointer"
                    onClick={() => copiarDeProduto(produto)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{produto.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        NCM: {produto.ncm} • CFOP: {produto.cfop} • CST ICMS: {produto.cst_icms}
                      </p>
                    </div>
                    <Copy className="h-4 w-4 text-purple-600" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dados Fiscais Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origem_mercadoria">
                Origem da Mercadoria <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.origem_mercadoria ?? '')}
                onValueChange={(value) => onChange('origem_mercadoria', value === '' ? null : Number(value))}
              >
                <SelectTrigger id="origem_mercadoria">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS_MERCADORIA.map((origem) => (
                    <SelectItem key={origem.value} value={String(origem.value)}>
                      {origem.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cfop">
                CFOP <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.cfop || ''}
                onValueChange={(value) => onChange('cfop', value)}
              >
                <SelectTrigger id="cfop">
                  <SelectValue placeholder="Selecione o CFOP" />
                </SelectTrigger>
                <SelectContent>
                  {CFOPS_COMUNS.map((cfop) => (
                    <SelectItem key={cfop.value} value={cfop.value}>
                      {cfop.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cest">CEST (opcional)</Label>
              <Input
                id="cest"
                type="text"
                value={formData.cest || ''}
                onChange={(e) => onChange('cest', e.target.value)}
                placeholder="0000000"
                maxLength={7}
              />
            </div>
          </div>

          {/* ICMS */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">ICMS</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cst_icms">
                  CST ICMS <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.cst_icms || ''}
                  onValueChange={(value) => onChange('cst_icms', value)}
                >
                  <SelectTrigger id="cst_icms">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CST_ICMS_OPTIONS.map((cst) => (
                      <SelectItem key={cst.value} value={cst.value}>
                        {cst.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliquota_icms">Alíquota ICMS (%)</Label>
                <Input
                  id="aliquota_icms"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.aliquota_icms ?? ''}
                  onChange={(e) => onChange('aliquota_icms', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modalidade_bc_icms">Modalidade BC</Label>
                <Select
                  value={String(formData.modalidade_bc_icms ?? '0')}
                  onValueChange={(value) => onChange('modalidade_bc_icms', Number(value))}
                >
                  <SelectTrigger id="modalidade_bc_icms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - Margem Valor Agregado</SelectItem>
                    <SelectItem value="1">1 - Pauta (Valor)</SelectItem>
                    <SelectItem value="2">2 - Preço Tabelado Máx.</SelectItem>
                    <SelectItem value="3">3 - Valor da Operação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reducao_bc_icms">Redução BC (%)</Label>
                <Input
                  id="reducao_bc_icms"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.reducao_bc_icms ?? ''}
                  onChange={(e) => onChange('reducao_bc_icms', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* IPI */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">IPI</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cst_ipi">CST IPI</Label>
                <Select
                  value={formData.cst_ipi || ''}
                  onValueChange={(value) => onChange('cst_ipi', value)}
                >
                  <SelectTrigger id="cst_ipi">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CST_IPI_OPTIONS.map((cst) => (
                      <SelectItem key={cst.value} value={cst.value}>
                        {cst.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliquota_ipi">Alíquota IPI (%)</Label>
                <Input
                  id="aliquota_ipi"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.aliquota_ipi ?? ''}
                  onChange={(e) => onChange('aliquota_ipi', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo_enquadramento_ipi">Cód. Enquadramento</Label>
                <Input
                  id="codigo_enquadramento_ipi"
                  type="text"
                  value={formData.codigo_enquadramento_ipi || '999'}
                  onChange={(e) => onChange('codigo_enquadramento_ipi', e.target.value)}
                  placeholder="999"
                  maxLength={3}
                />
              </div>
            </div>
          </div>

          {/* PIS */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">PIS</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cst_pis">
                  CST PIS <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.cst_pis || ''}
                  onValueChange={(value) => onChange('cst_pis', value)}
                >
                  <SelectTrigger id="cst_pis">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CST_PIS_COFINS_OPTIONS.map((cst) => (
                      <SelectItem key={cst.value} value={cst.value}>
                        {cst.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliquota_pis">Alíquota PIS (%)</Label>
                <Input
                  id="aliquota_pis"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.aliquota_pis ?? ''}
                  onChange={(e) => onChange('aliquota_pis', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* COFINS */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">COFINS</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cst_cofins">
                  CST COFINS <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.cst_cofins || ''}
                  onValueChange={(value) => onChange('cst_cofins', value)}
                >
                  <SelectTrigger id="cst_cofins">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CST_PIS_COFINS_OPTIONS.map((cst) => (
                      <SelectItem key={cst.value} value={cst.value}>
                        {cst.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliquota_cofins">Alíquota COFINS (%)</Label>
                <Input
                  id="aliquota_cofins"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.aliquota_cofins ?? ''}
                  onChange={(e) => onChange('aliquota_cofins', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
