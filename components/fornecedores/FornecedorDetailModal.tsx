import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, Trash2, Building2, User, MapPin, CreditCard, Mail, Phone, FileText, Calendar, DollarSign, Clock } from 'lucide-react';
import type { Fornecedor } from '@/lib/database.types';
import { formatBrazilianDateTimeLong } from '@/lib/date-utils';

interface FornecedorDetailModalProps {
  fornecedor: Fornecedor | null;
  open: boolean;
  onClose: () => void;
  onEdit: (fornecedor: Fornecedor) => void;
  onDelete: (id: string) => void;
}

export function FornecedorDetailModal({
  fornecedor,
  open,
  onClose,
  onEdit,
  onDelete
}: FornecedorDetailModalProps) {
  if (!fornecedor) return null;

  const handleEdit = () => {
    onEdit(fornecedor);
    onClose();
  };

  const handleDelete = () => {
    onDelete(fornecedor.id);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {fornecedor.tipo_pessoa === 'juridica' ? (
                <Building2 className="h-5 w-5 text-blue-600" />
              ) : (
                <User className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{fornecedor.razao_social}</DialogTitle>
              <DialogDescription>
                {fornecedor.nome_fantasia || 'Visualização do fornecedor'}
              </DialogDescription>
            </div>
            <div className="flex-shrink-0 mr-8">
              <Badge variant={fornecedor.ativo ? 'success' : 'destructive'}>
                {fornecedor.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Informações Básicas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  {fornecedor.tipo_pessoa === 'juridica' ? (
                    <Building2 className="h-4 w-4 text-blue-600" />
                  ) : (
                    <User className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Tipo de Pessoa</p>
                  <p className="font-medium text-sm">{fornecedor.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{fornecedor.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}</p>
                  <p className="font-medium text-sm font-mono">{fornecedor.cnpj_cpf || '-'}</p>
                </div>
              </div>

              {fornecedor.inscricao_estadual && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Inscrição Estadual</p>
                    <p className="font-medium text-sm">{fornecedor.inscricao_estadual}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          {(fornecedor.endereco_completo || fornecedor.cep || fornecedor.cidade || fornecedor.estado) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Endereço</span>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                {fornecedor.endereco_completo && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Logradouro</p>
                    <p className="font-medium text-sm">{fornecedor.endereco_completo}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {fornecedor.cep && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">CEP</p>
                      <p className="font-medium text-sm font-mono">{fornecedor.cep}</p>
                    </div>
                  )}
                  {fornecedor.cidade && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cidade</p>
                      <p className="font-medium text-sm">{fornecedor.cidade}</p>
                    </div>
                  )}
                  {fornecedor.estado && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Estado</p>
                      <p className="font-medium text-sm">{fornecedor.estado}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contato */}
          {(fornecedor.email || fornecedor.telefone || fornecedor.contato_principal) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Contato</span>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                {fornecedor.contato_principal && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Responsável</p>
                    <p className="font-medium text-sm">{fornecedor.contato_principal}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {fornecedor.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{fornecedor.email}</span>
                    </div>
                  )}
                  {fornecedor.telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{fornecedor.telefone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Condições Comerciais */}
          {(fornecedor.condicoes_pagamento || fornecedor.prazo_entrega) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Condições Comerciais</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fornecedor.condicoes_pagamento && (
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <Clock className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Condições de Pagamento</p>
                      <p className="font-medium text-sm">{fornecedor.condicoes_pagamento}</p>
                    </div>
                  </div>
                )}
                {fornecedor.prazo_entrega && (
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <Clock className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Prazo de Entrega</p>
                      <p className="font-medium text-sm">{fornecedor.prazo_entrega}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          {fornecedor.observacoes && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Observações</span>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{fornecedor.observacoes}</p>
              </div>
            </div>
          )}

          {/* Data de Cadastro */}
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Cadastrado em {formatBrazilianDateTimeLong(fornecedor.created_at)}
            </span>
          </div>
        </div>

        <Separator />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
          <Button type="button" onClick={handleEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
