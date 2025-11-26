import { useMemo } from 'react';
import { useProdutos } from './useProdutos';

/**
 * Hook para encontrar produtos similares baseado no nome
 * Útil para copiar tributação de produtos da mesma categoria
 */
export function useProdutosSimilares(nomeAtual: string | undefined) {
  const { produtos } = useProdutos();

  const produtosSimilares = useMemo(() => {
    if (!nomeAtual || nomeAtual.trim().length < 3) {
      return [];
    }

    const nomeNormalizado = nomeAtual.toLowerCase().trim();

    // Extrair padrões do nome (ex: "60X60", "CANTONEIRA", "RIGIDA", etc)
    const palavrasChave = nomeNormalizado.split(/[\s_-]+/);

    // Filtrar produtos similares
    return produtos
      .filter(p => {
        if (p.nome === nomeAtual) return false; // Não incluir o próprio produto

        const nomeProdutoNorm = p.nome.toLowerCase();

        // Se contém alguma palavra-chave significativa (>2 caracteres)
        const temPalavraChave = palavrasChave
          .filter(palavra => palavra.length > 2)
          .some(palavra => nomeProdutoNorm.includes(palavra));

        return temPalavraChave;
      })
      .filter(p => {
        // Apenas produtos com tributação completa
        return p.ncm && p.cfop && p.cst_icms && p.cst_pis && p.cst_cofins;
      })
      .slice(0, 5); // Limitar a 5 sugestões
  }, [nomeAtual, produtos]);

  return produtosSimilares;
}

/**
 * Extrai dados tributários de um produto
 */
export function extrairDadosTributarios(produto: any) {
  return {
    ncm: produto.ncm,
    origem_mercadoria: produto.origem_mercadoria,
    cfop: produto.cfop,
    cest: produto.cest,
    // ICMS
    cst_icms: produto.cst_icms,
    modalidade_bc_icms: produto.modalidade_bc_icms,
    aliquota_icms: produto.aliquota_icms,
    reducao_bc_icms: produto.reducao_bc_icms,
    // IPI
    cst_ipi: produto.cst_ipi,
    codigo_enquadramento_ipi: produto.codigo_enquadramento_ipi,
    aliquota_ipi: produto.aliquota_ipi,
    // PIS
    cst_pis: produto.cst_pis,
    aliquota_pis: produto.aliquota_pis,
    // COFINS
    cst_cofins: produto.cst_cofins,
    aliquota_cofins: produto.aliquota_cofins,
  };
}
