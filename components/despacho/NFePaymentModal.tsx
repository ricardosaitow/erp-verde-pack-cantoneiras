import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/erp';
import { baseClient } from '@/lib/base';
import { formatCurrency } from '@/lib/format';
import type { PedidoCompleto } from '@/lib/database.types';

interface BaseBank {
  id: number;
  name: string;
  code: string | null;
}

export interface NFePaymentData {
  dueDate: string;
  value: number;
  billingType: string;
  bankId: number;
}

interface NFePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: NFePaymentData) => void;
  pedido: PedidoCompleto | null;
  loading?: boolean;
}

const BILLING_TYPES = [
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'TRANSFER', label: 'Transferência' },
  { value: 'DEPOSIT', label: 'Depósito' },
  { value: 'CASH', label: 'Dinheiro' },
];

export function NFePaymentModal({
  isOpen,
  onClose,
  onConfirm,
  pedido,
  loading = false,
}: NFePaymentModalProps) {
  const [banks, setBanks] = useState<BaseBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Calcular data de vencimento padrão (30 dias)
  const defaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const [paymentData, setPaymentData] = useState<NFePaymentData>({
    dueDate: defaultDueDate(),
    value: 0,
    billingType: 'BOLETO',
    bankId: 0,
  });

  // Carregar bancos ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadBanks();
      // Atualizar valor com o total do pedido
      if (pedido) {
        setPaymentData(prev => ({
          ...prev,
          value: Number(pedido.valor_total) || 0,
          dueDate: defaultDueDate(),
        }));
      }
    }
  }, [isOpen, pedido]);

  const loadBanks = async () => {
    setLoadingBanks(true);
    try {
      const response = await baseClient.listBanks();
      // A API retorna os bancos dentro de 'content' (paginado)
      const banksData = (response.data as any)?.content || response.data || [];
      const banksList = Array.isArray(banksData) ? banksData : [];

      setBanks(banksList as BaseBank[]);

      // Selecionar primeiro banco como padrão
      if (banksList.length > 0) {
        setPaymentData(prev => ({
          ...prev,
          bankId: banksList[0].id,
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    } finally {
      setLoadingBanks(false);
    }
  };

  const handleConfirm = () => {
    if (!paymentData.bankId) {
      alert('Selecione um banco');
      return;
    }
    if (!paymentData.dueDate) {
      alert('Informe a data de vencimento');
      return;
    }
    onConfirm(paymentData);
  };

  if (!pedido) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerar NF-e - Dados de Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info do Pedido */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <p className="text-sm">
              <strong>Pedido:</strong> {pedido.numero_pedido}
            </p>
            <p className="text-sm">
              <strong>Cliente:</strong> {pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social}
            </p>
            <p className="text-sm">
              <strong>Valor Total:</strong> {formatCurrency(Number(pedido.valor_total) || 0)}
            </p>
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="billingType">Forma de Pagamento</Label>
            <Select
              value={paymentData.billingType}
              onValueChange={(value) => setPaymentData(prev => ({ ...prev, billingType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {BILLING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Banco */}
          <div className="space-y-2">
            <Label htmlFor="bankId">Banco</Label>
            {loadingBanks ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoadingSpinner size="sm" />
                Carregando bancos...
              </div>
            ) : (
              <Select
                value={paymentData.bankId ? String(paymentData.bankId) : ''}
                onValueChange={(value) => setPaymentData(prev => ({ ...prev, bankId: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco..." />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={String(bank.id)}>
                      {bank.name} {bank.code ? `(${bank.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Data de Vencimento</Label>
            <Input
              id="dueDate"
              type="date"
              value={paymentData.dueDate}
              onChange={(e) => setPaymentData(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor do Pagamento</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              value={paymentData.value}
              onChange={(e) => setPaymentData(prev => ({ ...prev, value: Number(e.target.value) }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || loadingBanks}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Gerando NF-e...
              </>
            ) : (
              'Confirmar e Gerar NF-e'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
