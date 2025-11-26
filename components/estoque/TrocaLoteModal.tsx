import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { AlertaMudancaLote } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface TrocaLoteModalProps {
  open: boolean;
  onClose: () => void;
  alertas: AlertaMudancaLote[];
  onComplete: () => void;
}

export function TrocaLoteModal({
  open,
  onClose,
  alertas,
  onComplete,
}: TrocaLoteModalProps) {
  const [alertaAtual, setAlertaAtual] = useState(0);
  const [custoPersonalizado, setCustoPersonalizado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  if (!alertas || alertas.length === 0) return null;

  const alerta = alertas[alertaAtual];
  const isUltimo = alertaAtual === alertas.length - 1;
  const diferencaPositiva = alerta.diferenca_percentual > 0;

  const handleAtualizarCusto = async (novoCusto: number) => {
    setLoading(true);
    try {
      // Buscar custo atual para histórico
      const { data: mp } = await supabase
        .from('materias_primas')
        .select('custo_por_unidade, historico_custos')
        .eq('id', alerta.materia_prima_id)
        .single();

      const historico = mp?.historico_custos || [];
      historico.push({
        data: new Date().toISOString(),
        custo_anterior: alerta.custo_administrativo_atual,
        custo_novo: novoCusto,
        motivo: 'Troca de lote (PEPS)',
      });

      // Atualizar custo
      await supabase
        .from('materias_primas')
        .update({
          custo_por_unidade: novoCusto,
          historico_custos: historico,
        })
        .eq('id', alerta.materia_prima_id);

      toast.success(`Custo de ${alerta.materia_prima_nome} atualizado para ${formatCurrency(novoCusto)}/kg`);

      avancar();
    } catch (err) {
      toast.error('Erro ao atualizar custo');
    } finally {
      setLoading(false);
    }
  };

  const handleManterCusto = () => {
    toast.info(`Custo de ${alerta.materia_prima_nome} mantido em ${formatCurrency(alerta.custo_administrativo_atual)}/kg`);
    avancar();
  };

  const avancar = () => {
    if (isUltimo) {
      onComplete();
      onClose();
    } else {
      setAlertaAtual(prev => prev + 1);
      setCustoPersonalizado(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>Troca de Lote Detectada</DialogTitle>
              <DialogDescription>
                {alertas.length > 1 && `${alertaAtual + 1} de ${alertas.length} materiais`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Material */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <p className="font-semibold text-lg text-amber-900">{alerta.materia_prima_nome}</p>
              <p className="text-sm text-amber-700 mt-1">
                O lote anterior esgotou. O próximo lote tem custo diferente.
              </p>
            </CardContent>
          </Card>

          {/* Comparação de custos */}
          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Custo Atual</p>
              <p className="font-mono font-bold text-lg">{formatCurrency(alerta.custo_administrativo_atual)}</p>
              <p className="text-xs text-muted-foreground">/kg</p>
            </div>

            <div className="flex flex-col items-center">
              <ArrowRight className={`h-6 w-6 ${diferencaPositiva ? 'text-red-500' : 'text-green-500'}`} />
              <span className={`text-xs font-semibold ${diferencaPositiva ? 'text-red-600' : 'text-green-600'}`}>
                {diferencaPositiva ? '+' : ''}{formatNumber(alerta.diferenca_percentual, 1)}%
              </span>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">Custo Novo Lote</p>
              <p className={`font-mono font-bold text-lg ${diferencaPositiva ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(alerta.lote_novo_custo)}
              </p>
              <p className="text-xs text-muted-foreground">/kg</p>
            </div>
          </div>

          <Separator />

          {/* Opções */}
          <div className="space-y-3">
            <p className="text-sm font-medium">O que deseja fazer?</p>

            <Button
              variant="default"
              className="w-full justify-start gap-3"
              onClick={() => handleAtualizarCusto(alerta.lote_novo_custo)}
              disabled={loading}
            >
              <Check className="h-4 w-4" />
              Atualizar para {formatCurrency(alerta.lote_novo_custo)}/kg
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleManterCusto}
              disabled={loading}
            >
              Manter {formatCurrency(alerta.custo_administrativo_atual)}/kg
            </Button>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Valor personalizado</Label>
                <CurrencyInput
                  value={custoPersonalizado || 0}
                  onChange={setCustoPersonalizado}
                  className="h-9"
                />
              </div>
              <Button
                variant="secondary"
                className="self-end"
                onClick={() => custoPersonalizado && handleAtualizarCusto(custoPersonalizado)}
                disabled={loading || !custoPersonalizado}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
