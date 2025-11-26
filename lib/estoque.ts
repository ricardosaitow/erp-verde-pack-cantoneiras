import { supabase } from './supabase';
import type { MovimentacaoEstoque, LoteEstoque, AlertaMudancaLote } from './database.types';
import { calcularConsumoMaterial } from './calculos';
import { formatNumber } from './format';

/**
 * Dá baixa no estoque de uma matéria-prima e cria movimentação
 * @param materiaPrimaId ID da matéria-prima
 * @param quantidadeKg Quantidade a dar baixa (em kg)
 * @param motivo Motivo da movimentação
 * @param documentoReferencia Documento de referência (ex: pedido_id, ordem_producao_id)
 * @param observacoes Observações adicionais
 * @returns Resultado da operação
 */
export async function darBaixaMateriaPrima(
  materiaPrimaId: string,
  quantidadeKg: number,
  motivo: 'compra' | 'venda' | 'producao' | 'ajuste_inventario' | 'devolucao',
  documentoReferencia?: string,
  observacoes?: string
): Promise<{ error: string | null }> {
  try {
    // Buscar matéria-prima atual
    const { data: materiaPrima, error: fetchError } = await supabase
      .from('materias_primas')
      .select('*')
      .eq('id', materiaPrimaId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar matéria-prima:', fetchError);
      return { error: 'Erro ao buscar matéria-prima: ' + fetchError.message };
    }

    if (!materiaPrima) {
      return { error: 'Matéria-prima não encontrada' };
    }

    const estoqueAnterior = Number(materiaPrima.estoque_atual) || 0;
    const estoqueAtual = Math.max(0, estoqueAnterior - quantidadeKg);

    // Atualizar estoque da matéria-prima
    const { error: updateError } = await supabase
      .from('materias_primas')
      .update({ estoque_atual: estoqueAtual })
      .eq('id', materiaPrimaId);

    if (updateError) {
      console.error('Erro ao atualizar estoque da matéria-prima:', updateError);
      return { error: 'Erro ao atualizar estoque: ' + updateError.message };
    }

    // Criar movimentação de estoque
    const movimentacao: Omit<MovimentacaoEstoque, 'id' | 'created_at'> = {
      tipo: motivo === 'producao' ? 'producao' : 'saida',
      tipo_item: 'materia_prima',
      item_id: materiaPrimaId,
      quantidade_anterior: estoqueAnterior,
      quantidade_movimentada: -quantidadeKg, // Negativo para saída
      quantidade_atual: estoqueAtual,
      unidade: materiaPrima.unidade_estoque,
      motivo,
      documento_referencia: documentoReferencia,
      observacoes,
    };

    const { error: movError } = await supabase
      .from('movimentacoes_estoque')
      .insert([movimentacao]);

    if (movError) {
      console.error('Erro ao criar movimentação:', movError);
      // Não falhar se movimentação falhar, mas avisar
      console.warn('Movimentação não foi criada, mas estoque foi atualizado');
    }

    console.log(`✅ Baixa de ${quantidadeKg} ${materiaPrima.unidade_estoque} de ${materiaPrima.nome}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao dar baixa no estoque' };
  }
}

/**
 * Dá baixa no estoque de um produto de revenda e cria movimentação
 * @param produtoId ID do produto
 * @param quantidade Quantidade a dar baixa
 * @param motivo Motivo da movimentação
 * @param documentoReferencia Documento de referência (ex: pedido_id)
 * @param observacoes Observações adicionais
 * @returns Resultado da operação
 */
export async function darBaixaProdutoRevenda(
  produtoId: string,
  quantidade: number,
  motivo: 'compra' | 'venda' | 'producao' | 'ajuste_inventario' | 'devolucao',
  documentoReferencia?: string,
  observacoes?: string
): Promise<{ error: string | null }> {
  try {
    // Buscar produto atual
    const { data: produto, error: fetchError } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', produtoId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar produto:', fetchError);
      return { error: 'Erro ao buscar produto: ' + fetchError.message };
    }

    if (!produto) {
      return { error: 'Produto não encontrado' };
    }

    if (produto.tipo !== 'revenda') {
      return { error: 'Produto não é de revenda' };
    }

    const estoqueAnterior = Number(produto.estoque_atual) || 0;
    const estoqueAtual = Math.max(0, estoqueAnterior - quantidade);

    // Atualizar estoque do produto
    const { error: updateError } = await supabase
      .from('produtos')
      .update({ estoque_atual: estoqueAtual })
      .eq('id', produtoId);

    if (updateError) {
      console.error('Erro ao atualizar estoque do produto:', updateError);
      return { error: 'Erro ao atualizar estoque: ' + updateError.message };
    }

    // Criar movimentação de estoque
    const movimentacao: Omit<MovimentacaoEstoque, 'id' | 'created_at'> = {
      tipo: 'saida',
      tipo_item: 'produto_revenda',
      item_id: produtoId,
      quantidade_anterior: estoqueAnterior,
      quantidade_movimentada: -quantidade, // Negativo para saída
      quantidade_atual: estoqueAtual,
      unidade: produto.unidade_venda,
      motivo,
      documento_referencia: documentoReferencia,
      observacoes,
    };

    const { error: movError } = await supabase
      .from('movimentacoes_estoque')
      .insert([movimentacao]);

    if (movError) {
      console.error('Erro ao criar movimentação:', movError);
      // Não falhar se movimentação falhar, mas avisar
      console.warn('Movimentação não foi criada, mas estoque foi atualizado');
    }

    console.log(`✅ Baixa de ${quantidade} ${produto.unidade_venda} de ${produto.nome}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao dar baixa no estoque' };
  }
}

/**
 * Dá baixa no estoque de matérias-primas para uma ordem de produção
 * USANDO SISTEMA PEPS - retorna alertas de mudança de custo
 * @param produtoId ID do produto fabricado
 * @param totalMetros Total de metros a produzir
 * @param ordemProducaoId ID da ordem de produção
 * @param pedidoId ID do pedido (opcional)
 * @returns Resultado da operação + alertas de mudança de custo
 */
export async function darBaixaMateriasPrimasProducao(
  produtoId: string,
  totalMetros: number,
  ordemProducaoId: string,
  pedidoId?: string
): Promise<{
  error: string | null;
  errosDetalhados?: string[];
  alertas?: AlertaMudancaLote[];
}> {
  try {
    // Buscar receitas do produto
    const { data: receitas, error: receitasError } = await supabase
      .from('receitas')
      .select(`
        *,
        materia_prima:materias_primas(*)
      `)
      .eq('produto_id', produtoId);

    if (receitasError) {
      console.error('Erro ao buscar receitas:', receitasError);
      return { error: 'Erro ao buscar receitas: ' + receitasError.message };
    }

    if (!receitas || receitas.length === 0) {
      return { error: 'Produto não possui receitas cadastradas' };
    }

    const errosDetalhados: string[] = [];
    const todosAlertas: AlertaMudancaLote[] = [];
    const documentoReferencia = pedidoId
      ? `Pedido: ${pedidoId}, OP: ${ordemProducaoId}`
      : `OP: ${ordemProducaoId}`;

    // Dar baixa em cada matéria-prima usando PEPS
    for (const receita of receitas) {
      if (!receita.materia_prima) {
        errosDetalhados.push(`Matéria-prima ${receita.materia_prima_id} não encontrada`);
        continue;
      }

      const consumoKg = calcularConsumoMaterial(totalMetros, receita.consumo_por_metro_g);

      if (consumoKg <= 0) {
        continue; // Pular se consumo for zero
      }

      // Usar PEPS
      const { error: baixaError, alertas } = await consumirMateriaPrimaPEPS(
        receita.materia_prima_id,
        consumoKg,
        `Produção de ${formatNumber(totalMetros)}m - ${receita.materia_prima.nome}`,
        documentoReferencia
      );

      if (baixaError) {
        errosDetalhados.push(`${receita.materia_prima.nome}: ${baixaError}`);
      }

      // Coletar alertas
      if (alertas && alertas.length > 0) {
        todosAlertas.push(...alertas);
      }

      // Atualizar estoque total da matéria-prima
      const novoEstoque = (receita.materia_prima.estoque_atual || 0) - consumoKg;
      await supabase
        .from('materias_primas')
        .update({ estoque_atual: Math.max(0, novoEstoque) })
        .eq('id', receita.materia_prima_id);
    }

    if (errosDetalhados.length > 0) {
      return {
        error: 'Erros ao dar baixa em algumas matérias-primas',
        errosDetalhados,
        alertas: todosAlertas.length > 0 ? todosAlertas : undefined
      };
    }

    console.log(`✅ Baixa de matérias-primas para produção de ${formatNumber(totalMetros)}m`);

    if (todosAlertas.length > 0) {
      console.log(`⚠️  ${todosAlertas.length} alerta(s) de mudança de custo detectado(s)`);
    }

    return {
      error: null,
      alertas: todosAlertas.length > 0 ? todosAlertas : undefined
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao dar baixa nas matérias-primas' };
  }
}

// ============================================
// SISTEMA DE LOTES E CONTROLE PEPS
// ============================================

/**
 * Busca o próximo lote ativo (PEPS) para uma matéria-prima
 */
export async function buscarProximoLote(materiaPrimaId: string): Promise<LoteEstoque | null> {
  const { data, error } = await supabase
    .from('lotes_estoque')
    .select('*')
    .eq('materia_prima_id', materiaPrimaId)
    .eq('status', 'ativo')
    .gt('quantidade_atual_kg', 0)
    .order('data_entrada', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    console.error('Erro ao buscar próximo lote:', error);
    return null;
  }

  return data;
}

/**
 * Consome quantidade de um lote específico (PEPS)
 * Retorna alerta se o lote mudou e o custo é diferente
 */
export async function consumirLote(
  loteId: string,
  quantidadeKg: number,
  motivo: string,
  documentoReferencia?: string
): Promise<{
  error: string | null;
  alerta?: AlertaMudancaLote;
  lote_esgotado?: boolean;
}> {
  try {
    // Buscar lote atual
    const { data: lote, error: fetchError } = await supabase
      .from('lotes_estoque')
      .select('*, materia_prima:materias_primas(*)')
      .eq('id', loteId)
      .single();

    if (fetchError || !lote) {
      return { error: 'Lote não encontrado' };
    }

    const quantidadeRestante = lote.quantidade_atual_kg - quantidadeKg;
    const loteEsgotado = quantidadeRestante <= 0;

    // Atualizar quantidade do lote
    const { error: updateError } = await supabase
      .from('lotes_estoque')
      .update({
        quantidade_atual_kg: Math.max(0, quantidadeRestante),
        status: loteEsgotado ? 'esgotado' : 'ativo',
      })
      .eq('id', loteId);

    if (updateError) {
      return { error: 'Erro ao atualizar lote: ' + updateError.message };
    }

    // Criar movimentação
    const movimentacao: Omit<MovimentacaoEstoque, 'id' | 'created_at'> = {
      tipo: 'producao',
      tipo_item: 'materia_prima',
      item_id: lote.materia_prima_id,
      quantidade_anterior: lote.quantidade_atual_kg,
      quantidade_movimentada: -quantidadeKg,
      quantidade_atual: Math.max(0, quantidadeRestante),
      unidade: lote.materia_prima.unidade_estoque,
      motivo: 'producao',
      documento_referencia: documentoReferencia,
      lote_id: loteId,
      custo_real_unitario: lote.custo_real_por_kg,
      observacoes: motivo,
    };

    await supabase.from('movimentacoes_estoque').insert([movimentacao]);

    // Se lote esgotou, verificar se próximo lote tem custo diferente
    let alerta: AlertaMudancaLote | undefined;

    if (loteEsgotado) {
      const proximoLote = await buscarProximoLote(lote.materia_prima_id);

      if (proximoLote && proximoLote.custo_real_por_kg !== lote.materia_prima.custo_por_unidade) {
        const diferencaPercentual = ((proximoLote.custo_real_por_kg - lote.materia_prima.custo_por_unidade) / lote.materia_prima.custo_por_unidade) * 100;

        alerta = {
          materia_prima_id: lote.materia_prima_id,
          materia_prima_nome: lote.materia_prima.nome,
          lote_anterior_id: loteId,
          lote_anterior_custo: lote.custo_real_por_kg,
          lote_novo_id: proximoLote.id,
          lote_novo_custo: proximoLote.custo_real_por_kg,
          custo_administrativo_atual: lote.materia_prima.custo_por_unidade,
          diferenca_percentual: diferencaPercentual,
          estoque_restante_lote_novo: proximoLote.quantidade_atual_kg,
        };
      }
    }

    return {
      error: null,
      alerta,
      lote_esgotado: loteEsgotado,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao consumir lote' };
  }
}

/**
 * Consome matéria-prima usando PEPS
 * Retorna alertas de mudança de custo se aplicável
 */
export async function consumirMateriaPrimaPEPS(
  materiaPrimaId: string,
  quantidadeKg: number,
  motivo: string,
  documentoReferencia?: string
): Promise<{
  error: string | null;
  alertas?: AlertaMudancaLote[];
}> {
  const alertas: AlertaMudancaLote[] = [];
  let quantidadeRestante = quantidadeKg;

  while (quantidadeRestante > 0) {
    const lote = await buscarProximoLote(materiaPrimaId);

    if (!lote) {
      return {
        error: `Estoque insuficiente. Faltam ${quantidadeRestante.toFixed(3)}kg`,
        alertas: alertas.length > 0 ? alertas : undefined,
      };
    }

    const quantidadeAConsumir = Math.min(quantidadeRestante, lote.quantidade_atual_kg);

    const resultado = await consumirLote(
      lote.id,
      quantidadeAConsumir,
      motivo,
      documentoReferencia
    );

    if (resultado.error) {
      return { error: resultado.error, alertas: alertas.length > 0 ? alertas : undefined };
    }

    if (resultado.alerta) {
      alertas.push(resultado.alerta);
    }

    quantidadeRestante -= quantidadeAConsumir;
  }

  return { error: null, alertas: alertas.length > 0 ? alertas : undefined };
}

/**
 * Cria um novo lote ao receber compra
 */
export async function criarLoteEstoque(
  materiaPrimaId: string,
  quantidadeKg: number,
  custoRealPorKg: number,
  compraItemId?: string
): Promise<{ error: string | null; lote_id?: string }> {
  try {
    const { data, error } = await supabase
      .from('lotes_estoque')
      .insert([{
        materia_prima_id: materiaPrimaId,
        compra_item_id: compraItemId,
        quantidade_inicial_kg: quantidadeKg,
        quantidade_atual_kg: quantidadeKg,
        custo_real_por_kg: custoRealPorKg,
        status: 'ativo',
      }])
      .select()
      .single();

    if (error) {
      return { error: 'Erro ao criar lote: ' + error.message };
    }

    // Atualizar ultimo_custo_real da matéria-prima
    await supabase
      .from('materias_primas')
      .update({ ultimo_custo_real: custoRealPorKg })
      .eq('id', materiaPrimaId);

    return { error: null, lote_id: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar lote' };
  }
}

// ============================================
// SISTEMA DE PROVISÃO/RESERVA DE LOTES
// ============================================

export interface LoteParaReserva {
  lote_id: string;
  quantidade_kg: number;
  custo_por_kg: number;
  quantidade_disponivel_antes: number;
  data_entrada: string;
}

export interface AlertaProvisao {
  tipo: 'estoque_insuficiente' | 'mudanca_custo';
  materia_prima_id: string;
  materia_prima_nome: string;
  // Para estoque_insuficiente
  quantidade_necessaria?: number;
  quantidade_disponivel?: number;
  quantidade_faltante?: number;
  // Para mudanca_custo
  custo_atual?: number;
  custo_novo?: number;
  diferenca_percentual?: number;
  lote_atual_id?: string;
  lote_novo_id?: string;
  // Info do lote que será usado
  lote_data_entrada?: string;
  lote_quantidade_disponivel?: number;
}

export interface ResultadoProvisao {
  sucesso: boolean;
  alertas: AlertaProvisao[];
  reservas: {
    materia_prima_id: string;
    materia_prima_nome: string;
    quantidade_total_kg: number;
    lotes: LoteParaReserva[];
    custo_proximo_lote: number;
    custo_administrativo?: number;
  }[];
  resumo: {
    tem_estoque_suficiente: boolean;
    tem_mudanca_custo: boolean;
    materiais_faltantes: string[];
  };
}

/**
 * Busca lotes disponíveis para provisão (PEPS)
 * Considera quantidade_atual - quantidade_reservada
 */
export async function buscarLotesDisponiveis(materiaPrimaId: string): Promise<{
  lotes: Array<{
    id: string;
    quantidade_atual_kg: number;
    quantidade_reservada_kg: number;
    quantidade_disponivel_kg: number;
    custo_real_por_kg: number;
    data_entrada: string;
  }>;
  total_disponivel: number;
}> {
  const { data, error } = await supabase
    .from('lotes_estoque')
    .select('id, quantidade_atual_kg, quantidade_reservada_kg, custo_real_por_kg, data_entrada')
    .eq('materia_prima_id', materiaPrimaId)
    .eq('status', 'ativo')
    .gt('quantidade_atual_kg', 0)
    .order('data_entrada', { ascending: true });

  if (error || !data) {
    return { lotes: [], total_disponivel: 0 };
  }

  const lotes = data.map(l => ({
    ...l,
    quantidade_reservada_kg: l.quantidade_reservada_kg || 0,
    quantidade_disponivel_kg: (l.quantidade_atual_kg || 0) - (l.quantidade_reservada_kg || 0),
  })).filter(l => l.quantidade_disponivel_kg > 0);

  const total_disponivel = lotes.reduce((sum, l) => sum + l.quantidade_disponivel_kg, 0);

  return { lotes, total_disponivel };
}

/**
 * Simula a provisão de material (não reserva, apenas calcula)
 * Verifica disponibilidade de estoque e diferença de custo administrativo vs lotes
 */
export async function simularProvisao(
  materiaisNecessarios: Array<{
    materia_prima_id: string;
    materia_prima_nome: string;
    quantidade_kg: number;
    custo_administrativo: number;
  }>
): Promise<ResultadoProvisao> {
  const alertas: AlertaProvisao[] = [];
  const reservas: ResultadoProvisao['reservas'] = [];
  const materiaisFaltantes: string[] = [];
  let temMudancaCusto = false;

  for (const material of materiaisNecessarios) {
    const { lotes, total_disponivel } = await buscarLotesDisponiveis(material.materia_prima_id);

    // Verificar se tem estoque suficiente
    if (total_disponivel < material.quantidade_kg) {
      alertas.push({
        tipo: 'estoque_insuficiente',
        materia_prima_id: material.materia_prima_id,
        materia_prima_nome: material.materia_prima_nome,
        quantidade_necessaria: material.quantidade_kg,
        quantidade_disponivel: total_disponivel,
        quantidade_faltante: material.quantidade_kg - total_disponivel,
      });
      materiaisFaltantes.push(material.materia_prima_nome);
    }

    // Simular quais lotes serão usados (PEPS)
    const lotesParaReserva: LoteParaReserva[] = [];
    let quantidadeRestante = material.quantidade_kg;

    for (const lote of lotes) {
      if (quantidadeRestante <= 0) break;

      const quantidadeDoLote = Math.min(quantidadeRestante, lote.quantidade_disponivel_kg);

      lotesParaReserva.push({
        lote_id: lote.id,
        quantidade_kg: quantidadeDoLote,
        custo_por_kg: lote.custo_real_por_kg,
        quantidade_disponivel_antes: lote.quantidade_disponivel_kg,
        data_entrada: lote.data_entrada,
      });

      quantidadeRestante -= quantidadeDoLote;
    }

    // Pegar informações do PRIMEIRO lote (próximo a ser usado no PEPS)
    const proximoLote = lotes.length > 0 ? lotes[0] : null;
    const custoProximoLote = proximoLote ? proximoLote.custo_real_por_kg : 0;

    // Verificar se o custo do próximo lote difere do custo administrativo
    if (material.custo_administrativo > 0 && custoProximoLote > 0) {
      const diferenca = custoProximoLote - material.custo_administrativo;
      const diferencaPercentual = (diferenca / material.custo_administrativo) * 100;

      // Se diferença maior que 0.5%, gerar alerta
      if (Math.abs(diferencaPercentual) > 0.5) {
        alertas.push({
          tipo: 'mudanca_custo',
          materia_prima_id: material.materia_prima_id,
          materia_prima_nome: material.materia_prima_nome,
          custo_atual: material.custo_administrativo,
          custo_novo: custoProximoLote,
          diferenca_percentual: diferencaPercentual,
          lote_data_entrada: proximoLote?.data_entrada,
          lote_quantidade_disponivel: proximoLote?.quantidade_disponivel_kg,
        });
        temMudancaCusto = true;
      }
    }

    reservas.push({
      materia_prima_id: material.materia_prima_id,
      materia_prima_nome: material.materia_prima_nome,
      quantidade_total_kg: Math.min(material.quantidade_kg, total_disponivel),
      lotes: lotesParaReserva,
      custo_proximo_lote: custoProximoLote,
      custo_administrativo: material.custo_administrativo,
    });
  }

  return {
    sucesso: materiaisFaltantes.length === 0,
    alertas,
    reservas,
    resumo: {
      tem_estoque_suficiente: materiaisFaltantes.length === 0,
      tem_mudanca_custo: temMudancaCusto,
      materiais_faltantes: materiaisFaltantes,
    },
  };
}

/**
 * Efetua a reserva de lotes para um pedido
 */
export async function reservarLotesParaPedido(
  pedidoId: string,
  pedidoItemId: string | null,
  reservas: ResultadoProvisao['reservas']
): Promise<{ error: string | null }> {
  try {
    for (const reserva of reservas) {
      for (const lote of reserva.lotes) {
        // Criar registro de reserva
        const { error: insertError } = await supabase
          .from('reservas_estoque')
          .insert([{
            pedido_id: pedidoId,
            pedido_item_id: pedidoItemId,
            lote_id: lote.lote_id,
            materia_prima_id: reserva.materia_prima_id,
            quantidade_reservada_kg: lote.quantidade_kg,
            custo_unitario: lote.custo_por_kg,
            status: 'reservado',
          }]);

        if (insertError) {
          console.error('Erro ao criar reserva:', insertError);
          return { error: insertError.message };
        }

        // Atualizar quantidade_reservada no lote
        const { data: loteAtual } = await supabase
          .from('lotes_estoque')
          .select('quantidade_reservada_kg')
          .eq('id', lote.lote_id)
          .single();

        const novaReserva = (loteAtual?.quantidade_reservada_kg || 0) + lote.quantidade_kg;

        const { error: updateError } = await supabase
          .from('lotes_estoque')
          .update({ quantidade_reservada_kg: novaReserva })
          .eq('id', lote.lote_id);

        if (updateError) {
          console.error('Erro ao atualizar reserva no lote:', updateError);
          return { error: updateError.message };
        }
      }
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao reservar lotes' };
  }
}

/**
 * Cancela reservas de um pedido (libera os lotes)
 */
export async function cancelarReservasPedido(pedidoId: string): Promise<{ error: string | null }> {
  try {
    // Buscar reservas ativas
    const { data: reservas, error: fetchError } = await supabase
      .from('reservas_estoque')
      .select('*')
      .eq('pedido_id', pedidoId)
      .eq('status', 'reservado');

    if (fetchError) return { error: fetchError.message };

    for (const reserva of reservas || []) {
      // Reduzir quantidade_reservada no lote
      const { data: loteAtual } = await supabase
        .from('lotes_estoque')
        .select('quantidade_reservada_kg')
        .eq('id', reserva.lote_id)
        .single();

      const novaReserva = Math.max(0, (loteAtual?.quantidade_reservada_kg || 0) - reserva.quantidade_reservada_kg);

      await supabase
        .from('lotes_estoque')
        .update({ quantidade_reservada_kg: novaReserva })
        .eq('id', reserva.lote_id);

      // Marcar reserva como cancelada
      await supabase
        .from('reservas_estoque')
        .update({ status: 'cancelado', cancelado_at: new Date().toISOString() })
        .eq('id', reserva.id);
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao cancelar reservas' };
  }
}

/**
 * Consome reservas de um pedido (converte reserva em baixa efetiva)
 */
export async function consumirReservasPedido(
  pedidoId: string,
  ordemProducaoId: string
): Promise<{ error: string | null; alertas?: AlertaMudancaLote[] }> {
  try {
    const alertas: AlertaMudancaLote[] = [];

    // Buscar reservas ativas
    const { data: reservas, error: fetchError } = await supabase
      .from('reservas_estoque')
      .select('*, lote:lotes_estoque(*, materia_prima:materias_primas(*))')
      .eq('pedido_id', pedidoId)
      .eq('status', 'reservado');

    if (fetchError) return { error: fetchError.message };

    for (const reserva of reservas || []) {
      // Consumir do lote
      const { data: loteAtual } = await supabase
        .from('lotes_estoque')
        .select('quantidade_atual_kg, quantidade_reservada_kg')
        .eq('id', reserva.lote_id)
        .single();

      const novaQuantidade = (loteAtual?.quantidade_atual_kg || 0) - reserva.quantidade_reservada_kg;
      const novaReserva = Math.max(0, (loteAtual?.quantidade_reservada_kg || 0) - reserva.quantidade_reservada_kg);
      const loteEsgotado = novaQuantidade <= 0;

      await supabase
        .from('lotes_estoque')
        .update({
          quantidade_atual_kg: Math.max(0, novaQuantidade),
          quantidade_reservada_kg: novaReserva,
          status: loteEsgotado ? 'esgotado' : 'ativo',
        })
        .eq('id', reserva.lote_id);

      // Criar movimentação
      await supabase.from('movimentacoes_estoque').insert([{
        tipo: 'producao',
        tipo_item: 'materia_prima',
        item_id: reserva.materia_prima_id,
        quantidade_anterior: loteAtual?.quantidade_atual_kg || 0,
        quantidade_movimentada: -reserva.quantidade_reservada_kg,
        quantidade_atual: Math.max(0, novaQuantidade),
        unidade: 'kg',
        motivo: 'producao',
        documento_referencia: `OP: ${ordemProducaoId}`,
        lote_id: reserva.lote_id,
        custo_real_unitario: reserva.custo_unitario,
        observacoes: 'Consumo de reserva - Produção iniciada',
      }]);

      // Marcar reserva como consumida
      await supabase
        .from('reservas_estoque')
        .update({ status: 'consumido', consumido_at: new Date().toISOString() })
        .eq('id', reserva.id);

      // Atualizar estoque da matéria-prima (baseado na soma dos lotes)
      const { data: lotes } = await supabase
        .from('lotes_estoque')
        .select('quantidade_atual_kg, custo_real_por_kg, data_entrada')
        .eq('materia_prima_id', reserva.materia_prima_id)
        .eq('status', 'ativo')
        .order('data_entrada', { ascending: true });

      const novoEstoque = (lotes || []).reduce((sum, l) => sum + (l.quantidade_atual_kg || 0), 0);

      await supabase
        .from('materias_primas')
        .update({ estoque_atual: novoEstoque })
        .eq('id', reserva.materia_prima_id);

      // Se o lote esgotou, verificar se o próximo lote tem custo diferente
      if (loteEsgotado && lotes && lotes.length > 0) {
        const proximoLote = lotes[0];
        const materiaPrima = reserva.lote?.materia_prima;
        const custoAtual = materiaPrima?.custo_por_unidade || 0;

        // Se o próximo lote tem custo diferente do custo atual da MP, gerar alerta
        if (proximoLote.custo_real_por_kg !== custoAtual && custoAtual > 0) {
          const diferencaPercentual = ((proximoLote.custo_real_por_kg - custoAtual) / custoAtual) * 100;

          alertas.push({
            materia_prima_id: reserva.materia_prima_id,
            materia_prima_nome: materiaPrima?.nome || 'Material',
            lote_anterior_id: reserva.lote_id,
            lote_anterior_custo: reserva.custo_unitario,
            lote_novo_id: proximoLote.data_entrada, // Usando data como identificador
            lote_novo_custo: proximoLote.custo_real_por_kg,
            custo_administrativo_atual: custoAtual,
            diferenca_percentual: diferencaPercentual,
            estoque_restante_lote_novo: proximoLote.quantidade_atual_kg,
          });
        }
      }
    }

    return { error: null, alertas: alertas.length > 0 ? alertas : undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao consumir reservas' };
  }
}

