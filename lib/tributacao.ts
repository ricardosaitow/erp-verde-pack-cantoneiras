// ============================================
// TRIBUTAÇÃO - Funções Auxiliares
// ============================================
// Funções para validação e cálculo de tributos para NF-e
// ============================================

import type { Produto } from './database.types';

// ============================================
// ORIGEM DA MERCADORIA
// ============================================

export const ORIGENS_MERCADORIA = [
  { value: 0, label: '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8' },
  { value: 1, label: '1 - Estrangeira - Importação direta, exceto a indicada no código 6' },
  { value: 2, label: '2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7' },
  { value: 3, label: '3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%' },
  { value: 4, label: '4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos' },
  { value: 5, label: '5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%' },
  { value: 6, label: '6 - Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX' },
  { value: 7, label: '7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX' },
  { value: 8, label: '8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%' },
];

// ============================================
// CFOP (Código Fiscal de Operações)
// ============================================

export const CFOPS_COMUNS = [
  // DENTRO DO ESTADO (5.xxx)
  { value: '5101', label: '5.101 - Venda de produção do estabelecimento' },
  { value: '5102', label: '5.102 - Venda de mercadoria adquirida ou recebida de terceiros' },
  { value: '5103', label: '5.103 - Venda de produção do estabelecimento, efetuada fora do estabelecimento' },
  { value: '5104', label: '5.104 - Venda de mercadoria adquirida ou recebida de terceiros, efetuada fora do estabelecimento' },
  { value: '5405', label: '5.405 - Venda de mercadoria, adquirida ou recebida de terceiros, sujeita ao regime de substituição tributária' },

  // FORA DO ESTADO (6.xxx)
  { value: '6101', label: '6.101 - Venda de produção do estabelecimento' },
  { value: '6102', label: '6.102 - Venda de mercadoria adquirida ou recebida de terceiros' },
  { value: '6103', label: '6.103 - Venda de produção do estabelecimento, efetuada fora do estabelecimento' },
  { value: '6104', label: '6.104 - Venda de mercadoria adquirida ou recebida de terceiros, efetuada fora do estabelecimento' },
  { value: '6405', label: '6.405 - Venda de mercadoria, adquirida ou recebida de terceiros, sujeita ao regime de substituição tributária' },

  // EXTERIOR (7.xxx)
  { value: '7101', label: '7.101 - Venda de produção do estabelecimento' },
  { value: '7102', label: '7.102 - Venda de mercadoria adquirida ou recebida de terceiros' },
];

export function validarCFOP(cfop: string | undefined): { valido: boolean; erro?: string } {
  if (!cfop) {
    return { valido: false, erro: 'CFOP não informado' };
  }

  const cfopLimpo = cfop.replace(/[.\s-]/g, '');

  if (cfopLimpo.length !== 4) {
    return { valido: false, erro: 'CFOP deve ter 4 dígitos' };
  }

  if (!/^\d{4}$/.test(cfopLimpo)) {
    return { valido: false, erro: 'CFOP deve conter apenas números' };
  }

  return { valido: true };
}

export function formatarCFOP(cfop: string | undefined): string {
  if (!cfop) return '';
  const cfopLimpo = cfop.replace(/[.\s-]/g, '');
  if (cfopLimpo.length !== 4) return cfop;
  return `${cfopLimpo.substring(0, 1)}.${cfopLimpo.substring(1, 4)}`;
}

// ============================================
// CST ICMS (Código de Situação Tributária)
// ============================================

export const CST_ICMS_OPTIONS = [
  // Simples Nacional (CSOSN)
  { value: '101', label: '101 - Tributada pelo Simples Nacional com permissão de crédito', regime: 'simples' },
  { value: '102', label: '102 - Tributada pelo Simples Nacional sem permissão de crédito', regime: 'simples' },
  { value: '103', label: '103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta', regime: 'simples' },
  { value: '201', label: '201 - Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por substituição tributária', regime: 'simples' },
  { value: '202', label: '202 - Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por substituição tributária', regime: 'simples' },
  { value: '500', label: '500 - ICMS cobrado anteriormente por substituição tributária ou por antecipação', regime: 'simples' },
  { value: '900', label: '900 - Outros (Simples Nacional)', regime: 'simples' },

  // Regime Normal
  { value: '000', label: '00 - Tributada integralmente', regime: 'normal' },
  { value: '010', label: '10 - Tributada e com cobrança do ICMS por substituição tributária', regime: 'normal' },
  { value: '020', label: '20 - Com redução de base de cálculo', regime: 'normal' },
  { value: '030', label: '30 - Isenta ou não tributada e com cobrança do ICMS por substituição tributária', regime: 'normal' },
  { value: '040', label: '40 - Isenta', regime: 'normal' },
  { value: '041', label: '41 - Não tributada', regime: 'normal' },
  { value: '050', label: '50 - Suspensão', regime: 'normal' },
  { value: '051', label: '51 - Diferimento', regime: 'normal' },
  { value: '060', label: '60 - ICMS cobrado anteriormente por substituição tributária', regime: 'normal' },
  { value: '070', label: '70 - Com redução de base de cálculo e cobrança do ICMS por substituição tributária', regime: 'normal' },
  { value: '090', label: '90 - Outras', regime: 'normal' },
];

export function validarCSTICMS(cst: string | undefined): { valido: boolean; erro?: string } {
  if (!cst) {
    return { valido: false, erro: 'CST ICMS não informado' };
  }

  const cstLimpo = cst.replace(/[.\s-]/g, '');

  if (cstLimpo.length !== 3) {
    return { valido: false, erro: 'CST ICMS deve ter 3 dígitos' };
  }

  return { valido: true };
}

// ============================================
// CST IPI
// ============================================

export const CST_IPI_OPTIONS = [
  { value: '00', label: '00 - Entrada com Recuperação de Crédito' },
  { value: '01', label: '01 - Entrada Tributada com Alíquota Zero' },
  { value: '02', label: '02 - Entrada Isenta' },
  { value: '03', label: '03 - Entrada Não Tributada' },
  { value: '04', label: '04 - Entrada Imune' },
  { value: '05', label: '05 - Entrada com Suspensão' },
  { value: '49', label: '49 - Outras Entradas' },
  { value: '50', label: '50 - Saída Tributada' },
  { value: '51', label: '51 - Saída Tributada com Alíquota Zero' },
  { value: '52', label: '52 - Saída Isenta' },
  { value: '53', label: '53 - Saída Não Tributada' },
  { value: '54', label: '54 - Saída Imune' },
  { value: '55', label: '55 - Saída com Suspensão' },
  { value: '99', label: '99 - Outras Saídas' },
];

// ============================================
// CST PIS/COFINS
// ============================================

export const CST_PIS_COFINS_OPTIONS = [
  { value: '01', label: '01 - Operação Tributável com Alíquota Básica' },
  { value: '02', label: '02 - Operação Tributável com Alíquota Diferenciada' },
  { value: '03', label: '03 - Operação Tributável com Alíquota por Unidade de Medida de Produto' },
  { value: '04', label: '04 - Operação Tributável Monofásica - Revenda a Alíquota Zero' },
  { value: '05', label: '05 - Operação Tributável por Substituição Tributária' },
  { value: '06', label: '06 - Operação Tributável a Alíquota Zero' },
  { value: '07', label: '07 - Operação Isenta da Contribuição' },
  { value: '08', label: '08 - Operação sem Incidência da Contribuição' },
  { value: '09', label: '09 - Operação com Suspensão da Contribuição' },
  { value: '49', label: '49 - Outras Operações de Saída' },
  { value: '99', label: '99 - Outras Operações' },
];

// ============================================
// CÁLCULOS TRIBUTÁRIOS
// ============================================

export interface CalculoTributario {
  valorProduto: number;

  // ICMS
  baseCalculoICMS: number;
  valorICMS: number;

  // IPI
  baseCalculoIPI: number;
  valorIPI: number;

  // PIS
  baseCalculoPIS: number;
  valorPIS: number;

  // COFINS
  baseCalculoCOFINS: number;
  valorCOFINS: number;

  // Total
  valorTotalTributos: number;
  valorTotalNota: number;
}

export function calcularTributos(
  produto: Produto,
  quantidade: number,
  valorUnitario: number
): CalculoTributario {
  const valorProduto = quantidade * valorUnitario;

  // ICMS
  let baseCalculoICMS = valorProduto;
  if (produto.reducao_bc_icms && produto.reducao_bc_icms > 0) {
    baseCalculoICMS = valorProduto * (1 - produto.reducao_bc_icms / 100);
  }
  const valorICMS = baseCalculoICMS * ((produto.aliquota_icms || 0) / 100);

  // IPI
  const baseCalculoIPI = valorProduto;
  const valorIPI = baseCalculoIPI * ((produto.aliquota_ipi || 0) / 100);

  // PIS
  const baseCalculoPIS = valorProduto;
  const valorPIS = baseCalculoPIS * ((produto.aliquota_pis || 0) / 100);

  // COFINS
  const baseCalculoCOFINS = valorProduto;
  const valorCOFINS = baseCalculoCOFINS * ((produto.aliquota_cofins || 0) / 100);

  // Total
  const valorTotalTributos = valorICMS + valorIPI + valorPIS + valorCOFINS;
  const valorTotalNota = valorProduto + valorIPI; // IPI soma no total, outros não

  return {
    valorProduto,
    baseCalculoICMS,
    valorICMS,
    baseCalculoIPI,
    valorIPI,
    baseCalculoPIS,
    valorPIS,
    baseCalculoCOFINS,
    valorCOFINS,
    valorTotalTributos,
    valorTotalNota,
  };
}

// ============================================
// VALIDAÇÃO PARA NF-E
// ============================================

export function validarProdutoParaNFe(produto: Produto): string[] {
  const erros: string[] = [];

  // NCM obrigatório
  if (!produto.ncm || produto.ncm.length !== 8) {
    erros.push('NCM é obrigatório e deve ter 8 dígitos');
  }

  // CFOP obrigatório
  if (!produto.cfop) {
    erros.push('CFOP é obrigatório');
  } else {
    const { valido, erro } = validarCFOP(produto.cfop);
    if (!valido) {
      erros.push(`CFOP inválido: ${erro}`);
    }
  }

  // Origem obrigatória
  if (produto.origem_mercadoria === undefined || produto.origem_mercadoria === null) {
    erros.push('Origem da mercadoria é obrigatória');
  }

  // CST ICMS obrigatório
  if (!produto.cst_icms) {
    erros.push('CST ICMS é obrigatório');
  }

  // CST PIS obrigatório
  if (!produto.cst_pis) {
    erros.push('CST PIS é obrigatório');
  }

  // CST COFINS obrigatório
  if (!produto.cst_cofins) {
    erros.push('CST COFINS é obrigatório');
  }

  return erros;
}

// ============================================
// CONFIGURAÇÕES PADRÃO
// ============================================

export const TRIBUTACAO_PADRAO_SIMPLES_NACIONAL = {
  cst_icms: '102', // Tributada pelo Simples Nacional sem permissão de crédito
  aliquota_icms: 0,
  cst_ipi: '99', // Outras saídas
  aliquota_ipi: 0,
  cst_pis: '99', // Outras operações
  aliquota_pis: 0,
  cst_cofins: '99', // Outras operações
  aliquota_cofins: 0,
};

export const TRIBUTACAO_PADRAO_LUCRO_PRESUMIDO = {
  cst_icms: '000', // Tributada integralmente
  aliquota_icms: 18, // Varia por estado
  cst_ipi: '99', // Outras saídas (depende do produto)
  aliquota_ipi: 0,
  cst_pis: '01', // Operação tributável com alíquota básica
  aliquota_pis: 0.65,
  cst_cofins: '01', // Operação tributável com alíquota básica
  aliquota_cofins: 3.0,
};
