import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useMovimentacoesEstoque } from '../hooks/useMovimentacoesEstoque';
import { useProdutos } from '../hooks/useProdutos';
import { useMateriasPrimas } from '../hooks/useMateriasPrimas';
import type { MovimentacaoEstoque } from '../lib/database.types';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { formatNumber, formatQuantity } from '../lib/format';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import { Plus, RefreshCw, Trash2, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { MovimentacoesFilter, applyFilters, type FilterState } from '@/components/movimentacoes/MovimentacoesFilter';

export default function MovimentacoesPage() {
  const { movimentacoes, loading, error, refresh, create, delete: deleteMov } = useMovimentacoesEstoque();
  const { produtos } = useProdutos();
  const { materiasPrimas } = useMateriasPrimas();

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tipo: 'todos',
    tipo_item: 'todos',
    motivo: 'todos',
  });

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida' | 'ajuste' | 'producao',
    tipo_item: 'materia_prima' as 'materia_prima' | 'produto_revenda',
    item_id: '',
    quantidade_anterior: 0,
    quantidade_movimentada: 0,
    quantidade_atual: 0,
    unidade: 'kg',
    motivo: 'ajuste_inventario' as 'compra' | 'venda' | 'producao' | 'ajuste_inventario' | 'devolucao',
    documento_referencia: '',
    observacoes: '',
  });

  const getItemNome = (itemId: string, tipoItem: string) => {
    if (tipoItem === 'materia_prima') {
      const item = materiasPrimas.find(mp => mp.id === itemId);
      return item?.nome || 'Item não encontrado';
    } else {
      const item = produtos.find(p => p.id === itemId);
      return item?.nome || 'Item não encontrado';
    }
  };

  const filteredMovimentacoes = useMemo(() => {
    return applyFilters(movimentacoes, filters, getItemNome);
  }, [movimentacoes, filters, materiasPrimas, produtos]);

  const getItemUnidade = (itemId: string, tipoItem: string) => {
    if (tipoItem === 'materia_prima') {
      const item = materiasPrimas.find(mp => mp.id === itemId);
      return item?.unidade_estoque || 'kg';
    } else {
      const item = produtos.find(p => p.id === itemId);
      return item?.unidade_venda || 'unidade';
    }
  };

  const getItemEstoqueAtual = (itemId: string, tipoItem: string) => {
    if (tipoItem === 'materia_prima') {
      const item = materiasPrimas.find(mp => mp.id === itemId);
      return Number(item?.estoque_atual) || 0;
    } else {
      const item = produtos.find(p => p.id === itemId);
      return Number(item?.estoque_atual) || 0;
    }
  };

  useEffect(() => {
    if (formData.item_id) {
      const estoqueAnterior = getItemEstoqueAtual(formData.item_id, formData.tipo_item);
      let quantidadeAtual = 0;

      if (formData.tipo === 'entrada' || formData.tipo === 'ajuste') {
        quantidadeAtual = estoqueAnterior + Math.abs(formData.quantidade_movimentada);
      } else if (formData.tipo === 'saida' || formData.tipo === 'producao') {
        quantidadeAtual = Math.max(0, estoqueAnterior - Math.abs(formData.quantidade_movimentada));
      }

      setFormData(prev => ({
        ...prev,
        quantidade_anterior: estoqueAnterior,
        quantidade_atual: quantidadeAtual,
        unidade: getItemUnidade(formData.item_id, formData.tipo_item),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        quantidade_anterior: 0,
        quantidade_atual: 0,
      }));
    }
  }, [formData.item_id, formData.quantidade_movimentada, formData.tipo, materiasPrimas, produtos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.item_id) {
      toast.error('Selecione um item');
      return;
    }

    if (formData.quantidade_movimentada === 0) {
      toast.error('A quantidade movimentada deve ser diferente de zero');
      return;
    }

    const estoqueAnterior = getItemEstoqueAtual(formData.item_id, formData.tipo_item);
    let quantidadeAtual = 0;

    if (formData.tipo === 'entrada' || formData.tipo === 'ajuste') {
      quantidadeAtual = estoqueAnterior + Math.abs(formData.quantidade_movimentada);
    } else if (formData.tipo === 'saida' || formData.tipo === 'producao') {
      quantidadeAtual = Math.max(0, estoqueAnterior - Math.abs(formData.quantidade_movimentada));
    }

    const unidade = getItemUnidade(formData.item_id, formData.tipo_item);

    const movimentacao: Omit<MovimentacaoEstoque, 'id' | 'created_at'> = {
      tipo: formData.tipo,
      tipo_item: formData.tipo_item,
      item_id: formData.item_id,
      quantidade_anterior: estoqueAnterior,
      quantidade_movimentada: formData.tipo === 'saida' || formData.tipo === 'producao'
        ? -Math.abs(formData.quantidade_movimentada)
        : Math.abs(formData.quantidade_movimentada),
      quantidade_atual: quantidadeAtual,
      unidade,
      motivo: formData.motivo,
      documento_referencia: formData.documento_referencia || undefined,
      observacoes: formData.observacoes || undefined,
    };

    const { error: err } = await create(movimentacao);
    if (err) {
      toast.error('Erro ao criar movimentação: ' + err);
      return;
    }

    toast.success('Movimentação criada com sucesso!');
    refresh();
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      tipo_item: 'materia_prima',
      item_id: '',
      quantidade_anterior: 0,
      quantidade_movimentada: 0,
      quantidade_atual: 0,
      unidade: 'kg',
      motivo: 'ajuste_inventario',
      documento_referencia: '',
      observacoes: '',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'Entrada';
      case 'saida':
        return 'Saída';
      case 'ajuste':
        return 'Ajuste';
      case 'producao':
        return 'Produção';
      default:
        return tipo;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'success';
      case 'saida':
        return 'destructive';
      case 'ajuste':
        return 'warning';
      case 'producao':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTipoItemLabel = (tipo: string) => {
    switch (tipo) {
      case 'materia_prima':
        return 'Matéria-Prima';
      case 'produto_revenda':
        return 'Produto Revenda';
      default:
        return tipo;
    }
  };

  const getMotivoLabel = (motivo: string) => {
    switch (motivo) {
      case 'compra':
        return 'Compra';
      case 'venda':
        return 'Venda';
      case 'producao':
        return 'Produção';
      case 'ajuste_inventario':
        return 'Ajuste de Inventário';
      case 'devolucao':
        return 'Devolução';
      default:
        return motivo;
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar movimentações</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <Button onClick={() => refresh()} variant="outline" size="sm" className="mt-4">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const itensDisponiveis = formData.tipo_item === 'materia_prima'
    ? materiasPrimas.map(mp => ({ id: mp.id, nome: mp.nome, unidade: mp.unidade_estoque }))
    : produtos.filter(p => p.tipo === 'revenda').map(p => ({ id: p.id, nome: p.nome, unidade: p.unidade_venda }));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Movimentações de Estoque"
        description={movimentacoes.length > 0 ? `Histórico completo de movimentações. ${movimentacoes.length} ${movimentacoes.length === 1 ? 'movimentação registrada' : 'movimentações registradas'}` : 'Histórico completo de movimentações'}
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Movimentação
        </Button>
      </PageHeader>

      {/* Filters */}
      <MovimentacoesFilter
        filters={filters}
        onFiltersChange={setFilters}
        movimentacoes={movimentacoes}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tipo Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Qtd. Anterior</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Qtd. Movimentada</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Qtd. Atual</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Motivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Documento</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMovimentacoes.length === 0 && movimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12">
                    <EmptyState
                      icon={<Activity size={48} />}
                      title="Nenhuma movimentação registrada"
                      description="Clique em 'Nova Movimentação' para começar"
                      action={{ label: '+ Nova Movimentação', onClick: () => { resetForm(); setShowModal(true); } }}
                    />
                  </td>
                </tr>
              ) : filteredMovimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12">
                    <EmptyState
                      icon={<Activity size={48} />}
                      title="Nenhuma movimentação encontrada"
                      description="Nenhuma movimentação encontrada com os filtros selecionados"
                    />
                  </td>
                </tr>
              ) : (
                filteredMovimentacoes.map(mov => {
                  const itemNome = getItemNome(mov.item_id, mov.tipo_item);
                  return (
                    <tr key={mov.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(mov.created_at)}</td>
                      <td className="px-6 py-4">
                        <Badge variant={getTipoBadgeVariant(mov.tipo) as any}>
                          {getTipoLabel(mov.tipo)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{itemNome}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{getTipoItemLabel(mov.tipo_item)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{formatQuantity(mov.quantidade_anterior, mov.unidade)}</td>
                      <td className={`px-6 py-4 text-sm font-bold ${
                        mov.quantidade_movimentada > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {mov.quantidade_movimentada > 0 ? '+' : ''}{formatQuantity(mov.quantidade_movimentada, mov.unidade)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">{formatQuantity(mov.quantidade_atual, mov.unidade)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{getMotivoLabel(mov.motivo)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{mov.documento_referencia || '-'}</td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            confirmAction({
                              title: 'Excluir movimentação',
                              description: 'Esta ação não pode ser desfeita.',
                              confirmLabel: 'Confirmar Exclusão',
                              onConfirm: async () => {
                                const { error: err } = await deleteMov(mov.id);
                                if (err) {
                                  toast.error('Erro ao excluir movimentação: ' + err);
                                } else {
                                  toast.success('Movimentação excluída com sucesso!');
                                }
                              }
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <Dialog open={showModal} onOpenChange={() => { setShowModal(false); resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
              <DialogDescription>
                Registre uma nova movimentação de estoque
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_item">Tipo de Item *</Label>
                  <Select
                    value={formData.tipo_item}
                    onValueChange={(value) => setFormData({ ...formData, tipo_item: value as any, item_id: '', unidade: value === 'materia_prima' ? 'kg' : 'unidade' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="materia_prima">Matéria-Prima</SelectItem>
                      <SelectItem value="produto_revenda">Produto Revenda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_id">Item *</Label>
                <Select
                  value={formData.item_id}
                  onValueChange={(value) => {
                    const unidade = getItemUnidade(value, formData.tipo_item);
                    const estoqueAnterior = getItemEstoqueAtual(value, formData.tipo_item);
                    const quantidadeAtual = formData.tipo === 'entrada' || formData.tipo === 'ajuste'
                      ? estoqueAnterior + formData.quantidade_movimentada
                      : Math.max(0, estoqueAnterior - formData.quantidade_movimentada);
                    setFormData({
                      ...formData,
                      item_id: value,
                      unidade,
                      quantidade_anterior: estoqueAnterior,
                      quantidade_atual: quantidadeAtual,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um item" />
                  </SelectTrigger>
                  <SelectContent>
                    {itensDisponiveis.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome} (Estoque: {formatQuantity(getItemEstoqueAtual(item.id, formData.tipo_item), item.unidade)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade_anterior">Quantidade Anterior</Label>
                  <NumberInput
                    id="quantidade_anterior"
                    value={formData.quantidade_anterior}
                    onChange={() => {}}
                    allowDecimals={true}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidade_movimentada">Quantidade Movimentada *</Label>
                  <NumberInput
                    id="quantidade_movimentada"
                    value={formData.quantidade_movimentada}
                    onChange={(quantidadeMov) => {
                      const estoqueAnterior = formData.item_id ? getItemEstoqueAtual(formData.item_id, formData.tipo_item) : 0;
                      const quantidadeAtual = formData.tipo === 'entrada' || formData.tipo === 'ajuste'
                        ? estoqueAnterior + quantidadeMov
                        : Math.max(0, estoqueAnterior - quantidadeMov);
                      setFormData({
                        ...formData,
                        quantidade_movimentada: quantidadeMov,
                        quantidade_anterior: estoqueAnterior,
                        quantidade_atual: quantidadeAtual,
                      });
                    }}
                    allowDecimals={true}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidade_atual">Quantidade Atual</Label>
                  <NumberInput
                    id="quantidade_atual"
                    value={formData.quantidade_atual}
                    onChange={() => {}}
                    allowDecimals={true}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Input
                  id="unidade"
                  value={formData.unidade}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Select
                  value={formData.motivo}
                  onValueChange={(value) => setFormData({ ...formData, motivo: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                    <SelectItem value="ajuste_inventario">Ajuste de Inventário</SelectItem>
                    <SelectItem value="devolucao">Devolução</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documento_referencia">Documento de Referência</Label>
                <Input
                  id="documento_referencia"
                  value={formData.documento_referencia}
                  onChange={(e) => setFormData({ ...formData, documento_referencia: e.target.value })}
                  placeholder="Ex: Pedido #123, OP #456, NF #789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  placeholder="Observações adicionais..."
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
