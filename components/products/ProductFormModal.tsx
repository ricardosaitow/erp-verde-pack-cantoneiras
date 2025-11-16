import { useState, useEffect } from 'react';
import { useCategorias } from '../../hooks/useCategorias';
import { useMateriasPrimas } from '../../hooks/useMateriasPrimas';
import { useFornecedores } from '../../hooks/useFornecedores';
import type { ProdutoComCusto } from '../../lib/database.types';
import { formatNumber, formatCurrency } from '../../lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Trash2, Package, Save, X, Info, List, DollarSign, Ruler, Factory, ShoppingBag, Calculator } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: any) => void;
  product: ProdutoComCusto | null;
}

interface ReceitaItem {
  id?: string;
  materia_prima_id: string;
  numero_camadas: number;
  consumo_por_metro_g: number;
  custo_por_metro: number;
}

export default function ProductFormModal({ isOpen, onClose, onSave, product }: ProductFormModalProps) {
  const { categorias, loading: loadingCategorias } = useCategorias();
  const { materiasPrimas, loading: loadingMateriasPrimas } = useMateriasPrimas();
  const { fornecedores, loading: loadingFornecedores } = useFornecedores();

  const [formData, setFormData] = useState<any>({
    tipo: 'fabricado',
    unidade_venda: 'metro',
    permite_medida_composta: false,
    receita: []
  });

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        receita: product.receitas?.map((r: any) => ({
          id: r.id,
          materia_prima_id: r.materia_prima_id,
          numero_camadas: r.numero_camadas,
          consumo_por_metro_g: Number(r.consumo_por_metro_g),
          custo_por_metro: Number(r.custo_por_metro || 0)
        })) || []
      });
    } else {
      setFormData({
        tipo: 'fabricado',
        unidade_venda: 'metro',
        permite_medida_composta: false,
        receita: []
      });
    }
  }, [product, isOpen]);

  const handleChange = (name: string, value: any, type?: string) => {
    if (name === 'tipo') {
      const newFormData: any = {
        ...formData,
        [name]: value,
      };

      if (value === 'fabricado') {
        newFormData.receita = [];
        newFormData.altura_mm = formData.altura_mm || 0;
        newFormData.largura_mm = formData.largura_mm || 0;
        newFormData.espessura_mm = formData.espessura_mm || 0;
        newFormData.permite_medida_composta = formData.permite_medida_composta || false;
        newFormData.estoque_atual = undefined;
        newFormData.estoque_minimo = undefined;
        newFormData.fornecedor_id = undefined;
      } else if (value === 'revenda') {
        newFormData.receita = undefined;
        newFormData.altura_mm = undefined;
        newFormData.largura_mm = undefined;
        newFormData.espessura_mm = undefined;
        newFormData.permite_medida_composta = false;
        newFormData.estoque_atual = formData.estoque_atual || 0;
        newFormData.estoque_minimo = formData.estoque_minimo || 0;
        newFormData.fornecedor_id = fornecedores[0]?.id || undefined;
      }

      setFormData(newFormData);
      return;
    }

    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    });
  };

  const handleReceitaChange = (index: number, field: keyof ReceitaItem, value: string) => {
    const newReceita = [...(formData.receita || [])];
    const currentItem = newReceita[index];

    if (field === 'numero_camadas') {
      currentItem.numero_camadas = Number(value);
    } else if (field === 'materia_prima_id') {
      currentItem.materia_prima_id = value;
    }

    const materiaPrima = materiasPrimas.find(mp => mp.id === currentItem.materia_prima_id);
    if (materiaPrima) {
      const pesoPorMetro = Number(materiaPrima.peso_por_metro_g) || 0;
      const custoPorUnidade = Number(materiaPrima.custo_por_unidade) || 0;
      currentItem.consumo_por_metro_g = pesoPorMetro * currentItem.numero_camadas;
      currentItem.custo_por_metro = (currentItem.consumo_por_metro_g / 1000) * custoPorUnidade;
    }

    setFormData({ ...formData, receita: newReceita });
  };

  const addReceitaItem = () => {
    const firstMateriaPrima = materiasPrimas.find(mp => mp.tipo === 'papel_kraft') || materiasPrimas[0];
    if (!firstMateriaPrima) return;

    const pesoPorMetro = Number(firstMateriaPrima.peso_por_metro_g) || 0;
    const custoPorUnidade = Number(firstMateriaPrima.custo_por_unidade) || 0;
    const consumoPorMetro = pesoPorMetro;
    const custoPorMetro = (consumoPorMetro / 1000) * custoPorUnidade;

    const newItem: ReceitaItem = {
      materia_prima_id: firstMateriaPrima.id,
      numero_camadas: 1,
      consumo_por_metro_g: consumoPorMetro,
      custo_por_metro: custoPorMetro,
    };
    setFormData({ ...formData, receita: [...(formData.receita || []), newItem] });
  };

  const removeReceitaItem = (index: number) => {
    const newReceita = formData.receita?.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, receita: newReceita });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { receita, ...productData } = formData;

    const produtoParaSalvar: any = {
      ...productData,
      tipo: formData.tipo,
      categoria_id: formData.categoria_id || null,
      fornecedor_id: formData.fornecedor_id || null,
      altura_mm: formData.altura_mm ? Number(formData.altura_mm) : null,
      largura_mm: formData.largura_mm ? Number(formData.largura_mm) : null,
      espessura_mm: formData.espessura_mm ? Number(formData.espessura_mm) : null,
      preco_venda_unitario: Number(formData.preco_venda_unitario),
      estoque_atual: formData.estoque_atual ? Number(formData.estoque_atual) : null,
      estoque_minimo: formData.estoque_minimo ? Number(formData.estoque_minimo) : null,
      custo_compra: formData.custo_compra ? Number(formData.custo_compra) : null,
      permite_medida_composta: formData.permite_medida_composta || false,
    };

    if (formData.tipo === 'fabricado' && receita && receita.length > 0) {
      produtoParaSalvar.receitas = receita.map((r: ReceitaItem) => ({
        materia_prima_id: r.materia_prima_id,
        numero_camadas: r.numero_camadas,
        consumo_por_metro_g: r.consumo_por_metro_g,
        custo_por_metro: r.custo_por_metro,
      }));
    }

    onSave(produtoParaSalvar);
  };

  const custoTotalFabricacao = formData.receita?.reduce((acc: number, item: ReceitaItem) => acc + (item.custo_por_metro || 0), 0) || 0;
  const precoVenda = Number(formData.preco_venda_unitario) || 0;
  const margemReal = precoVenda && custoTotalFabricacao > 0
    ? ((precoVenda - custoTotalFabricacao) / custoTotalFabricacao) * 100
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle>{product ? 'Editar' : 'Novo'} Produto</DialogTitle>
              <DialogDescription>
                Preencha os dados do produto abaixo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: formData.tipo === 'fabricado' ? '1fr 1fr' : '1fr' }}>
              <TabsTrigger value="info" className="gap-2">
                <Info className="h-4 w-4" />
                Informações Básicas
              </TabsTrigger>
              {formData.tipo === 'fabricado' && (
                <TabsTrigger value="composicao" className="gap-2">
                  <List className="h-4 w-4" />
                  Composição/Receita
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-2 mt-4 min-h-0">
              <TabsContent value="info" className="space-y-6 mt-0">
                {/* Tipo do Produto - PRIMEIRO */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>Tipo do Produto</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo" className="text-sm font-medium">
                      Tipo <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.tipo || 'fabricado'}
                      onValueChange={(value) => handleChange('tipo', value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fabricado">
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4" />
                            <span>Fabricado</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="revenda">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" />
                            <span>Revenda</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Informações Básicas */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>Dados do Produto</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="text-sm font-medium">
                        Nome do Produto <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="nome"
                        value={formData.nome || ''}
                        onChange={(e) => handleChange('nome', e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="categoria_id" className="text-sm font-medium">
                        Categoria <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.categoria_id || ''}
                        onValueChange={(value) => handleChange('categoria_id', value)}
                        disabled={loadingCategorias}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Dimensões - Produto Fabricado */}
                {formData.tipo === 'fabricado' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Ruler className="h-4 w-4" />
                      <span>Dimensões</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="altura_mm" className="text-sm font-medium">
                          Altura (mm)
                        </Label>
                        <NumberInput
                          id="altura_mm"
                          value={formData.altura_mm || 0}
                          onChange={(value) => handleChange('altura_mm', value, 'number')}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="largura_mm" className="text-sm font-medium">
                          Largura (mm)
                        </Label>
                        <NumberInput
                          id="largura_mm"
                          value={formData.largura_mm || 0}
                          onChange={(value) => handleChange('largura_mm', value, 'number')}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="espessura_mm" className="text-sm font-medium">
                          Espessura (mm)
                        </Label>
                        <NumberInput
                          id="espessura_mm"
                          value={formData.espessura_mm || 0}
                          onChange={(value) => handleChange('espessura_mm', value, 'number')}
                          allowDecimals={true}
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 py-2">
                      <Checkbox
                        id="permite_medida_composta"
                        checked={formData.permite_medida_composta || false}
                        onCheckedChange={(checked) => handleChange('permite_medida_composta', checked)}
                      />
                      <Label htmlFor="permite_medida_composta" className="cursor-pointer text-sm font-medium">
                        Permite venda por unidade composta
                      </Label>
                    </div>
                  </div>
                )}

                {/* Estoque e Fornecedor - Produto Revenda */}
                {formData.tipo === 'revenda' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Controle e Fornecedor</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="estoque_minimo" className="text-sm font-medium">
                          Estoque Mínimo
                        </Label>
                        <NumberInput
                          id="estoque_minimo"
                          value={formData.estoque_minimo || 0}
                          onChange={(value) => handleChange('estoque_minimo', value, 'number')}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fornecedor_id" className="text-sm font-medium">
                          Fornecedor
                        </Label>
                        <Select
                          value={formData.fornecedor_id || ''}
                          onValueChange={(value) => handleChange('fornecedor_id', value)}
                          disabled={loadingFornecedores}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione um fornecedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {fornecedores.map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.nome_fantasia || f.razao_social}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custo_compra" className="text-sm font-medium">
                        Custo de Compra
                      </Label>
                      <CurrencyInput
                        id="custo_compra"
                        value={formData.custo_compra || 0}
                        onChange={(value) => handleChange('custo_compra', value, 'number')}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                <Separator />

                {/* Preço de Venda */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Preço de Venda</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="preco_venda_unitario" className="text-sm font-medium">
                        Preço Venda <span className="text-destructive">*</span>
                      </Label>
                      <CurrencyInput
                        id="preco_venda_unitario"
                        value={formData.preco_venda_unitario || 0}
                        onChange={(value) => handleChange('preco_venda_unitario', value, 'number')}
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unidade_venda" className="text-sm font-medium">
                        Unidade de Venda <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.unidade_venda || 'metro'}
                        onValueChange={(value) => handleChange('unidade_venda', value)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="metro">Metro</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="unidade">Unidade</SelectItem>
                          <SelectItem value="rolo">Rolo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {formData.tipo === 'fabricado' && (
                <TabsContent value="composicao" className="space-y-6 mt-0">
                  {loadingMateriasPrimas ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando matérias-primas...</div>
                  ) : (
                    <>
                      {/* Lista de Matérias-Primas */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                          <List className="h-4 w-4" />
                          <span>Matérias-Primas da Receita</span>
                        </div>

                        {formData.receita?.length > 0 ? (
                          <div className="space-y-3">
                            {formData.receita.map((item: ReceitaItem, index: number) => {
                              return (
                                <Card key={item.id || index} className="p-4">
                                  <div className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-12 sm:col-span-5 space-y-2">
                                      <Label htmlFor={`mp-${index}`} className="text-sm font-medium">
                                        Matéria-Prima <span className="text-destructive">*</span>
                                      </Label>
                                      <Select
                                        value={item.materia_prima_id || ''}
                                        onValueChange={(value) => handleReceitaChange(index, 'materia_prima_id', value)}
                                      >
                                        <SelectTrigger id={`mp-${index}`} className="h-10">
                                          <SelectValue placeholder="Selecione uma matéria-prima" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {materiasPrimas.map(mp => (
                                            <SelectItem key={mp.id} value={mp.id}>{mp.nome}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="col-span-5 sm:col-span-2 space-y-2">
                                      <Label htmlFor={`camadas-${index}`} className="text-sm font-medium">
                                        Camadas <span className="text-destructive">*</span>
                                      </Label>
                                      <NumberInput
                                        id={`camadas-${index}`}
                                        className="h-10"
                                        value={Number(item.numero_camadas) || 1}
                                        onChange={(value) => handleReceitaChange(index, 'numero_camadas', value.toString())}
                                      />
                                    </div>
                                    <div className="col-span-6 sm:col-span-4 space-y-1">
                                      <div className="text-xs text-muted-foreground">
                                        <span className="font-medium">Custo:</span> <span className="font-semibold text-foreground">{formatCurrency(item.custo_por_metro || 0)}/m</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        <span className="font-medium">Consumo:</span> <span className="font-semibold text-foreground">{formatNumber(item.consumo_por_metro_g || 0)}g/m</span>
                                      </div>
                                    </div>
                                    <div className="col-span-1 flex items-center justify-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeReceitaItem(index)}
                                        className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhuma matéria-prima adicionada</p>
                            <p className="text-xs mt-1">Clique no botão abaixo para adicionar</p>
                          </div>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={addReceitaItem}
                          disabled={materiasPrimas.length === 0}
                          className="w-full border-dashed h-10 gap-2"
                        >
                          <List className="h-4 w-4" />
                          Adicionar Matéria-Prima
                        </Button>
                        {materiasPrimas.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center">
                            Nenhuma matéria-prima disponível. Cadastre matérias-primas primeiro.
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* Resumo de Custos */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                          <Calculator className="h-4 w-4" />
                          <span>Resumo de Custos</span>
                        </div>
                        <Alert className="bg-blue-50 border-blue-200">
                          <Calculator className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="ml-6">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-semibold text-blue-900">Custo Total de Fabricação:</span>
                              <span className="font-mono text-blue-700">{formatCurrency(custoTotalFabricacao)} /m</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-blue-900">Margem de Lucro:</span>
                              <span className={`font-mono ${margemReal < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatNumber(margemReal)}%
                              </span>
                            </div>
                            {formData.receita?.length > 0 && (
                              <div className="text-xs text-blue-600 mt-2 pt-2 border-t border-blue-200">
                                Baseado em {formData.receita.length} {formData.receita.length === 1 ? 'matéria-prima' : 'matérias-primas'}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      </div>
                    </>
                  )}
                </TabsContent>
              )}
            </div>
          </Tabs>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              {product ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
