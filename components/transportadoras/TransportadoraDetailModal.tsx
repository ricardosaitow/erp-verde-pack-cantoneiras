import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Edit, Truck, Mail, Phone, MapPin, FileText, Building2, XCircle, CheckCircle2 } from 'lucide-react';
import { formatTelefone, formatCpfCnpj } from '@/lib/format';
import type { Transportadora } from '@/hooks/useTransportadoras';

interface TransportadoraDetailModalProps {
  transportadora: Transportadora | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (transportadora: Transportadora) => void;
  onToggleActive?: (id: string) => void;
}

export function TransportadoraDetailModal({
  transportadora,
  open,
  onClose,
  onEdit,
  onToggleActive,
}: TransportadoraDetailModalProps) {
  if (!transportadora) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Truck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">{transportadora.name}</DialogTitle>
                <DialogDescription className="mt-1">
                  Informações detalhadas da transportadora
                </DialogDescription>
              </div>
            </div>
            <Badge variant={transportadora.deleted ? 'destructive' : 'success'} className="ml-4">
              {transportadora.deleted ? (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Inativo
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ativo
                </>
              )}
            </Badge>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Informações Básicas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="text-sm font-medium">{transportadora.name}</p>
              </div>

              {transportadora.cpfCnpj && (
                <div>
                  <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                  <p className="text-sm font-medium font-mono">{formatCpfCnpj(transportadora.cpfCnpj)}</p>
                </div>
              )}

              {transportadora.externalReference && (
                <div>
                  <p className="text-sm text-muted-foreground">Referência Externa</p>
                  <p className="text-sm font-medium font-mono">{transportadora.externalReference}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">ID Base ERP</p>
                <p className="text-sm font-medium font-mono">{transportadora.id}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>Contato</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
              {transportadora.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${transportadora.email}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {transportadora.email}
                    </a>
                  </div>
                </div>
              )}

              {transportadora.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <a
                      href={`tel:${transportadora.phone}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {formatTelefone(transportadora.phone)}
                    </a>
                  </div>
                </div>
              )}

              {transportadora.mobilePhone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Celular</p>
                    <a
                      href={`tel:${transportadora.mobilePhone}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {formatTelefone(transportadora.mobilePhone)}
                    </a>
                  </div>
                </div>
              )}

              {!transportadora.email && !transportadora.phone && !transportadora.mobilePhone && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground italic">Nenhum contato cadastrado</p>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          {transportadora.address && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Endereço</span>
                </div>

                <div className="grid grid-cols-1 gap-4 pl-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço Completo</p>
                    <p className="text-sm font-medium">
                      {[
                        transportadora.address.address,
                        transportadora.address.addressNumber,
                        transportadora.address.complement,
                      ].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {transportadora.address.province && (
                      <div>
                        <p className="text-sm text-muted-foreground">Bairro</p>
                        <p className="text-sm font-medium">{transportadora.address.province}</p>
                      </div>
                    )}

                    {transportadora.address.cityName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Cidade</p>
                        <p className="text-sm font-medium">{transportadora.address.cityName}</p>
                      </div>
                    )}

                    {transportadora.address.stateAbbrev && (
                      <div>
                        <p className="text-sm text-muted-foreground">Estado</p>
                        <p className="text-sm font-medium">{transportadora.address.stateAbbrev}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {transportadora.address.postalCode && (
                      <div>
                        <p className="text-sm text-muted-foreground">CEP</p>
                        <p className="text-sm font-medium font-mono">{transportadora.address.postalCode}</p>
                      </div>
                    )}

                    {transportadora.address.country && (
                      <div>
                        <p className="text-sm text-muted-foreground">País</p>
                        <p className="text-sm font-medium">{transportadora.address.country}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Observações */}
          {transportadora.observations && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Observações</span>
                </div>

                <div className="pl-6">
                  <p className="text-sm whitespace-pre-wrap">{transportadora.observations}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Ações */}
        <div className="flex justify-end gap-2">
          {onToggleActive && (
            <Button
              variant={transportadora.deleted ? 'default' : 'destructive'}
              onClick={() => onToggleActive(transportadora.id)}
              className="gap-2"
            >
              {transportadora.deleted ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Reativar
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Inativar
                </>
              )}
            </Button>
          )}
          {onEdit && (
            <Button onClick={() => onEdit(transportadora)} className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
