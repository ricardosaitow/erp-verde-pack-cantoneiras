import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { PedidoCompleto, Cliente, ProdutoComCusto, MateriaPrima } from '../../lib/database.types';
import { formatNumber, formatQuantity, formatCurrency } from '../../lib/format';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
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
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Trash2, ShoppingCart, Save, X, User, List, DollarSign, Truck, MessageSquare
} from 'lucide-react';
import {
  verificarEstoqueMateriasPrimas,
  verificarEstoqueProdutoRevenda,
} from '../../lib/calculos';

interface PedidoItemForm {
  produto_id: string;
  tipo_produto: 'fabricado' | 'revenda';
  quantidade_pecas?: number;
  comprimento_cada_mm?: number;
  total_calculado?: number;
  quantidade_simples?: number;
  unidade_medida: string;
  preco_unitario: number;
  subtotal: number;
  observacoes?: string;
  materiais_necessarios?: Array<{
    materia_prima_id: string;
    materia_nome: string;
    consumo_kg: number;
    estoque_disponivel_kg: number;
    disponivel: boolean;
    unidade_estoque: string;
  }>;
  estoque_produto?: {
    disponivel: number;
    necessario: number;
    suficiente: boolean;
  };
}

interface PedidoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<{ error: string | null }>;
  onUpdate: (id: string, data: any) => Promise<{ error: string | null }>;
  pedido: PedidoCompleto | null;
  clientes: Cliente[];
  produtos: ProdutoComCusto[];
  materiasPrimas: MateriaPrima[];
  onSuccess: () => void;
}

export default function PedidoFormModal({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  pedido,
  clientes,
  produtos,
  materiasPrimas,
  onSuccess,
}: PedidoFormModalProps) {
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo: 'orcamento' as 'orcamento' | 'pedido_confirmado',
    status: 'pendente' as 'pendente' | 'aprovado' | 'producao' | 'finalizado' | 'entregue' | 'cancelado' | 'recusado',
    data_pedido: new Date().toISOString().split('T')[0],
    valor_produtos: 0,
    valor_frete: 0,
    valor_desconto: 0,
    valor_total: 0,
    prazo_entrega_dias: '',
    forma_pagamento: '',
    condicoes_pagamento: '',
    observacoes: '',
  });

  const [itens, setItens] = useState<PedidoItemForm[]>([]);

  // Initialize form when editing
  useEffect(() => {
    if (pedido && isOpen) {
      setFormData({
        cliente_id: pedido.cliente_id,
        tipo: pedido.tipo,
        status: pedido.status,
        data_pedido: pedido.data_pedido.split('T')[0],
        valor_produtos: Number(pedido.valor_produtos) || 0,
        valor_frete: Number(pedido.valor_frete) || 0,
        valor_desconto: Number(pedido.valor_desconto) || 0,
        valor_total: Number(pedido.valor_total) || 0,
        prazo_entrega_dias: pedido.prazo_entrega_dias?.toString() || '',
        forma_pagamento: pedido.forma_pagamento || '',
        condicoes_pagamento: pedido.condicoes_pagamento || '',
        observacoes: pedido.observacoes || '',
      });

      if (pedido.itens) {
        const itensForm: PedidoItemForm[] = pedido.itens.map(item => ({
          produto_id: item.produto_id,
          tipo_produto: item.tipo_produto as 'fabricado' | 'revenda',
          quantidade_pecas: item.quantidade_pecas || undefined,
          comprimento_cada_mm: item.comprimento_cada_mm || undefined,
          total_calculado: item.total_calculado || undefined,
          quantidade_simples: item.quantidade_simples || undefined,
          unidade_medida: item.unidade_medida,
          preco_unitario: Number(item.preco_unitario) || 0,
          subtotal: Number(item.subtotal) || 0,
          observacoes: item.observacoes || undefined,
        }));
        setItens(itensForm);
      }
    } else if (!pedido && isOpen) {
      resetForm();
    }
  }, [pedido, isOpen]);

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      tipo: 'orcamento',
      status: 'pendente',
      data_pedido: new Date().toISOString().split('T')[0],
      valor_produtos: 0,
      valor_frete: 0,
      valor_desconto: 0,
      valor_total: 0,
      prazo_entrega_dias: '',
      forma_pagamento: '',
      condicoes_pagamento: '',
      observacoes: '',
    });
    setItens([]);
  };

  const addItem = () => {
    const novoItem: PedidoItemForm = {
      produto_id: '',
      tipo_produto: 'fabricado',
      quantidade_simples: 1,
      unidade_medida: 'metro',
      preco_unitario: 0,
      subtotal: 0,
      total_calculado: undefined,
    };
    setItens([...itens, novoItem]);
  };

  const removeItem = (index: number) => {
    const newItens = itens.filter((_, i) => i !== index);
    setItens(newItens);
    calcularTotais(newItens);
  };

  const updateItem = (index: number, field: keyof PedidoItemForm, value: any) => {
    const newItens = [...itens];
    const item = newItens[index];
    const produto = produtos.find(p => p.id === item.produto_id);

    if (field === 'produto_id') {
      const produto = produtos.find(p => p.id === value);
      if (produto) {
        item.produto_id = value;
        item.tipo_produto = produto.tipo as 'fabricado' | 'revenda';
        item.preco_unitario = Number(produto.preco_venda_unitario) || 0;
        item.unidade_medida = produto.unidade_venda;
        item.materiais_necessarios = undefined;
        item.estoque_produto = undefined;

        if (produto.permite_medida_composta && produto.tipo === 'fabricado') {
          item.quantidade_pecas = 1;
          item.comprimento_cada_mm = 1000;
          item.quantidade_simples = undefined;
          const totalMetros = (item.quantidade_pecas * item.comprimento_cada_mm) / 1000;
          item.subtotal = totalMetros * item.preco_unitario;
          item.total_calculado = totalMetros;

          if (produto.receitas && produto.receitas.length > 0 && totalMetros > 0) {
            const verificacao = verificarEstoqueMateriasPrimas(
              totalMetros,
              produto.receitas,
              materiasPrimas
            );
            item.materiais_necessarios = verificacao.materiais;
          }
        } else if (produto.tipo === 'fabricado' && !produto.permite_medida_composta) {
          item.quantidade_simples = item.quantidade_simples || 1;
          item.quantidade_pecas = undefined;
          item.comprimento_cada_mm = undefined;
          item.total_calculado = item.quantidade_simples;
          item.subtotal = item.quantidade_simples * item.preco_unitario;

          if (produto.receitas && produto.receitas.length > 0 && item.quantidade_simples > 0) {
            const verificacao = verificarEstoqueMateriasPrimas(
              item.quantidade_simples,
              produto.receitas,
              materiasPrimas
            );
            item.materiais_necessarios = verificacao.materiais;
          }
        } else {
          item.quantidade_simples = item.quantidade_simples || 1;
          item.quantidade_pecas = undefined;
          item.comprimento_cada_mm = undefined;
          item.total_calculado = undefined;
          item.subtotal = item.quantidade_simples * item.preco_unitario;

          if (produto.tipo === 'revenda') {
            const verificacao = verificarEstoqueProdutoRevenda(produto, item.quantidade_simples);
            item.estoque_produto = {
              disponivel: verificacao.disponivel_estoque,
              necessario: verificacao.necessario,
              suficiente: verificacao.suficiente,
            };
          }
        }
      }
    } else if (field === 'quantidade_simples') {
      item.quantidade_simples = Number(value) || 0;
      item.subtotal = item.quantidade_simples * item.preco_unitario;
      item.quantidade_pecas = undefined;
      item.comprimento_cada_mm = undefined;
      item.estoque_produto = undefined;

      if (produto) {
        if (produto.tipo === 'revenda') {
          const verificacao = verificarEstoqueProdutoRevenda(produto, item.quantidade_simples);
          item.estoque_produto = {
            disponivel: verificacao.disponivel_estoque,
            necessario: verificacao.necessario,
            suficiente: verificacao.suficiente,
          };
          item.materiais_necessarios = undefined;
        } else if (produto.tipo === 'fabricado') {
          item.total_calculado = item.quantidade_simples;
          item.materiais_necessarios = undefined;

          if (produto.receitas && produto.receitas.length > 0 && item.quantidade_simples > 0) {
            const verificacao = verificarEstoqueMateriasPrimas(
              item.quantidade_simples,
              produto.receitas,
              materiasPrimas
            );
            item.materiais_necessarios = verificacao.materiais;
          }
        }
      }
    } else if (field === 'quantidade_pecas' || field === 'comprimento_cada_mm') {
      (item as any)[field] = Number(value) || 0;
      if (item.quantidade_pecas && item.comprimento_cada_mm) {
        const totalMetros = (item.quantidade_pecas * item.comprimento_cada_mm) / 1000;
        item.subtotal = totalMetros * item.preco_unitario;
        item.total_calculado = totalMetros;
        item.quantidade_simples = undefined;
        item.estoque_produto = undefined;

        if (produto && produto.tipo === 'fabricado' && produto.receitas && produto.receitas.length > 0 && totalMetros > 0) {
          const verificacao = verificarEstoqueMateriasPrimas(
            totalMetros,
            produto.receitas,
            materiasPrimas
          );
          item.materiais_necessarios = verificacao.materiais;
        } else {
          item.materiais_necessarios = undefined;
        }
      }
    } else {
      (item as any)[field] = value;
    }

    setItens(newItens);
    calcularTotais(newItens);
  };

  const calcularTotais = (itensAtuais: PedidoItemForm[], frete: number = formData.valor_frete, desconto: number = formData.valor_desconto) => {
    const valorProdutos = itensAtuais.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    const valorFrete = Number(frete) || 0;
    const valorDesconto = Number(desconto) || 0;
    const valorTotal = valorProdutos + valorFrete - valorDesconto;

    setFormData(prev => ({
      ...prev,
      valor_produtos: valorProdutos,
      valor_frete: valorFrete,
      valor_desconto: valorDesconto,
      valor_total: valorTotal,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    const problemasEstoque: string[] = [];

    for (const item of itens) {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (!produto) continue;

      if (produto.tipo === 'fabricado' && item.materiais_necessarios) {
        const materiaisFaltantes = item.materiais_necessarios.filter(m => !m.disponivel);
        if (materiaisFaltantes.length > 0) {
          for (const materia of materiaisFaltantes) {
            problemasEstoque.push(
              `${produto.nome}: ${materia.materia_nome} - Necessário: ${formatQuantity(materia.consumo_kg, materia.unidade_estoque)}, Disponível: ${formatQuantity(materia.estoque_disponivel_kg, materia.unidade_estoque)}`
            );
          }
        }
      } else if (produto.tipo === 'revenda' && item.estoque_produto) {
        if (!item.estoque_produto.suficiente) {
          problemasEstoque.push(
            `${produto.nome}: Necessário: ${item.estoque_produto.necessario}, Disponível: ${item.estoque_produto.disponivel}`
          );
        }
      }
    }

    if (problemasEstoque.length > 0) {
      toast.error(
        'Estoque insuficiente para os seguintes itens. Ajuste as quantidades ou compre mais materiais antes de criar o pedido.'
      );
      return;
    }

    const pedidoData: any = {
      cliente_id: formData.cliente_id,
      data_pedido: formData.data_pedido,
      tipo: formData.tipo,
      // Novos pedidos sempre são criados como "pendente"
      // Status só pode ser alterado após a criação via modal de detalhes
      status: pedido ? formData.status : 'pendente',
      valor_produtos: formData.valor_produtos,
      valor_frete: formData.valor_frete || 0,
      valor_desconto: formData.valor_desconto || 0,
      valor_total: formData.valor_total,
      prazo_entrega_dias: formData.prazo_entrega_dias ? Number(formData.prazo_entrega_dias) : null,
      forma_pagamento: formData.forma_pagamento || null,
      condicoes_pagamento: formData.condicoes_pagamento || null,
      observacoes: formData.observacoes || null,
      itens: itens.map(item => ({
        produto_id: item.produto_id,
        tipo_produto: item.tipo_produto,
        quantidade_pecas: item.quantidade_pecas || null,
        comprimento_cada_mm: item.comprimento_cada_mm || null,
        total_calculado: item.total_calculado || null,
        quantidade_simples: item.quantidade_simples || null,
        unidade_medida: item.unidade_medida,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
        observacoes: item.observacoes || null,
      })),
    };

    const result = pedido
      ? await onUpdate(pedido.id, pedidoData)
      : await onCreate(pedidoData);

    if (result.error) {
      toast.error(`Erro ao ${pedido ? 'atualizar' : 'criar'} pedido: ` + result.error);
      return;
    }

    toast.success(`Pedido ${pedido ? 'atualizado' : 'criado'} com sucesso!`);
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 ${pedido ? 'bg-blue-100' : 'bg-emerald-100'} rounded-lg`}>
              <ShoppingCart className={`h-5 w-5 ${pedido ? 'text-blue-600' : 'text-emerald-600'}`} />
            </div>
            <div>
              <DialogTitle>{pedido ? `Editar Pedido ${pedido.numero_pedido}` : 'Novo Pedido'}</DialogTitle>
              <DialogDescription>
                {pedido ? 'Edite os dados do pedido abaixo' : 'Preencha os dados do pedido abaixo'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {/* Dados Principais */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Dados Principais</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cliente_id" className="text-sm font-medium">
                    Cliente <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.filter(c => c.ativo).map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome_fantasia || cliente.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_pedido" className="text-sm font-medium">
                    Data do Pedido <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="data_pedido"
                    type="date"
                    value={formData.data_pedido}
                    onChange={(e) => setFormData({ ...formData, data_pedido: e.target.value })}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-sm font-medium">
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: any) => {
                      setFormData({ ...formData, tipo: value });
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orcamento">Orçamento</SelectItem>
                      <SelectItem value="pedido_confirmado">Pedido Confirmado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Itens do Pedido */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <List className="h-4 w-4" />
                <span>Itens do Pedido</span>
              </div>
              <Card className="p-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {itens.map((item, index) => {
                    const produto = produtos.find(p => p.id === item.produto_id);
                    const isFabricado = item.tipo_produto === 'fabricado' && produto?.permite_medida_composta;

                    return (
                      <Card key={index} className="p-4 bg-muted/30">
                        <div className="grid grid-cols-12 gap-3 items-end mb-2">
                          <div className="col-span-12 sm:col-span-5 space-y-2">
                            <Label className="text-sm font-medium">
                              Produto <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={item.produto_id}
                              onValueChange={(value) => updateItem(index, 'produto_id', value)}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecione um produto" />
                              </SelectTrigger>
                              <SelectContent>
                                {produtos.filter(p => p.ativo).map(prod => (
                                  <SelectItem key={prod.id} value={prod.id}>
                                    {prod.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {isFabricado ? (
                            <>
                              <div className="col-span-6 sm:col-span-2 space-y-2">
                                <Label className="text-sm font-medium">Qtd (peças)</Label>
                                <NumberInput
                                  className="h-10"
                                  value={Number(item.quantidade_pecas) || 0}
                                  onChange={(value) => updateItem(index, 'quantidade_pecas', value.toString())}
                                />
                              </div>
                              <div className="col-span-6 sm:col-span-2 space-y-2">
                                <Label className="text-sm font-medium">Comp. (mm)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-10"
                                  value={item.comprimento_cada_mm || ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    updateItem(index, 'comprimento_cada_mm', value.toString());
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="col-span-9 sm:col-span-4 space-y-2">
                              <Label className="text-sm font-medium">Quantidade</Label>
                              <NumberInput
                                className="h-10"
                                value={Number(item.quantidade_simples) || 0}
                                onChange={(value) => updateItem(index, 'quantidade_simples', value.toString())}
                                allowDecimals={true}
                                required
                              />
                            </div>
                          )}

                          <div className="col-span-2 flex items-end justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">
                            Preço: {formatCurrency(item.preco_unitario)}
                          </span>
                          <span className="font-bold">
                            Subtotal: {formatCurrency(item.subtotal)}
                          </span>
                        </div>

                        {item.tipo_produto === 'fabricado' && produto && produto.receitas && produto.receitas.length > 0 && item.materiais_necessarios && item.materiais_necessarios.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-semibold mb-2">📦 Matéria-prima necessária:</p>
                            <div className="space-y-1">
                              {item.materiais_necessarios.map((materia, idx) => (
                                <Alert
                                  key={idx}
                                  className={`text-xs p-2 ${
                                    materia.disponivel
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-destructive/10 border-destructive/20'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">{materia.materia_nome}</span>
                                    <span className={materia.disponivel ? 'text-green-700' : 'text-destructive'}>
                                      {materia.disponivel ? '✓' : '⚠️'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center mt-1 text-muted-foreground">
                                    <span>
                                      Consumo: {formatQuantity(materia.consumo_kg, materia.unidade_estoque)}
                                    </span>
                                    <span>
                                      Estoque: {formatQuantity(materia.estoque_disponivel_kg, materia.unidade_estoque)}
                                    </span>
                                  </div>
                                  {!materia.disponivel && (
                                    <p className="text-xs text-destructive mt-1">
                                      Faltam: {formatQuantity(materia.consumo_kg - materia.estoque_disponivel_kg, materia.unidade_estoque)}
                                    </p>
                                  )}
                                </Alert>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.tipo_produto === 'revenda' && item.estoque_produto && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-semibold mb-2">📦 Estoque do produto:</p>
                            <Alert
                              className={`text-xs p-2 ${
                                item.estoque_produto.suficiente
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-destructive/10 border-destructive/20'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Estoque disponível</span>
                                <span className={item.estoque_produto.suficiente ? 'text-green-700' : 'text-destructive'}>
                                  {item.estoque_produto.suficiente ? '✓' : '⚠️'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-1 text-muted-foreground">
                                <span>
                                  Necessário: {item.estoque_produto.necessario} {item.unidade_medida}
                                </span>
                                <span>
                                  Disponível: {item.estoque_produto.disponivel} {item.unidade_medida}
                                </span>
                              </div>
                              {!item.estoque_produto.suficiente && (
                                <p className="text-xs text-destructive mt-1">
                                  Faltam: {item.estoque_produto.necessario - item.estoque_produto.disponivel} {item.unidade_medida}
                                </p>
                              )}
                            </Alert>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="w-full border-dashed h-10 gap-2 mt-3"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Item
                </Button>
              </Card>
            </div>

            <Separator />

            {/* Valores */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Valores</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Valor Produtos</Label>
                  <Input
                    value={formatCurrency(formData.valor_produtos)}
                    readOnly
                    className="h-10 bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frete" className="text-sm font-medium">
                    Frete
                  </Label>
                  <CurrencyInput
                    id="frete"
                    value={Number(formData.valor_frete) || 0}
                    onChange={(frete) => {
                      calcularTotais(itens, frete, formData.valor_desconto);
                    }}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desconto" className="text-sm font-medium">
                    Desconto
                  </Label>
                  <CurrencyInput
                    id="desconto"
                    value={Number(formData.valor_desconto) || 0}
                    onChange={(desconto) => {
                      calcularTotais(itens, formData.valor_frete, desconto);
                    }}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Valor Total</Label>
                  <Input
                    value={formatCurrency(formData.valor_total)}
                    readOnly
                    className="h-10 bg-emerald-50 font-bold text-emerald-700"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Entrega e Pagamento */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Entrega e Pagamento</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prazo" className="text-sm font-medium">
                    Prazo Entrega (dias)
                  </Label>
                  <NumberInput
                    id="prazo"
                    value={Number(formData.prazo_entrega_dias) || 0}
                    onChange={(value) => setFormData({ ...formData, prazo_entrega_dias: value.toString() })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pagamento" className="text-sm font-medium">
                    Forma de Pagamento
                  </Label>
                  <Input
                    id="pagamento"
                    value={formData.forma_pagamento}
                    onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condicoes" className="text-sm font-medium">
                  Condições de Pagamento
                </Label>
                <Textarea
                  id="condicoes"
                  value={formData.condicoes_pagamento}
                  onChange={(e) => setFormData({ ...formData, condicoes_pagamento: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            <Separator />

            {/* Observações */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>Observações</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-sm font-medium">
                  Observações Gerais
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="resize-none"
                  placeholder="Informações adicionais sobre o pedido..."
                />
              </div>
            </div>
          </div>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              {pedido ? 'Atualizar' : 'Salvar'} Pedido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
