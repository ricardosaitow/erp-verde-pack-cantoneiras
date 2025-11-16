import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Categoria } from '@/lib/database.types';
import { formatBrazilianDateTimeLong } from '@/lib/date-utils';

interface CategoriaDetailModalProps {
  categoria: Categoria | null;
  open: boolean;
  onClose: () => void;
  onEdit: (categoria: Categoria) => void;
  onDelete: (id: string) => void;
}

export function CategoriaDetailModal({
  categoria,
  open,
  onClose,
  onEdit,
  onDelete,
}: CategoriaDetailModalProps) {
  if (!categoria) return null;

  const handleEdit = () => {
    onEdit(categoria);
    onClose();
  };

  const handleDelete = () => {
    onDelete(categoria.id);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">
                {categoria.nome}
              </DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant={categoria.ativo ? 'success' : 'secondary'}>
                  {categoria.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
                <Badge variant={categoria.tipo === 'fabricado' ? 'default' : 'secondary'} className={
                  categoria.tipo === 'fabricado' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-sky-100 text-sky-800 hover:bg-sky-100'
                }>
                  {categoria.tipo === 'fabricado' ? 'Fabricado' : 'Revenda'}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações da Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium text-lg">{categoria.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium">
                      {categoria.tipo === 'fabricado' ? 'Fabricado' : 'Revenda'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={categoria.ativo ? 'success' : 'destructive'}>
                      {categoria.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="text-sm">{formatBrazilianDateTimeLong(categoria.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última atualização</p>
                    <p className="text-sm">{formatBrazilianDateTimeLong(categoria.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex flex-row justify-between items-center gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-initial"
          >
            Fechar
          </Button>
          <div className="flex gap-2 flex-1 sm:flex-initial">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1 sm:flex-initial"
            >
              Excluir
            </Button>
            <Button
              onClick={handleEdit}
              className="flex-1 sm:flex-initial"
            >
              Editar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
