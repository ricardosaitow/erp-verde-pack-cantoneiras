/**
 * WORKFLOW DE STATUS DE ORDENS DE PRODUÇÃO
 *
 * Este módulo gerencia as transições válidas de status de ordens de produção,
 * garantindo que não haja retrocessos ou transições inválidas.
 */

export type OrdemProducaoStatus = 'aguardando' | 'em_producao' | 'parcial' | 'concluido' | 'cancelado';

export interface StatusTransition {
  from: OrdemProducaoStatus;
  to: OrdemProducaoStatus;
  allowed: boolean;
  reason?: string;
}

/**
 * Matriz de transições permitidas para ordens de produção
 *
 * Status 'parcial' representa uma OP com múltiplos itens onde:
 * - Alguns itens já foram finalizados
 * - Alguns itens ainda estão aguardando ou em produção
 */
const ORDEM_PRODUCAO_TRANSITIONS: Record<OrdemProducaoStatus, OrdemProducaoStatus[]> = {
  'aguardando': ['em_producao', 'cancelado'],
  'em_producao': ['parcial', 'concluido'], // Pode ir para parcial se tiver múltiplos itens
  'parcial': ['em_producao', 'concluido'], // Pode voltar para em_producao ao iniciar novo item
  'concluido': [], // Estado final
  'cancelado': [], // Estado final
};

/**
 * Valida se uma transição de status é permitida
 */
export function isTransitionAllowed(
  currentStatus: OrdemProducaoStatus,
  newStatus: OrdemProducaoStatus
): { allowed: boolean; reason?: string } {
  // Não permite mudar de/para o mesmo status
  if (currentStatus === newStatus) {
    return {
      allowed: false,
      reason: 'O status já está definido como este valor'
    };
  }

  const allowedTransitions = ORDEM_PRODUCAO_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(newStatus)) {
    return {
      allowed: false,
      reason: getTransitionErrorMessage(currentStatus, newStatus)
    };
  }

  return { allowed: true };
}

/**
 * Retorna todas as transições permitidas a partir do status atual
 */
export function getAllowedTransitions(
  currentStatus: OrdemProducaoStatus
): OrdemProducaoStatus[] {
  return ORDEM_PRODUCAO_TRANSITIONS[currentStatus] || [];
}

/**
 * Gera mensagem de erro específica para cada tipo de transição inválida
 */
function getTransitionErrorMessage(
  currentStatus: OrdemProducaoStatus,
  newStatus: OrdemProducaoStatus
): string {
  // Estados finais
  if (['concluido', 'cancelado'].includes(currentStatus)) {
    const statusLabel = getStatusLabel(currentStatus);
    return `Não é possível alterar o status de uma ordem ${statusLabel}`;
  }

  // Tentar cancelar ordem em produção
  if (currentStatus === 'em_producao' && newStatus === 'cancelado') {
    return 'Não é possível cancelar uma ordem que já está em produção';
  }

  // Tentar pular etapa (aguardando → concluido)
  if (currentStatus === 'aguardando' && newStatus === 'concluido') {
    return 'Não é possível concluir uma ordem sem iniciá-la. Inicie a produção primeiro.';
  }

  // Tentar voltar para status anterior
  const statusOrder = ['aguardando', 'em_producao', 'concluido', 'cancelado'];
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
function getStatusLabel(status: OrdemProducaoStatus): string {
  const labels: Record<OrdemProducaoStatus, string> = {
    'aguardando': 'Aguardando',
    'em_producao': 'Em Produção',
    'parcial': 'Parcial',
    'concluido': 'Concluído',
    'cancelado': 'Cancelado',
  };
  return labels[status] || status;
}

/**
 * Verifica se o status é um estado final (não pode mais ser alterado)
 */
export function isFinalStatus(status: OrdemProducaoStatus): boolean {
  return ['concluido', 'cancelado'].includes(status);
}

/**
 * Retorna a próxima etapa lógica do workflow
 */
export function getNextStatus(currentStatus: OrdemProducaoStatus): OrdemProducaoStatus | null {
  const allowed = getAllowedTransitions(currentStatus);

  // Se tiver cancelado como opção, ignora (não é a próxima etapa natural)
  const nextOptions = allowed.filter(s => s !== 'cancelado');

  return nextOptions.length > 0 ? nextOptions[0] : null;
}

/**
 * Valida se a ordem pode ser editada baseado no status atual
 */
export function canEditOrdem(status: OrdemProducaoStatus): boolean {
  // Ordens podem ser editadas se aguardando ou parcial
  return status === 'aguardando' || status === 'parcial';
}

/**
 * Valida se a ordem pode ser excluída baseado no status atual
 */
export function canDeleteOrdem(status: OrdemProducaoStatus): boolean {
  // Ordens só podem ser excluídas se aguardando ou canceladas
  return ['aguardando', 'cancelado'].includes(status);
}
