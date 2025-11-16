import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useCategorias } from '../hooks/useCategorias';
import type { Categoria } from '../lib/database.types';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, RefreshCw, Edit, Trash2, AlertTriangle, FolderOpen, Tag, Save, X } from 'lucide-react';
import { CategoriasFilter, applyFilters, type FilterState } from '@/components/categorias/CategoriasFilter';
import { CategoriaDetailModal } from '@/components/categorias/CategoriaDetailModal';

export default function CategoriasPage() {
  const { categorias, loading, error, create, update, delete: deleteCategoria, refresh } = useCategorias();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Categoria | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tipo: 'todos',
    status: 'todos',
  });

  const filteredCategorias = useMemo(() => {
    return applyFilters(categorias, filters);
  }, [categorias, filters]);

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'fabricado' as 'fabricado' | 'revenda',
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'fabricado',
      ativo: true,
    });
    setEditingItem(null);
  };

  const handleEdit = (categoria: Categoria) => {
    setEditingItem(categoria);
    setFormData({
      nome: categoria.nome,
      tipo: categoria.tipo as 'fabricado' | 'revenda',
      ativo: categoria.ativo ?? true,
    });
    setShowModal(true);
  };

  // Handle row click - open detail modal
  const handleRowClick = (categoria: Categoria) => {
    setSelectedCategoria(categoria);
    setShowDetailModal(true);
  };

  // Handle edit from detail modal
  const handleEditFromDetail = (categoria: Categoria) => {
    handleEdit(categoria);
  };

  const handleDelete = (id: string) => {
    confirmAction({
      title: 'Excluir categoria',
      description: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Confirmar Exclusão',
      onConfirm: async () => {
        const { error: err } = await deleteCategoria(id);
        if (err) {
          toast.error('Erro ao excluir categoria: ' + err);
        } else {
          toast.success('Categoria excluída com sucesso!');
          setShowDetailModal(false);
          setSelectedCategoria(null);
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoriaData = { ...formData };

    if (editingItem) {
      const { error: err } = await update(editingItem.id, categoriaData);
      if (err) {
        toast.error('Erro ao atualizar categoria: ' + err);
        return;
      }
      toast.success('Categoria atualizada com sucesso!');
    } else {
      const { error: err } = await create(categoriaData);
      if (err) {
        toast.error('Erro ao criar categoria: ' + err);
        return;
      }
      toast.success('Categoria criada com sucesso!');
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
          <AlertTitle>Erro ao carregar categorias</AlertTitle>
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
        title="Categorias de Produtos"
        description={categorias.length > 0 ? `${categorias.length} ${categorias.length === 1 ? 'categoria cadastrada' : 'categorias cadastradas'}` : undefined}
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </PageHeader>

      {/* Filters */}
      <CategoriasFilter
        filters={filters}
        onFiltersChange={setFilters}
        categorias={categorias}
      />

      {/* Table */}
      <Card>
        {filteredCategorias.length === 0 && categorias.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<FolderOpen size={48} />}
              title="Nenhuma categoria cadastrada"
              description="Clique em 'Nova Categoria' para começar"
              action={{ label: '+ Nova Categoria', onClick: () => { resetForm(); setShowModal(true); } }}
            />
          </div>
        ) : filteredCategorias.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<FolderOpen size={48} />}
              title="Nenhuma categoria encontrada"
              description="Nenhuma categoria encontrada com os filtros selecionados"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Nome</TableHead>
                  <TableHead className="min-w-[150px]">Tipo</TableHead>
                  <TableHead className="text-center min-w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.map((categoria) => (
                  <TableRow
                    key={categoria.id}
                    onClick={() => handleRowClick(categoria)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{categoria.nome}</TableCell>
                    <TableCell>
                      <Badge variant={categoria.tipo === 'fabricado' ? 'default' : 'secondary'} className={
                        categoria.tipo === 'fabricado' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-sky-100 text-sky-800 hover:bg-sky-100'
                      }>
                        {categoria.tipo === 'fabricado' ? 'Fabricado' : 'Revenda'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={categoria.ativo ? 'success' : 'secondary'}>
                        {categoria.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Tag className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Categoria</DialogTitle>
                <DialogDescription>
                  Categorias ajudam a organizar seus produtos
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-medium">
                  Nome da Categoria <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Ex: Cantoneiras, Embalagens..."
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo" className="text-sm font-medium">
                  Tipo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as 'fabricado' | 'revenda' })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fabricado">Fabricado</SelectItem>
                    <SelectItem value="revenda">Revenda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked as boolean })}
                />
                <Label htmlFor="ativo" className="cursor-pointer text-sm font-medium">
                  Categoria Ativa
                </Label>
              </div>
            </div>

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
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                {editingItem ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <CategoriaDetailModal
        categoria={selectedCategoria}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCategoria(null);
        }}
        onEdit={handleEditFromDetail}
        onDelete={handleDelete}
      />
    </div>
  );
}
