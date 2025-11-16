import type { Receita, MateriaPrima, Produto } from './database.types';

/**
 * Calcula o consumo de material em kg a partir de metros lineares e consumo por metro
 * @param totalMetros Total de metros lineares
 * @param consumoPorMetroG Consumo por metro em gramas
 * @returns Consumo em kg
 */
export function calcularConsumoMaterial(totalMetros: number, consumoPorMetroG: number): number {
  if (!totalMetros || !consumoPorMetroG) return 0;
  return (totalMetros * consumoPorMetroG) / 1000;
}

/**
 * Verifica o estoque de matérias-primas necessárias para produzir um produto fabricado
 * @param totalMetros Total de metros lineares a produzir
 * @param receitas Receitas do produto (com matérias-primas relacionadas)
 * @param materiasPrimas Lista completa de matérias-primas (para buscar estoque)
 * @returns Status de disponibilidade e lista de materiais faltantes
 */
export function verificarEstoqueMateriasPrimas(
  totalMetros: number,
  receitas: (Receita & { materia_prima?: MateriaPrima })[],
  materiasPrimas: MateriaPrima[]
): {
  disponivel: boolean;
  materiais: Array<{
    materia_prima_id: string;
    materia_nome: string;
    consumo_kg: number;
    estoque_disponivel_kg: number;
    disponivel: boolean;
    unidade_estoque: string;
  }>;
  faltantes: Array<{
    materia: string;
    necessario: number;
    disponivel: number;
    unidade: string;
  }>;
} {
  const materiais: Array<{
    materia_prima_id: string;
    materia_nome: string;
    consumo_kg: number;
    estoque_disponivel_kg: number;
    disponivel: boolean;
    unidade_estoque: string;
  }> = [];

  const faltantes: Array<{
    materia: string;
    necessario: number;
    disponivel: number;
    unidade: string;
  }> = [];

  if (!receitas || receitas.length === 0 || !totalMetros || totalMetros <= 0) {
    return { disponivel: true, materiais, faltantes };
  }

  // Converter estoque de matérias-primas para um mapa para acesso rápido
  const estoqueMap = new Map<string, MateriaPrima>();
  materiasPrimas.forEach((mp) => {
    estoqueMap.set(mp.id, mp);
  });

  let todasDisponiveis = true;

  // Verificar cada receita
  for (const receita of receitas) {
    if (!receita.materia_prima) {
      // Se a matéria-prima não estiver carregada, buscar no mapa
      const materiaPrima = estoqueMap.get(receita.materia_prima_id);
      if (!materiaPrima) {
        console.warn(`Matéria-prima ${receita.materia_prima_id} não encontrada`);
        continue;
      }
      receita.materia_prima = materiaPrima;
    }

    const materiaPrima = receita.materia_prima;
    const consumoKg = calcularConsumoMaterial(totalMetros, receita.consumo_por_metro_g);
    const estoqueDisponivelKg = materiaPrima.estoque_atual || 0;

    // Verificar se o estoque é suficiente
    // Nota: Assumindo que estoque está sempre em kg para matérias-primas
    // Se a unidade for diferente, precisaríamos converter
    const disponivel = estoqueDisponivelKg >= consumoKg;

    materiais.push({
      materia_prima_id: materiaPrima.id,
      materia_nome: materiaPrima.nome,
      consumo_kg: consumoKg,
      estoque_disponivel_kg: estoqueDisponivelKg,
      disponivel,
      unidade_estoque: materiaPrima.unidade_estoque,
    });

    if (!disponivel) {
      todasDisponiveis = false;
      faltantes.push({
        materia: materiaPrima.nome,
        necessario: consumoKg,
        disponivel: estoqueDisponivelKg,
        unidade: materiaPrima.unidade_estoque,
      });
    }
  }

  return {
    disponivel: todasDisponiveis,
    materiais,
    faltantes,
  };
}

/**
 * Verifica o estoque de um produto de revenda
 * @param produto Produto de revenda
 * @param quantidade Quantidade necessária
 * @returns Status de disponibilidade e quantidades
 */
export function verificarEstoqueProdutoRevenda(
  produto: Produto,
  quantidade: number
): {
  disponivel: boolean;
  disponivel_estoque: number;
  necessario: number;
  suficiente: boolean;
} {
  if (!produto || produto.tipo !== 'revenda') {
    return {
      disponivel: false,
      disponivel_estoque: 0,
      necessario: quantidade,
      suficiente: false,
    };
  }

  const estoqueDisponivel = produto.estoque_atual || 0;
  const suficiente = estoqueDisponivel >= quantidade;

  return {
    disponivel: suficiente,
    disponivel_estoque: estoqueDisponivel,
    necessario: quantidade,
    suficiente,
  };
}
