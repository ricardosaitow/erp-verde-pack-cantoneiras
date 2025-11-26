// ============================================
// PRODUTO SYNC - Funções de Sincronização
// ============================================
// Funções auxiliares para sincronização de produtos com Base ERP
// ============================================

import type { Produto } from './database.types';
import type { BaseProduct } from '../types/base';

/**
 * Normaliza unidade de venda para o padrão do Base ERP
 *
 * Base ERP aceita códigos específicos: UN, KG, MT, M2, LT, CX, PC
 */
export function normalizarUnidade(unidadeLocal: string): string {
  if (!unidadeLocal) return 'UN';

  const mapa: Record<string, string> = {
    // Unidade
    'unidade': 'UN',
    'un': 'UN',
    'und': 'UN',
    'u': 'UN',

    // Peso
    'kg': 'KG',
    'quilograma': 'KG',
    'quilo': 'KG',
    'kilogramas': 'KG',

    // Comprimento
    'metro': 'MT',
    'm': 'MT',
    'metros': 'MT',
    'mt': 'MT',

    // Área
    'metro quadrado': 'M2',
    'm2': 'M2',
    'm²': 'M2',
    'metros quadrados': 'M2',

    // Volume
    'litro': 'LT',
    'l': 'LT',
    'lt': 'LT',
    'litros': 'LT',

    // Embalagem
    'caixa': 'CX',
    'cx': 'CX',
    'caixas': 'CX',

    // Peça
    'peça': 'PC',
    'pç': 'PC',
    'pc': 'PC',
    'peças': 'PC',
    'peca': 'PC',
    'pecas': 'PC',

    // Outros
    'pacote': 'PC',
    'pct': 'PC',
    'fardo': 'FD',
    'fd': 'FD',
    'rolo': 'RL',
    'rl': 'RL',
  };

  const normalizado = mapa[unidadeLocal.toLowerCase().trim()];

  if (!normalizado) {
    console.warn(`⚠️ Unidade "${unidadeLocal}" não mapeada. Usando "UN" como padrão.`);
    return 'UN';
  }

  return normalizado;
}

/**
 * Valida código NCM
 * NCM deve ter 8 dígitos numéricos
 */
export function validarNCM(ncm: string | undefined): { valido: boolean; erro?: string } {
  if (!ncm) {
    return { valido: false, erro: 'NCM não informado' };
  }

  // Remover pontos e espaços
  const ncmLimpo = ncm.replace(/[.\s-]/g, '');

  // Verificar se tem 8 dígitos
  if (ncmLimpo.length !== 8) {
    return { valido: false, erro: 'NCM deve ter 8 dígitos' };
  }

  // Verificar se são apenas números
  if (!/^\d{8}$/.test(ncmLimpo)) {
    return { valido: false, erro: 'NCM deve conter apenas números' };
  }

  return { valido: true };
}

/**
 * Formata NCM para exibição (9999.99.99)
 */
export function formatarNCM(ncm: string | undefined): string {
  if (!ncm) return '';

  const ncmLimpo = ncm.replace(/[.\s-]/g, '');

  if (ncmLimpo.length !== 8) return ncm;

  return `${ncmLimpo.substring(0, 4)}.${ncmLimpo.substring(4, 6)}.${ncmLimpo.substring(6, 8)}`;
}

/**
 * Valida produto antes de sincronizar com Base ERP
 */
export function validarProdutoParaBase(produto: Produto): string[] {
  const erros: string[] = [];

  // 1. Nome obrigatório (mínimo 3 caracteres)
  if (!produto.nome || produto.nome.trim().length < 3) {
    erros.push('Nome do produto deve ter pelo menos 3 caracteres');
  }

  // 2. Unidade de venda obrigatória
  if (!produto.unidade_venda) {
    erros.push('Unidade de venda é obrigatória');
  }

  // 3. Preço de venda (aviso, não erro crítico)
  if (!produto.preco_venda_unitario || produto.preco_venda_unitario <= 0) {
    console.warn(`⚠️ Produto "${produto.nome}" sem preço de venda definido`);
  }

  // 4. NCM (aviso forte para produtos que serão faturados)
  if (!produto.ncm) {
    console.warn(`⚠️ Produto "${produto.nome}" sem NCM! Isso pode causar problemas na emissão de NF-e`);
  } else {
    const { valido, erro } = validarNCM(produto.ncm);
    if (!valido) {
      erros.push(`NCM inválido: ${erro}`);
    }
  }

  return erros;
}

/**
 * Mapeia produto local para formato do Base ERP
 */
export function mapearProdutoParaBase(produto: Produto): BaseProduct {
  // Validar antes de mapear
  const erros = validarProdutoParaBase(produto);
  if (erros.length > 0) {
    throw new Error(`Produto inválido:\n${erros.join('\n')}`);
  }

  // Limpar NCM (remover pontos)
  const ncmLimpo = produto.ncm?.replace(/[.\s-]/g, '');

  // Gerar código se não fornecido (Base ERP pode exigir ambos: code E sku)
  const codigoInterno = produto.codigo_interno || `PROD-${produto.id?.substring(0, 8).toUpperCase()}`;

  const baseProduct: BaseProduct = {
    name: produto.nome,
    code: codigoInterno, // ✅ Código do produto (obrigatório no Base)
    sku: codigoInterno, // ✅ SKU (código interno)
    ncm: ncmLimpo,
    unit: normalizarUnidade(produto.unidade_venda),
    price: produto.preco_venda_unitario || 0,
    cost: produto.custo_compra,
    inventory: produto.estoque_atual,
    minInventory: produto.estoque_minimo,
    description: produto.descricao,
    externalReference: produto.id, // UUID local para rastreabilidade
    observations: produto.instrucoes_tecnicas || undefined,
  };

  // Log para debug
  console.log('📦 Produto mapeado para Base ERP:', {
    name: baseProduct.name,
    code: baseProduct.code,
    sku: baseProduct.sku,
    ncm: baseProduct.ncm,
    unit: baseProduct.unit,
    price: baseProduct.price,
  });

  return baseProduct;
}

/**
 * Mapeia produto do Base ERP para formato local (para sincronização reversa)
 */
export function mapearBaseParaProduto(baseProduct: BaseProduct, produtoLocal?: Partial<Produto>): Partial<Produto> {
  return {
    nome: baseProduct.name,
    codigo_interno: baseProduct.code || baseProduct.sku, // Preferir 'code', fallback para 'sku'
    ncm: baseProduct.ncm,
    unidade_venda: baseProduct.unit || 'UN',
    preco_venda_unitario: baseProduct.price || 0,
    custo_compra: baseProduct.cost,
    estoque_atual: baseProduct.inventory,
    estoque_minimo: baseProduct.minInventory,
    descricao: baseProduct.description,
    base_id: baseProduct.id ? Number(baseProduct.id) : undefined,
    sincronizado: true,
    data_sincronizacao: new Date().toISOString(),
    // Manter dados locais que não existem no Base
    ...produtoLocal,
  };
}

/**
 * Gera mensagem de erro amigável para sincronização
 */
export function gerarMensagemErroSync(erro: any): string {
  const mensagem = erro?.message || String(erro);

  // Erros comuns do Base ERP
  if (mensagem.includes('code') || mensagem.includes('código')) {
    return 'Código do produto é obrigatório. O sistema deve gerar automaticamente.';
  }

  if (mensagem.includes('NCM')) {
    return 'NCM inválido ou ausente. Verifique o código NCM do produto.';
  }

  if (mensagem.includes('unit')) {
    return 'Unidade de venda inválida. Use: UN, KG, MT, M2, LT, CX ou PC.';
  }

  if (mensagem.includes('name')) {
    return 'Nome do produto é obrigatório e deve ter pelo menos 3 caracteres.';
  }

  if (mensagem.includes('price')) {
    return 'Preço de venda deve ser um número válido.';
  }

  if (mensagem.includes('401') || mensagem.includes('403')) {
    return 'Erro de autenticação com Base ERP. Verifique as credenciais.';
  }

  if (mensagem.includes('404')) {
    return 'Produto não encontrado no Base ERP.';
  }

  if (mensagem.includes('409')) {
    return 'Produto já existe no Base ERP com este código.';
  }

  // Erro genérico
  return `Erro ao sincronizar com Base ERP: ${mensagem}`;
}
