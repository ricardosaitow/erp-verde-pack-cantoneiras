import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PedidoStatus = 'pendente' | 'aprovado' | 'producao' | 'aguardando_despacho' | 'finalizado' | 'entregue' | 'cancelado' | 'recusado';
type OPStatus = 'aguardando' | 'em_producao' | 'parcial' | 'concluido' | 'cancelado';

interface StatusBadgeProps {
  status: PedidoStatus | OPStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Status de Pedidos
  pendente: { label: 'Pendente', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  aprovado: { label: 'Aprovado', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  producao: { label: 'Em Produção', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  aguardando_despacho: { label: 'Aguardando Despacho', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
  finalizado: { label: 'Finalizado', className: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100' },
  entregue: { label: 'Entregue', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  recusado: { label: 'Recusado', className: 'bg-red-100 text-red-800 hover:bg-red-100' },

  // Status de Ordens de Produção
  aguardando: { label: 'Aguardando', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  em_producao: { label: 'Em Produção', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  parcial: { label: 'Parcial', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
  concluido: { label: 'Concluído', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <Badge className={cn(config.className, className)} variant="outline">
      {config.label}
    </Badge>
  );
}
