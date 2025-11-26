// ============================================
// TIPOS WEBHOOKS
// ============================================
// Tipos para sistema de webhooks flexível
// ============================================

export enum WebhookEventType {
  // Pedidos
  PEDIDO_CRIADO = 'pedido.criado',
  PEDIDO_ATUALIZADO = 'pedido.atualizado',
  PEDIDO_CANCELADO = 'pedido.cancelado',
  PEDIDO_FINALIZADO = 'pedido.finalizado',

  // Pagamentos
  PAGAMENTO_CRIADO = 'pagamento.criado',
  PAGAMENTO_CONFIRMADO = 'pagamento.confirmado',
  PAGAMENTO_RECEBIDO = 'pagamento.recebido',
  PAGAMENTO_VENCIDO = 'pagamento.vencido',
  PAGAMENTO_ESTORNADO = 'pagamento.estornado',

  // Estoque
  ESTOQUE_BAIXO = 'estoque.baixo',
  ESTOQUE_ATUALIZADO = 'estoque.atualizado',

  // Ordens de Produção
  OP_CRIADA = 'op.criada',
  OP_INICIADA = 'op.iniciada',
  OP_FINALIZADA = 'op.finalizada',
  OP_CANCELADA = 'op.cancelada',

  // Clientes
  CLIENTE_CRIADO = 'cliente.criado',
  CLIENTE_ATUALIZADO = 'cliente.atualizado',

  // Genérico
  CUSTOM = 'custom',
}

export enum WebhookDestination {
  N8N = 'n8n',
  ZAPIER = 'zapier',
  MAKE = 'make',
  CUSTOM = 'custom',
}

export interface WebhookConfig {
  id?: number;
  name: string;
  destination: WebhookDestination;
  url: string;
  events: WebhookEventType[];
  active: boolean;
  secret?: string;
  headers?: Record<string, string>;
  retry_config?: {
    max_attempts: number;
    backoff_seconds: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: any;
  metadata?: {
    source: string;
    user_id?: string;
    trace_id?: string;
  };
}

export interface WebhookLog {
  id?: number;
  webhook_config_id: number;
  event: WebhookEventType;
  payload: WebhookPayload;
  response_status?: number;
  response_body?: any;
  error?: string;
  attempts: number;
  success: boolean;
  created_at?: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  status?: number;
  response?: any;
  error?: string;
  attempts: number;
}
