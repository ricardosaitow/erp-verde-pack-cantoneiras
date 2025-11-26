import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Receipt, Calendar, DollarSign, CreditCard, FileText, Link as LinkIcon, ExternalLink, User, Mail, Phone } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface CobrancaDetailModalProps {
  cobranca: any;
  open: boolean;
  onClose: () => void;
}

export function CobrancaDetailModal({
  cobranca,
  open,
  onClose,
}: CobrancaDetailModalProps) {
  if (!cobranca) return null;

  const getStatusBadge = (status: string) => {
    const variants = {
      'RECEIVED': { variant: 'success' as const, label: 'Recebido' },
      'PENDING': { variant: 'default' as const, label: 'Pendente' },
      'OVERDUE': { variant: 'destructive' as const, label: 'Vencido' },
      'CONFIRMED': { variant: 'default' as const, label: 'Confirmado' },
      'REFUNDED': { variant: 'secondary' as const, label: 'Estornado' },
      'CANCELLED': { variant: 'secondary' as const, label: 'Cancelado' },
    };

    const config = variants[status as keyof typeof variants] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getBillingTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'BOLETO': 'Boleto Bancário',
      'CREDIT_CARD': 'Cartão de Crédito',
      'PIX': 'PIX',
      'DEBIT_CARD': 'Cartão de Débito',
      'UNDEFINED': 'Cliente escolhe',
    };
    return types[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{cobranca.description || 'Cobrança'}</DialogTitle>
              <DialogDescription>
                ID: {cobranca.id}
              </DialogDescription>
            </div>
            <div className="flex-shrink-0 mr-8">
              {getStatusBadge(cobranca.status)}
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Informações Principais */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Informações Financeiras</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="p-2 bg-background rounded-md">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Valor da Cobrança</p>
                  <p className="font-medium text-lg text-green-600">{formatCurrency(cobranca.value)}</p>
                </div>
              </div>

              {cobranca.netValue && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Valor Líquido</p>
                    <p className="font-medium text-lg text-blue-600">{formatCurrency(cobranca.netValue)}</p>
                  </div>
                </div>
              )}

              {cobranca.discount && cobranca.discount > 0 && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Desconto</p>
                    <p className="font-medium text-sm text-orange-600">{formatCurrency(cobranca.discount)}</p>
                  </div>
                </div>
              )}

              {cobranca.interest && cobranca.interest > 0 && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-background rounded-md">
                    <DollarSign className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Juros</p>
                    <p className="font-medium text-sm text-red-600">{formatCurrency(cobranca.interest)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Datas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Datas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Vencimento</p>
                <p className="font-medium text-sm">{new Date(cobranca.dueDate).toLocaleDateString('pt-BR')}</p>
              </div>

              {cobranca.paymentDate && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Data de Pagamento</p>
                  <p className="font-medium text-sm text-green-700">
                    {new Date(cobranca.paymentDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {cobranca.confirmedDate && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Data de Confirmação</p>
                  <p className="font-medium text-sm text-blue-700">
                    {new Date(cobranca.confirmedDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {cobranca.creditDate && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Previsão de Crédito</p>
                  <p className="font-medium text-sm">
                    {new Date(cobranca.creditDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Forma de Pagamento</span>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{getBillingTypeLabel(cobranca.billingType)}</Badge>
              </div>
              {cobranca.invoiceUrl && (
                <a
                  href={cobranca.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline mt-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visualizar fatura no Asaas
                </a>
              )}
              {cobranca.bankSlipUrl && (
                <a
                  href={cobranca.bankSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline mt-2 ml-4"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visualizar boleto
                </a>
              )}
            </div>
          </div>

          {/* Observações */}
          {cobranca.description && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Descrição</span>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{cobranca.description}</p>
              </div>
            </div>
          )}

          {/* Informações Adicionais */}
          {(cobranca.externalReference || cobranca.installment || cobranca.subscription) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <LinkIcon className="h-4 w-4" />
                <span>Informações Adicionais</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {cobranca.externalReference && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Referência Externa</p>
                    <p className="font-medium text-sm font-mono">{cobranca.externalReference}</p>
                  </div>
                )}
                {cobranca.installment && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Parcelamento</p>
                    <p className="font-medium text-sm">ID: {cobranca.installment}</p>
                  </div>
                )}
                {cobranca.subscription && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Assinatura</p>
                    <p className="font-medium text-sm">ID: {cobranca.subscription}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
