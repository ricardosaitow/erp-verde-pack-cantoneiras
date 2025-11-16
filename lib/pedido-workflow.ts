/**
 * WORKFLOW DE STATUS DE PEDIDOS
 *
 * Este módulo gerencia as transições válidas de status de pedidos,
 * garantindo que não haja retrocessos ou transições inválidas.
 */

export type PedidoStatus = 'pendente' | 'aprovado' | 'producao' | 'finalizado' | 'aguardando_despacho' | 'entregue' | 'cancelado' | 'recusado';
export type PedidoTipo = 'orcamento' | 'pedido_confirmado';

export interface StatusTransition {
  from: PedidoStatus;
  to: PedidoStatus;
  tipo: PedidoTipo;
  allowed: boolean;
  reason?: string;
}

/**
 * Matriz de transições permitidas por tipo de pedido
 */
const ORCAMENTO_TRANSITIONS: Record<PedidoStatus, PedidoStatus[]> = {
  'pendente': ['aprovado', 'recusado', 'cancelado'],
  'aprovado': [], // Converte automaticamente para pedido_confirmado
  'recusado': [], // Estado final
  'cancelado': [], // Estado final
  'producao': [], // Não aplicável a orçamentos
  'finalizado': [], // Não aplicável a orçamentos
  'entregue': [], // Não aplicável a orçamentos
};

const PEDIDO_TRANSITIONS: Record<PedidoStatus, PedidoStatus[]> = {
  'pendente': ['aprovado', 'cancelado'], // Caso raro (pedido criado direto como pendente)
  'aprovado': ['cancelado'], // "producao" só pode ser definido pelo módulo de Ordens de Produção
  'producao': ['finalizado'], // Não pode cancelar depois de iniciar produção
  'finalizado': ['aguardando_despacho'], // Produção concluída, aguardando despacho
  'aguardando_despacho': ['entregue'], // Despacho realizado via QR Code
  'entregue': [], // Estado final
  'cancelado': [], // Estado final
  'recusado': [], // Não aplicável a pedidos confirmados
};

/**
 * Valida se uma transição de status é permitida
 */
export function isTransitionAllowed(
  currentStatus: PedidoStatus,
  newStatus: PedidoStatus,
  tipo: PedidoTipo
): { allowed: boolean; reason?: string } {
  // Não permite mudar de/para o mesmo status
  if (currentStatus === newStatus) {
    return {
      allowed: false,
      reason: 'O status já está definido como este valor'
    };
  }

  const transitions = tipo === 'orcamento' ? ORCAMENTO_TRANSITIONS : PEDIDO_TRANSITIONS;
  const allowedTransitions = transitions[currentStatus] || [];

  if (!allowedTransitions.includes(newStatus)) {
    return {
      allowed: false,
      reason: getTransitionErrorMessage(currentStatus, newStatus, tipo)
    };
  }

  return { allowed: true };
}

/**
 * Retorna todas as transições permitidas a partir do status atual
 */
export function getAllowedTransitions(
  currentStatus: PedidoStatus,
  tipo: PedidoTipo
): PedidoStatus[] {
  const transitions = tipo === 'orcamento' ? ORCAMENTO_TRANSITIONS : PEDIDO_TRANSITIONS;
  return transitions[currentStatus] || [];
}

/**
 * Gera mensagem de erro específica para cada tipo de transição inválida
 */
function getTransitionErrorMessage(
  currentStatus: PedidoStatus,
  newStatus: PedidoStatus,
  tipo: PedidoTipo
): string {
  // Estados finais
  if (['entregue', 'cancelado', 'recusado'].includes(currentStatus)) {
    const statusLabel = getStatusLabel(currentStatus);
    return `Não é possível alterar o status de um pedido ${statusLabel}`;
  }

  // Tentar cancelar pedido em produção
  if (currentStatus === 'producao' && newStatus === 'cancelado') {
    return 'Não é possível cancelar um pedido que já está em produção';
  }

  // Tentar voltar para status anterior
  const statusOrder = tipo === 'orcamento'
    ? ['pendente', 'aprovado', 'recusado', 'cancelado']
    : ['pendente', 'aprovado', 'producao', 'finalizado', 'entregue', 'cancelado'];

  const currentIndex = statusOrder.indexOf(currentStatus);
  const newIndex = statusOrder.indexOf(newStatus);

  if (newIndex < currentIndex && newStatus !== 'cancelado') {
    return `Não é possível voltar de "${getStatusLabel(currentStatus)}" para "${getStatusLabel(newStatus)}"`;
  }

  // Mensagem genérica
  return `Transição de "${getStatusLabel(currentStatus)}" para "${getStatusLabel(newStatus)}" não é permitida`;
}

/**
 * Retorna o label do status em português
 */
function getStatusLabel(status: PedidoStatus): string {
  const labels: Record<PedidoStatus, string> = {
    'pendente': 'Pendente',
    'aprovado': 'Aprovado',
    'producao': 'Em Produção',
    'finalizado': 'Finalizado',
    'aguardando_despacho': 'Aguardando Despacho',
    'entregue': 'Entregue',
    'cancelado': 'Cancelado',
    'recusado': 'Recusado',
  };
  return labels[status] || status;
}

/**
 * Verifica se o status é um estado final (não pode mais ser alterado)
 */
export function isFinalStatus(status: PedidoStatus): boolean {
  return ['entregue', 'cancelado', 'recusado'].includes(status);
}

/**
 * Retorna a próxima etapa lógica do workflow
 */
export function getNextStatus(currentStatus: PedidoStatus, tipo: PedidoTipo): PedidoStatus | null {
  const allowed = getAllowedTransitions(currentStatus, tipo);

  // Se tiver cancelado como opção, ignora (não é a próxima etapa natural)
  const nextOptions = allowed.filter(s => s !== 'cancelado' && s !== 'recusado');

  return nextOptions.length > 0 ? nextOptions[0] : null;
}

/**
 * Valida se o pedido pode ser editado baseado no status atual
 */
export function canEditPedido(status: PedidoStatus, tipo: PedidoTipo): boolean {
  // Orçamentos podem ser editados enquanto pendentes
  if (tipo === 'orcamento') {
    return status === 'pendente';
  }

  // Pedidos podem ser editados apenas se aprovados (antes de iniciar produção)
  return status === 'aprovado';
}

/**
 * Valida se o pedido pode ser excluído baseado no status atual
 */
export function canDeletePedido(status: PedidoStatus, tipo: PedidoTipo): boolean {
  // Orçamentos podem ser excluídos se pendentes ou recusados
  if (tipo === 'orcamento') {
    return ['pendente', 'recusado'].includes(status);
  }

  // Pedidos não podem ser excluídos após aprovação (apenas cancelados)
  return false;
}
