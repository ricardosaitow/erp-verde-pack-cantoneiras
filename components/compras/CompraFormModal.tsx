import { useState } from 'react';
import { toast } from 'sonner';
import { useCompras } from '../../hooks/useCompras';
import type { Fornecedor, MateriaPrima, Produto, ItemCompra } from '../../lib/database.types';
import { formatCurrency } from '../../lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, X, Trash2, ShoppingCart } from 'lucide-react';

interface CompraFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fornecedores: Fornecedor[];
  materiasPrimas: MateriaPrima[];
  produtos: Produto[];
}

interface ItemFormData {
  tipo: 'materia_prima' | 'revenda';
  item_id: string;
  quantidade: number;
  unidade_medida: string;
  preco_unitario: number;
}

export function CompraFormModal({
  open,
  onClose,
  onSuccess,
  fornecedores,
  materiasPrimas,
  produtos,
}: CompraFormModalProps) {
  const { create } = useCompras();

  const [formData, setFormData] = useState({
    fornecedor_id: '',
    data_compra: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    tipo_compra: 'materia_prima' as 'materia_prima' | 'revenda',
    desconto: 0,
    frete: 0,
    outras_despesas: 0,
    condicao_pagamento: '',
    observacoes: '',
  });

  const [itens, setItens] = useState<ItemFormData[]>([]);
  const [currentItem, setCurrentItem] = useState<ItemFormData>({
    tipo: 'materia_prima',
    item_id: '',
    quantidade: 0,
    unidade_medida: 'kg',
    preco_unitario: 0,
  });

  const handleAddItem = () => {
    if (!currentItem.item_id || currentItem.quantidade <= 0 || currentItem.preco_unitario <= 0) {
      toast.error('Preencha todos os campos do item');
      return;
    }

    setItens([...itens, currentItem]);
    setCurrentItem({
      tipo: formData.tipo_compra,
      item_id: '',
      quantidade: 0,
      unidade_medida: currentItem.unidade_medida,
      preco_unitario: 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const getItemNome = (item: ItemFormData) => {
    if (item.tipo === 'materia_prima') {
      const mp = materiasPrimas.find(m => m.id === item.item_id);
      return mp?.nome || 'Item não encontrado';
    } else {
      const prod = produtos.find(p => p.id === item.item_id);
      return prod?.nome || 'Item não encontrado';
    }
  };

  const calcularValorTotal = () => {
    return itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);
  };

  const calcularValorFinal = () => {
    return calcularValorTotal() - formData.desconto + formData.frete + formData.outras_despesas;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fornecedor_id) {
      toast.error('Selecione um fornecedor');
      return;
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    const compraData = {
      ...formData,
      valor_total: calcularValorTotal(),
      valor_final: calcularValorFinal(),
      status: 'pendente' as const,
    };

    const itensCompra: Partial<ItemCompra>[] = itens.map(item => ({
      materia_prima_id: item.tipo === 'materia_prima' ? item.item_id : undefined,
      produto_revenda_id: item.tipo === 'revenda' ? item.item_id : undefined,
      quantidade: item.quantidade,
      unidade_medida: item.unidade_medida,
      preco_unitario: item.preco_unitario,
      quantidade_recebida: 0,
    }));

    const { error } = await create(compraData, itensCompra);

    if (error) {
      toast.error(`Erro ao criar compra: ${error}`);
      return;
    }

    toast.success('Compra criada com sucesso!');
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle>Nova Compra</DialogTitle>
              <DialogDescription>Cadastre uma nova compra de matéria-prima ou revenda</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fornecedor_id">
                Fornecedor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.fornecedor_id}
                onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome_fantasia || fornecedor.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_compra">
                Tipo de Compra <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tipo_compra}
                onValueChange={(value: 'materia_prima' | 'revenda') => {
                  setFormData({ ...formData, tipo_compra: value });
                  setCurrentItem({ ...currentItem, tipo: value });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="materia_prima">Matéria-Prima</SelectItem>
                  <SelectItem value="revenda">Revenda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_compra">
                Data da Compra <span className="text-destructive">*</span>
              </Label>
              <Input
                id="data_compra"
                type="date"
                value={formData.data_compra}
                onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_entrega_prevista">Data Entrega Prevista</Label>
              <Input
                id="data_entrega_prevista"
                type="date"
                value={formData.data_entrega_prevista}
                onChange={(e) => setFormData({ ...formData, data_entrega_prevista: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condicao_pagamento">Condição de Pagamento</Label>
              <Input
                id="condicao_pagamento"
                type="text"
                placeholder="Ex: 30/60/90 dias"
                value={formData.condicao_pagamento}
                onChange={(e) => setFormData({ ...formData, condicao_pagamento: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          {/* Itens */}
          <div className="space-y-4">
            <h3 className="font-semibold">Itens da Compra</h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="md:col-span-5 space-y-2">
                <Label>Item</Label>
                <Select
                  value={currentItem.item_id}
                  onValueChange={(value) => {
                    const item = formData.tipo_compra === 'materia_prima'
                      ? materiasPrimas.find(m => m.id === value)
                      : produtos.find(p => p.id === value);

                    setCurrentItem({
                      ...currentItem,
                      item_id: value,
                      unidade_medida: formData.tipo_compra === 'materia_prima'
                        ? (item as MateriaPrima)?.unidade_estoque || 'kg'
                        : (item as Produto)?.unidade_venda || 'un'
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.tipo_compra === 'materia_prima'
                      ? materiasPrimas.map((mp) => (
                          <SelectItem key={mp.id} value={mp.id}>
                            {mp.nome}
                          </SelectItem>
                        ))
                      : produtos.map((prod) => (
                          <SelectItem key={prod.id} value={prod.id}>
                            {prod.nome}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Quantidade ({currentItem.unidade_medida})</Label>
                <NumberInput
                  value={currentItem.quantidade}
                  onChange={(value) => setCurrentItem({ ...currentItem, quantidade: value })}
                  allowDecimals={false}
                  placeholder={`Ex: 100 ${currentItem.unidade_medida}`}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Preço Unit.</Label>
                <CurrencyInput
                  value={currentItem.preco_unitario}
                  onChange={(value) => setCurrentItem({ ...currentItem, preco_unitario: value })}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Subtotal</Label>
                <Input
                  type="text"
                  value={formatCurrency(currentItem.quantidade * currentItem.preco_unitario)}
                  disabled
                />
              </div>

              <div className="md:col-span-1 flex items-end">
                <Button type="button" onClick={handleAddItem} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Lista de itens adicionados */}
            {itens.length > 0 && (
              <div className="space-y-2">
                {itens.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{getItemNome(item)}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantidade} {item.unidade_medida} × {formatCurrency(item.preco_unitario)} = {formatCurrency(item.quantidade * item.preco_unitario)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="desconto">Desconto</Label>
              <CurrencyInput
                id="desconto"
                value={formData.desconto}
                onChange={(value) => setFormData({ ...formData, desconto: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frete">Frete</Label>
              <CurrencyInput
                id="frete"
                value={formData.frete}
                onChange={(value) => setFormData({ ...formData, frete: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outras_despesas">Outras Despesas</Label>
              <CurrencyInput
                id="outras_despesas"
                value={formData.outras_despesas}
                onChange={(value) => setFormData({ ...formData, outras_despesas: value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Final</Label>
              <Input
                type="text"
                value={formatCurrency(calcularValorFinal())}
                disabled
                className="font-bold text-lg"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              rows={3}
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais sobre a compra..."
            />
          </div>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Criar Compra
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
