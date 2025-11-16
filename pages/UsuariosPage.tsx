import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useUsuarios } from '../hooks/useUsuarios';
import type { Usuario } from '../hooks/useUsuarios';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, RefreshCw, Edit, Trash2, AlertTriangle, Users as UsersIcon, Save, X, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
import { formatBrazilianDateTimeLong } from '@/lib/date-utils';

export default function UsuariosPage() {
  const { usuarios, loading, error, create, update, delete: deleteUsuario, refresh } = useUsuarios();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    role: 'user',
  });

  const filteredUsuarios = useMemo(() => {
    if (!searchTerm) return usuarios;
    const searchLower = searchTerm.toLowerCase();
    return usuarios.filter(
      (usuario) =>
        usuario.email?.toLowerCase().includes(searchLower) ||
        usuario.user_metadata?.nome?.toLowerCase().includes(searchLower)
    );
  }, [usuarios, searchTerm]);

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      nome: '',
      role: 'user',
    });
    setEditingItem(null);
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingItem(usuario);
    setFormData({
      email: usuario.email,
      password: '', // Never show password
      nome: usuario.user_metadata?.nome || '',
      role: usuario.user_metadata?.role || 'user',
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    confirmAction({
      title: 'Excluir usuário',
      description: 'Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.',
      confirmLabel: 'Confirmar Exclusão',
      onConfirm: async () => {
        const { error: err } = await deleteUsuario(id);
        if (err) {
          toast.error('Erro ao excluir usuário: ' + err);
        } else {
          toast.success('Usuário excluído com sucesso!');
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem) {
      // Update user
      const updates: any = {
        user_metadata: {
          nome: formData.nome,
          role: formData.role,
        },
      };

      // Only update email if changed
      if (formData.email !== editingItem.email) {
        updates.email = formData.email;
      }

      // Only update password if provided
      if (formData.password) {
        updates.password = formData.password;
      }

      const { error: err } = await update(editingItem.id, updates);
      if (err) {
        toast.error('Erro ao atualizar usuário: ' + err);
        return;
      }
      toast.success('Usuário atualizado com sucesso!');
    } else {
      // Create new user
      if (!formData.password) {
        toast.error('Senha é obrigatória para novos usuários');
        return;
      }

      const { error: err } = await create(formData.email, formData.password, {
        nome: formData.nome,
        role: formData.role,
      });

      if (err) {
        toast.error('Erro ao criar usuário: ' + err);
        return;
      }
      toast.success('Usuário criado com sucesso!');
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
          <AlertTitle>Erro ao carregar usuários</AlertTitle>
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
        title="Gerenciamento de Usuários"
        description={usuarios.length > 0 ? `${usuarios.length} ${usuarios.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}` : undefined}
      >
        <Button onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </PageHeader>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por email ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filteredUsuarios.length === 0 && usuarios.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<UsersIcon size={48} />}
              title="Nenhum usuário cadastrado"
              description="Clique em 'Novo Usuário' para começar"
              action={{
                label: '+ Novo Usuário',
                onClick: () => {
                  resetForm();
                  setShowModal(true);
                },
              }}
            />
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<UsersIcon size={48} />}
              title="Nenhum usuário encontrado"
              description="Nenhum usuário encontrado com o termo de busca"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Email</TableHead>
                  <TableHead className="min-w-[200px]">Nome</TableHead>
                  <TableHead className="min-w-[120px]">Role</TableHead>
                  <TableHead className="min-w-[180px]">Criado em</TableHead>
                  <TableHead className="min-w-[180px]">Último login</TableHead>
                  <TableHead className="text-center min-w-[120px]">Status</TableHead>
                  <TableHead className="text-right min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.email}</TableCell>
                    <TableCell>{usuario.user_metadata?.nome || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        usuario.user_metadata?.role === 'admin' ? 'default' :
                        usuario.user_metadata?.role === 'producao' ? 'outline' :
                        'secondary'
                      }>
                        {usuario.user_metadata?.role === 'admin' ? 'Admin' :
                         usuario.user_metadata?.role === 'producao' ? 'Produção' :
                         'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatBrazilianDateTimeLong(usuario.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {usuario.last_sign_in_at ? formatBrazilianDateTimeLong(usuario.last_sign_in_at) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={usuario.email_confirmed_at ? 'success' : 'secondary'}>
                        {usuario.email_confirmed_at ? 'Confirmado' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(usuario)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(usuario.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <UserPlus className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Usuário</DialogTitle>
                <DialogDescription>
                  {editingItem
                    ? 'Atualize as informações do usuário'
                    : 'Cadastre um novo usuário no sistema'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="usuario@exemplo.com"
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-medium">
                  Nome
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="nome"
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do usuário"
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha {!editingItem && <span className="text-destructive">*</span>}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingItem}
                    placeholder={editingItem ? 'Deixe em branco para não alterar' : '••••••••'}
                    className="pl-10 h-10"
                  />
                </div>
                {editingItem && (
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para manter a senha atual
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  Nível de Acesso <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
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
                {editingItem ? 'Atualizar' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
