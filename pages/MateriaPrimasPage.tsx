import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useMateriasPrimas } from '../hooks/useMateriasPrimas';
import type { MateriaPrima } from '../lib/database.types';
import { formatNumber, formatCurrency } from '../lib/format';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
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
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, RefreshCw, Edit, Trash2, AlertTriangle, Package, Save, X, Layers, DollarSign, MapPin, FileText, Calculator, Weight } from 'lucide-react';
import { MateriasPrimasFilter, applyFilters, type FilterState } from '@/components/materias-primas/MateriasPrimasFilter';
import { MateriaPrimaDetailModal } from '@/components/materias-primas/MateriaPrimaDetailModal';

export default function MateriaPrimasPage() {
  const { materiasPrimas, loading, error, create, update, delete: deleteMat, refresh } = useMateriasPrimas();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MateriaPrima | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMateriaPrima, setSelectedMateriaPrima] = useState<MateriaPrima | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tipo: 'todos',
    estoqueStatus: 'todos',
    status: 'todos',
  });

  const filteredMateriasPrimas = useMemo(() => {
    return applyFilters(materiasPrimas, filters);
  }, [materiasPrimas, filters]);

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'papel_kraft',
    gramatura: '',
    largura_mm: '',
    unidade_estoque: 'kg',
    estoque_atual: '',
    estoque_minimo: '',
    estoque_ponto_reposicao: '',
    custo_por_unidade: '',
    local_armazenamento: '',
  });

  // Calcular peso por metro automaticamente
  const pesoPorMetro = formData.gramatura && formData.largura_mm
    ? formatNumber((Number(formData.gramatura) * Number(formData.largura_mm)) / 1000, 1)
    : '-';

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'papel_kraft',
      gramatura: '',
      largura_mm: '',
      unidade_estoque: 'kg',
      estoque_atual: '',
      estoque_minimo: '',
      estoque_ponto_reposicao: '',
      custo_por_unidade: '',
      local_armazenamento: '',
    });
    setEditingItem(null);
  };

  const handleEdit = (item: MateriaPrima) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      tipo: item.tipo,
      gramatura: item.gramatura?.toString() || '',
      largura_mm: item.largura_mm?.toString() || '',
      unidade_estoque: item.unidade_estoque,
      estoque_atual: item.estoque_atual.toString(),
      estoque_minimo: item.estoque_minimo.toString(),
      estoque_ponto_reposicao: item.estoque_ponto_reposicao.toString(),
      custo_por_unidade: item.custo_por_unidade.toString(),
      local_armazenamento: item.local_armazenamento || '',
    });
    setShowModal(true);
  };

  // Handle row click - open detail modal
  const handleRowClick = (materiaPrima: MateriaPrima) => {
    setSelectedMateriaPrima(materiaPrima);
    setShowDetailModal(true);
  };

  // Handle edit from detail modal
  const handleEditFromDetail = (materiaPrima: MateriaPrima) => {
    handleEdit(materiaPrima);
  };

  const handleDelete = (id: string) => {
    confirmAction({
      title: 'Excluir matéria-prima',
      description: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Confirmar Exclusão',
      onConfirm: async () => {
        const { error: err } = await deleteMat(id);
        if (err) {
          toast.error('Erro ao excluir matéria-prima: ' + err);
        } else {
          toast.success('Matéria-prima excluída com sucesso!');
          setShowDetailModal(false);
          setSelectedMateriaPrima(null);
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const materiaPrimaData: any = {
      nome: formData.nome,
      tipo: formData.tipo,
      gramatura: formData.gramatura ? Number(formData.gramatura) : null,
      largura_mm: formData.largura_mm ? Number(formData.largura_mm) : null,
      unidade_estoque: formData.unidade_estoque,
      estoque_atual: Number(formData.estoque_atual),
      estoque_minimo: Number(formData.estoque_minimo),
      estoque_ponto_reposicao: Number(formData.estoque_ponto_reposicao),
      custo_por_unidade: Number(formData.custo_por_unidade),
      local_armazenamento: formData.local_armazenamento || null,
      ativo: true,
    };

    if (editingItem) {
      const { error: err } = await update(editingItem.id, materiaPrimaData);
      if (err) {
        toast.error('Erro ao atualizar matéria-prima: ' + err);
        return;
      }
      toast.success('Matéria-prima atualizada com sucesso!');
    } else {
      const { error: err } = await create(materiaPrimaData);
      if (err) {
        toast.error('Erro ao criar matéria-prima: ' + err);
        return;
      }
      toast.success('Matéria-prima criada com sucesso!');
    }

    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar matérias-primas</AlertTitle>
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

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Matérias-Primas"
        description={materiasPrimas.length > 0 ? `${materiasPrimas.length} ${materiasPrimas.length === 1 ? 'matéria-prima cadastrada' : 'matérias-primas cadastradas'}` : undefined}
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Matéria-Prima
        </Button>
      </PageHeader>

      {/* Filters */}
      <MateriasPrimasFilter
        filters={filters}
        onFiltersChange={setFilters}
        materiasPrimas={materiasPrimas}
      />

      {/* Table */}
      <Card>
        {filteredMateriasPrimas.length === 0 && materiasPrimas.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Package size={48} />}
              title="Nenhuma matéria-prima cadastrada"
              description="Clique em 'Nova Matéria-Prima' para começar"
              action={{ label: '+ Nova Matéria-Prima', onClick: () => { resetForm(); setShowModal(true); } }}
            />
          </div>
        ) : filteredMateriasPrimas.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Package size={48} />}
              title="Nenhuma matéria-prima encontrada"
              description="Nenhuma matéria-prima encontrada com os filtros selecionados"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Nome</TableHead>
                  <TableHead className="min-w-[120px]">Tipo</TableHead>
                  <TableHead className="text-right min-w-[100px]">Gramatura</TableHead>
                  <TableHead className="text-right min-w-[100px]">Largura</TableHead>
                  <TableHead className="text-right min-w-[120px]">Peso/Metro</TableHead>
                  <TableHead className="text-right min-w-[120px]">Estoque</TableHead>
                  <TableHead className="text-right min-w-[120px]">Custo/Unid.</TableHead>
                  <TableHead className="text-center min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMateriasPrimas.map((item) => {
                  const estoqueAtual = Number(item.estoque_atual) || 0;
                  const estoqueMinimo = Number(item.estoque_minimo) || 0;
                  const estoquePontoReposicao = Number(item.estoque_ponto_reposicao) || 0;

                  let estoqueVariant: 'destructive' | 'warning' | 'success' = 'success';
                  let estoqueLabel = 'Normal';
                  if (estoqueAtual <= estoquePontoReposicao) {
                    estoqueVariant = 'destructive';
                    estoqueLabel = 'Crítico';
                  } else if (estoqueAtual <= estoqueMinimo) {
                    estoqueVariant = 'warning';
                    estoqueLabel = 'Baixo';
                  }

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.tipo.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.gramatura ? `${item.gramatura} g/m²` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.largura_mm ? `${item.largura_mm} mm` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.peso_por_metro_g ? `${formatNumber(item.peso_por_metro_g, 1)} g/m` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.estoque_atual} {item.unidade_estoque}
                      </TableCell>
                      <TableCell className="text-right font-medium text-purple-600">
                        {formatCurrency(item.custo_por_unidade)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={estoqueVariant} className="text-xs">
                            {estoqueLabel}
                          </Badge>
                          <Badge variant={item.ativo ? 'success' : 'secondary'} className="text-xs">
                            {item.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Layers className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Matéria-Prima</DialogTitle>
                <DialogDescription>
                  Preencha os dados da matéria-prima abaixo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>Informações Básicas</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-medium">
                  Nome da Matéria-Prima <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Ex: Papel Kraft 200g"
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-sm font-medium">
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="papel_kraft">Papel Kraft</SelectItem>
                      <SelectItem value="cola">Cola</SelectItem>
                      <SelectItem value="tinta">Tinta</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidade_estoque" className="text-sm font-medium">
                    Unidade de Estoque <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.unidade_estoque}
                    onValueChange={(value) => setFormData({ ...formData, unidade_estoque: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Quilograma (kg)</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                      <SelectItem value="unidade">Unidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Especificações Técnicas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Weight className="h-4 w-4" />
                <span>Especificações Técnicas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gramatura" className="text-sm font-medium">Gramatura (g/m²)</Label>
                  <NumberInput
                    id="gramatura"
                    value={Number(formData.gramatura) || 0}
                    onChange={(value) => setFormData({ ...formData, gramatura: value.toString() })}
                    placeholder="Ex: 200"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="largura_mm" className="text-sm font-medium">Largura (mm)</Label>
                  <NumberInput
                    id="largura_mm"
                    value={Number(formData.largura_mm) || 0}
                    onChange={(value) => setFormData({ ...formData, largura_mm: value.toString() })}
                    placeholder="Ex: 1200"
                    className="h-10"
                  />
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Calculator className="h-4 w-4 text-blue-600" />
                <AlertDescription className="ml-6">
                  <strong className="text-blue-900">Peso por metro calculado:</strong> <span className="font-mono text-blue-700">{pesoPorMetro} g/m</span>
                  <div className="text-xs text-blue-600 mt-1">
                    Fórmula: (gramatura × largura) / 1000
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            <Separator />

            {/* Controle de Estoque */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>Controle de Estoque</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estoque_atual" className="text-sm font-medium">
                    Estoque Atual <span className="text-destructive">*</span>
                  </Label>
                  <NumberInput
                    id="estoque_atual"
                    value={Number(formData.estoque_atual) || 0}
                    onChange={(value) => setFormData({ ...formData, estoque_atual: value.toString() })}
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estoque_minimo" className="text-sm font-medium">
                    Estoque Mínimo <span className="text-destructive">*</span>
                  </Label>
                  <NumberInput
                    id="estoque_minimo"
                    value={Number(formData.estoque_minimo) || 0}
                    onChange={(value) => setFormData({ ...formData, estoque_minimo: value.toString() })}
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estoque_ponto_reposicao" className="text-sm font-medium">
                    Ponto Reposição <span className="text-destructive">*</span>
                  </Label>
                  <NumberInput
                    id="estoque_ponto_reposicao"
                    value={Number(formData.estoque_ponto_reposicao) || 0}
                    onChange={(value) => setFormData({ ...formData, estoque_ponto_reposicao: value.toString() })}
                    required
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Custo e Localização */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Custo e Localização</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custo_por_unidade" className="text-sm font-medium">
                    Custo por Unidade <span className="text-destructive">*</span>
                  </Label>
                  <CurrencyInput
                    id="custo_por_unidade"
                    value={Number(formData.custo_por_unidade) || 0}
                    onChange={(value) => setFormData({ ...formData, custo_por_unidade: value.toString() })}
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local_armazenamento" className="text-sm font-medium">Local de Armazenamento</Label>
                  <Input
                    id="local_armazenamento"
                    value={formData.local_armazenamento}
                    onChange={(e) => setFormData({ ...formData, local_armazenamento: e.target.value })}
                    placeholder="Ex: Depósito A - Prateleira 2"
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </form>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" onClick={handleSubmit} className="gap-2">
              <Save className="h-4 w-4" />
              {editingItem ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <MateriaPrimaDetailModal
        materiaPrima={selectedMateriaPrima}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMateriaPrima(null);
        }}
        onEdit={handleEditFromDetail}
        onDelete={handleDelete}
      />
    </div>
  );
}
