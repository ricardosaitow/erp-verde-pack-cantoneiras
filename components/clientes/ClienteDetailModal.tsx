import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, Trash2, Building2, User, MapPin, CreditCard, Mail, Phone, FileText, Calendar, DollarSign, Clock } from 'lucide-react';
import type { Cliente, ClienteContato } from '@/lib/database.types';
import { formatBrazilianDateTimeLong } from '@/lib/date-utils';

interface ClienteDetailModalProps {
  cliente: Cliente | null;
  contatos: ClienteContato[];
  open: boolean;
  onClose: () => void;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
}

export function ClienteDetailModal({
  cliente,
  contatos,
  open,
  onClose,
  onEdit,
  onDelete
}: ClienteDetailModalProps) {
  if (!cliente) return null;

  const handleEdit = () => {
    onEdit(cliente);
    onClose();
  };

  const handleDelete = () => {
    // Não fecha o modal aqui - só depois da confirmação
    onDelete(cliente.id);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {cliente.tipo_pessoa === 'juridica' ? (
                <Building2 className="h-5 w-5 text-blue-600" />
              ) : (
                <User className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{cliente.razao_social}</DialogTitle>
              <DialogDescription>
                {cliente.nome_fantasia || 'Visualização do cliente'}
              </DialogDescription>
            </div>
            <div className="flex-shrink-0 mr-8">
              <Badge variant={cliente.ativo ? 'success' : 'destructive'}>
                {cliente.ativo ? 'Ativo' : 'Inativo'}
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
                  {cliente.tipo_pessoa === 'juridica' ? (
                    <Building2 className="h-4 w-4 text-blue-600" />
                  ) : (
                    <User className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Tipo de Pessoa</p>
                  <p className="font-medium text-sm">{cliente.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{cliente.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}</p>
                  <p className="font-medium text-sm font-mono">{cliente.cnpj_cpf || '-'}</p>
                </div>
              </div>

              {cliente.inscricao_estadual && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Inscrição Estadual</p>
                    <p className="font-medium text-sm">{cliente.inscricao_estadual}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          {(cliente.endereco_completo || cliente.cep || cliente.cidade || cliente.estado) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Endereço</span>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                {cliente.endereco_completo && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Logradouro</p>
                    <p className="font-medium text-sm">{cliente.endereco_completo}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {cliente.cep && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">CEP</p>
                      <p className="font-medium text-sm font-mono">{cliente.cep}</p>
                    </div>
                  )}
                  {cliente.cidade && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cidade</p>
                      <p className="font-medium text-sm">{cliente.cidade}</p>
                    </div>
                  )}
                  {cliente.estado && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Estado</p>
                      <p className="font-medium text-sm">{cliente.estado}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contatos */}
          {contatos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Contatos</span>
              </div>
              <div className="space-y-2">
                {contatos.map((contato, index) => (
                  <div key={index} className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-border transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md">
                          <User className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{contato.nome_responsavel}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {contato.tipo_contato.charAt(0).toUpperCase() + contato.tipo_contato.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contato.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{contato.email}</span>
                        </div>
                      )}
                      {contato.telefone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span>{contato.telefone}</span>
                        </div>
                      )}
                    </div>
                    {contato.observacoes && (
                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">{contato.observacoes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Condições Comerciais */}
          {(cliente.condicoes_pagamento || cliente.limite_credito) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Condições Comerciais</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cliente.condicoes_pagamento && (
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <Clock className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Condições de Pagamento</p>
                      <p className="font-medium text-sm">{cliente.condicoes_pagamento}</p>
                    </div>
                  </div>
                )}
                {cliente.limite_credito && (
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-background rounded-md">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Limite de Crédito</p>
                      <p className="font-medium text-sm text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.limite_credito)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          {cliente.observacoes && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Observações</span>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{cliente.observacoes}</p>
              </div>
            </div>
          )}

          {/* Data de Cadastro */}
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Cadastrado em {formatBrazilianDateTimeLong(cliente.created_at)}
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
