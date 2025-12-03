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

export interface HistoricoCusto {
  data: string;
  custo_anterior: number;
  custo_novo: number;
  usuario?: string;
  motivo?: string;
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
  custo_por_unidade: number; // CUSTO ADMINISTRATIVO - decisão de gestão
  ultimo_custo_real?: number; // Último custo real pago (informativo)
  historico_custos?: HistoricoCusto[]; // Histórico de alterações no custo administrativo
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

  // Fiscal/Tributário
  ncm?: string; // Código NCM (8 dígitos) - necessário para NF-e
  origem_mercadoria?: number; // 0-Nacional, 1-Estrangeira importação direta, etc
  cfop?: string; // Código Fiscal de Operações (4 dígitos: 5102, 6102, etc)
  cest?: string; // Código Especificador da Substituição Tributária (7 dígitos)

  // ICMS
  cst_icms?: string; // Código de Situação Tributária do ICMS (3 dígitos)
  modalidade_bc_icms?: number; // 0-MVA, 1-Pauta, 2-Preço Tabelado, 3-Valor da operação
  aliquota_icms?: number; // Alíquota do ICMS (%)
  reducao_bc_icms?: number; // Redução da BC do ICMS (%)

  // IPI
  cst_ipi?: string; // Código de Situação Tributária do IPI (2 dígitos)
  codigo_enquadramento_ipi?: string; // Código de enquadramento legal do IPI (3 dígitos)
  aliquota_ipi?: number; // Alíquota do IPI (%)

  // PIS
  cst_pis?: string; // Código de Situação Tributária do PIS (2 dígitos)
  aliquota_pis?: number; // Alíquota do PIS (%)

  // COFINS
  cst_cofins?: string; // Código de Situação Tributária do COFINS (2 dígitos)
  aliquota_cofins?: number; // Alíquota do COFINS (%)

  // Dimensões (em mm)
  altura_mm?: number;
  largura_mm?: number;
  espessura_mm?: number;

  // Peso
  peso_por_unidade_kg?: number; // Peso por unidade de venda (kg por metro, kg por peça, etc.)
  peso_por_metro_kg?: number; // Peso por metro linear (para produtos fabricados)

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

  // Sincronização com Base ERP
  base_id?: number; // ID do produto no Base ERP
  sincronizado?: boolean; // Produto sincronizado com Base?
  data_sincronizacao?: string; // Data da última sincronização

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
  inscricao_municipal?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco_completo?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  contato_principal?: string;
  condicoes_pagamento?: string;
  limite_credito?: number;
  observacoes?: string;
  group_name?: string;
  asaas_customer_id?: string;
  base_customer_id?: string;
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

  // Dados de Pagamento para NF-e
  tipo_cobranca?: string; // BOLETO, PIX, CREDIT_CARD, etc.
  banco_id?: number; // ID do banco no Base ERP
  data_vencimento?: string; // Data de vencimento do pagamento

  // Dados de Transporte
  transportadora_id?: string; // ID da transportadora local
  base_transportadora_id?: number; // ID da transportadora no Base ERP
  tipo_frete?: string; // CIF, FOB, etc.

  // Dados de Volume/Peso para NF-e
  quantidade_volumes?: number; // Quantidade de pallets/volumes
  especie_volumes?: string; // Espécie (PALLET, CAIXA, etc.)
  marca_volumes?: string; // Marca dos volumes
  numeracao_volumes?: string; // Numeração (ex: "1/2", "1-3")
  peso_bruto_kg?: number; // Peso bruto total (produtos + embalagem/pallet)
  peso_liquido_kg?: number; // Peso líquido (apenas produtos)

  // Dados Fiscais para NF-e
  cfop?: string; // CFOP (5101 para SP, 6101 fora de SP)
  dados_adicionais_nfe?: string; // Texto para dados adicionais da NF-e

  vendedor_id?: string;

  // Integração Base ERP
  base_sales_order_id?: string;
  base_invoice_id?: string; // ID da NF-e no Base ERP (para download PDF/XML)
  base_invoice_number?: string;
  base_invoice_key?: string;
  data_emissao_nf?: string;
  sincronizado_base?: boolean;
  ultima_sincronizacao_base?: string;

  // Integração Asaas
  sincronizado_asaas?: boolean;
  ultima_sincronizacao_asaas?: string;
  asaas_payment_id?: string;
  asaas_payment_url?: string;
  status_pagamento?: string;
  data_pagamento?: string;

  // Configurações de cobrança Asaas (processadas na aprovação)
  gerar_cobranca_asaas?: boolean;
  numero_parcelas?: number;
  desconto_antecipado_valor?: number;
  desconto_antecipado_dias?: number;
  desconto_antecipado_tipo?: string;
  juros_atraso?: number;
  multa_atraso?: number;
  multa_atraso_tipo?: string;

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

  // Campos de frete (distribuição manual CIF)
  frete_unitario?: number;
  frete_total_item?: number;
  preco_unitario_com_frete?: number;
  subtotal_com_frete?: number;

  // Peso do item (calculado automaticamente)
  peso_kg?: number;

  created_at: string;
  updated_at: string;
}

export interface OrdemProducao {
  id: string;
  numero_op: string;
  pedido_id: string;
  pedido_item_id?: string; // Agora opcional - referência ao primeiro item (retrocompatibilidade)
  produto_id?: string; // Agora opcional - referência ao primeiro produto (retrocompatibilidade)

  quantidade_produzir_metros: number;
  quantidade_pecas?: number;
  comprimento_cada_mm?: number;
  quantidade_simples?: number;

  data_programada?: string;
  data_inicio_producao?: string;
  data_conclusao?: string;

  // Status atualizado para suportar produção parcial
  status: 'aguardando' | 'em_producao' | 'parcial' | 'concluido' | 'cancelado';

  instrucoes_tecnicas?: string;
  observacoes?: string;
  responsavel_producao?: string;

  created_at: string;
  updated_at: string;
}

// Item individual de uma Ordem de Produção
// Permite rastrear múltiplos produtos/itens dentro de uma única OP
export interface OrdemProducaoItem {
  id: string;
  ordem_producao_id: string;
  pedido_item_id?: string;
  produto_id: string;

  quantidade_metros: number;
  quantidade_pecas?: number;
  comprimento_cada_mm?: number;

  // Status do item específico
  status: 'aguardando' | 'em_producao' | 'finalizado' | 'cancelado';

  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;

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

// Item da OP com produto relacionado
export interface OrdemProducaoItemCompleta extends OrdemProducaoItem {
  produto?: ProdutoComCusto;
  pedido_item?: PedidoItem;
}

export interface OrdemProducaoCompleta extends OrdemProducao {
  pedido?: Pedido;
  produto?: ProdutoComCusto; // Retrocompatibilidade - primeiro produto
  itens?: OrdemProducaoItemCompleta[]; // Novo: todos os itens da OP
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
  lote_id?: string;
  custo_real_unitario?: number;
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

// ============================================
// SISTEMA DE LOTES E CONTROLE PEPS
// ============================================

export interface LoteEstoque {
  id: string;
  materia_prima_id: string;
  compra_item_id?: string;
  data_entrada: string;
  quantidade_inicial_kg: number;
  quantidade_atual_kg: number;
  custo_real_por_kg: number;
  status: 'ativo' | 'esgotado';
  created_at: string;
  updated_at: string;
}

export interface LoteEstoqueCompleto extends LoteEstoque {
  materia_prima?: MateriaPrima;
}

export interface AlertaMudancaLote {
  materia_prima_id: string;
  materia_prima_nome: string;
  lote_anterior_id: string;
  lote_anterior_custo: number;
  lote_novo_id: string;
  lote_novo_custo: number;
  custo_administrativo_atual: number;
  diferenca_percentual: number;
  estoque_restante_lote_novo: number;
}

// ============================================
// PALLETS/VOLUMES DO PEDIDO
// ============================================

export interface PedidoPallet {
  id: string;
  pedido_id: string;
  numero_pallet: number;
  qr_code_hash: string;
  status: 'pendente' | 'conferido';
  data_conferencia?: string;
  conferido_por?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface PedidoPalletCompleto extends PedidoPallet {
  pedido?: PedidoCompleto;
}
