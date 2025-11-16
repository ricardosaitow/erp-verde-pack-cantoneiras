// ============================================
// TIPOS DO BANCO DE DADOS SUPABASE
// ============================================

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'fabricado' | 'revenda';
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Fornecedor {
  id: string;
  tipo_pessoa: 'fisica' | 'juridica';
  razao_social: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco_completo?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  contato_principal?: string;
  condicoes_pagamento?: string;
  prazo_entrega?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MateriaPrima {
  id: string;
  nome: string;
  tipo: string;
  gramatura?: number; // g/m²
  largura_mm?: number;
  peso_por_metro_g?: number; // calculado automaticamente
  unidade_estoque: string; // kg, litro, unidade
  estoque_atual: number;
  estoque_minimo: number;
  estoque_ponto_reposicao: number;
  custo_por_unidade: number;
  fornecedor_id?: string;
  local_armazenamento?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: string;
  nome: string;
  codigo_interno?: string;
  descricao?: string;
  categoria_id?: string;
  tipo: 'fabricado' | 'revenda';
  
  // Dimensões (em mm)
  altura_mm?: number;
  largura_mm?: number;
  espessura_mm?: number;
  
  // Venda
  unidade_venda: string;
  permite_medida_composta: boolean;
  preco_venda_unitario: number;
  margem_lucro_percentual?: number;
  
  // Específico para REVENDA
  estoque_atual?: number;
  estoque_minimo?: number;
  estoque_ponto_reposicao?: number;
  custo_compra?: number;
  fornecedor_id?: string;
  codigo_fornecedor?: string;
  lote_minimo_compra?: number;
  prazo_entrega_dias?: number;
  local_armazenamento?: string;
  
  // Específico para FABRICADO
  tempo_producao_metros_hora?: number;
  lead_time_dias?: number;
  instrucoes_tecnicas?: string;
  
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Receita {
  id: string;
  produto_id: string;
  materia_prima_id: string;
  numero_camadas: number;
  consumo_por_metro_g: number;
  custo_por_metro?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  tipo_pessoa: 'fisica' | 'juridica';
  razao_social: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco_completo?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  contato_principal?: string;
  condicoes_pagamento?: string;
  limite_credito?: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClienteContato {
  id: string;
  cliente_id: string;
  tipo_contato: 'comercial' | 'financeiro' | 'tecnico' | 'operacional' | 'diretoria' | 'outro';
  nome_responsavel: string;
  email?: string;
  telefone?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pedido {
  id: string;
  numero_pedido: string;
  cliente_id: string;
  data_pedido: string;
  tipo: 'orcamento' | 'pedido_confirmado';
  status: 'pendente' | 'aprovado' | 'producao' | 'finalizado' | 'aguardando_despacho' | 'entregue' | 'cancelado' | 'recusado';
  
  valor_produtos: number;
  valor_frete: number;
  valor_desconto: number;
  valor_total: number;
  
  prazo_entrega_dias?: number;
  data_entrega_prevista?: string;
  data_entrega_realizada?: string;
  
  forma_pagamento?: string;
  condicoes_pagamento?: string;
  observacoes?: string;
  observacoes_internas?: string;
  
  vendedor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string;
  tipo_produto: 'fabricado' | 'revenda';
  
  // Para venda composta
  quantidade_pecas?: number;
  comprimento_cada_mm?: number;
  total_calculado?: number;
  
  // Para venda simples
  quantidade_simples?: number;
  
  unidade_medida: string;
  preco_unitario: number;
  subtotal: number;
  observacoes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface OrdemProducao {
  id: string;
  numero_op: string;
  pedido_id: string;
  pedido_item_id: string;
  produto_id: string;

  quantidade_produzir_metros: number;
  quantidade_pecas?: number;
  comprimento_cada_mm?: number;
  quantidade_simples?: number;
  
  data_programada?: string;
  data_inicio_producao?: string;
  data_conclusao?: string;
  
  status: 'aguardando' | 'em_producao' | 'concluido' | 'cancelado';
  
  instrucoes_tecnicas?: string;
  observacoes?: string;
  responsavel_producao?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// TIPOS COMPOSTOS (com relacionamentos)
// ============================================

export interface ProdutoComCusto extends Produto {
  custo_total_por_metro?: number;
  margem_real_percentual?: number;
  receitas?: (Receita & { materia_prima?: MateriaPrima })[];
  categoria?: Categoria;
}

export interface PedidoCompleto extends Pedido {
  cliente?: Cliente;
  itens?: (PedidoItem & { produto?: Produto })[];
}

export interface OrdemProducaoCompleta extends OrdemProducao {
  pedido?: Pedido;
  produto?: ProdutoComCusto;
}

export interface AlertaEstoque {
  tipo_item: 'materia_prima' | 'produto_revenda';
  id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_estoque: string;
  nivel_alerta: 'critico' | 'baixo' | 'normal';
}

export interface MovimentacaoEstoque {
  id: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'producao';
  tipo_item: 'materia_prima' | 'produto_revenda';
  item_id: string;
  quantidade_anterior: number;
  quantidade_movimentada: number;
  quantidade_atual: number;
  unidade: string;
  motivo: 'compra' | 'venda' | 'producao' | 'ajuste_inventario' | 'devolucao';
  documento_referencia?: string;
  observacoes?: string;
  usuario_id?: string;
  created_at: string;
}

// ============================================
// COMPRAS
// ============================================

export interface Compra {
  id: string;
  numero_compra: string;
  fornecedor_id: string;
  data_compra: string;
  data_entrega_prevista?: string;
  data_entrega_real?: string;
  tipo_compra: 'materia_prima' | 'revenda';
  status: 'pendente' | 'aprovado' | 'pedido_enviado' | 'parcialmente_recebido' | 'recebido' | 'cancelado';
  valor_total: number;
  desconto: number;
  frete: number;
  outras_despesas: number;
  valor_final: number;
  condicao_pagamento?: string;
  numero_nfe?: string;
  chave_nfe?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemCompra {
  id: string;
  compra_id: string;
  materia_prima_id?: string;
  produto_revenda_id?: string;
  quantidade: number;
  unidade_medida: string;
  preco_unitario: number;
  subtotal: number;
  quantidade_recebida: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface CompraCompleta extends Compra {
  fornecedor?: Fornecedor;
  itens?: (ItemCompra & {
    materia_prima?: MateriaPrima;
    produto?: Produto;
  })[];
}
