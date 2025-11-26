import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Pedido, PedidoCompleto } from '../lib/database.types';
import {
  darBaixaProdutoRevenda,
  simularProvisao,
  reservarLotesParaPedido,
  cancelarReservasPedido,
  type ResultadoProvisao
} from '../lib/estoque';
import { calcularConsumoMaterial } from '../lib/calculos';

// Locks globais para evitar criação duplicada de ordens de produção
// Devem ficar fora do hook para persistir entre renderizações
const pedidosEmProcessamento = new Set<string>();
const itensComOrdemEmCriacao = new Set<string>(); // Lock por pedido_item_id

// Função auxiliar para criar ordem de produção de forma segura (evita duplicação)
async function criarOrdemProducaoSegura(
  pedidoId: string,
  pedidoItemId: string,
  produtoId: string,
  produtoNome: string,
  totalMetros: number,
  numeroPedido: string,
  dataProgramada: string | null,
  instrucoesTecnicas: string | null,
  quantidadePecas: number | null = null,
  comprimentoCadaMm: number | null = null
): Promise<{ success: boolean; error?: string }> {
  // Lock por item - se já está criando ordem para este item, ignorar
  if (itensComOrdemEmCriacao.has(pedidoItemId)) {
    console.warn(`⚠️ Ordem de produção já está sendo criada para item ${pedidoItemId}, ignorando`);
    return { success: false, error: 'Já está criando ordem para este item' };
  }

  itensComOrdemEmCriacao.add(pedidoItemId);

  try {
    // Verificar IMEDIATAMENTE antes de criar se já existe ordem para este item
    const { data: ordemExistente, error: checkError } = await supabase
      .from('ordens_producao')
      .select('id, numero_op')
      .eq('pedido_item_id', pedidoItemId)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar ordem existente:', checkError);
    }

    if (ordemExistente) {
      console.warn(`⚠️ Ordem de produção ${ordemExistente.numero_op} já existe para item ${pedidoItemId}, não criando duplicada`);
      return { success: false, error: 'Ordem já existe' };
    }

    // Gerar número da ordem de produção
    const { count: countOp } = await supabase
      .from('ordens_producao')
      .select('*', { count: 'exact', head: true });

    const numeroOp = `OP-${String((countOp || 0) + 1).padStart(4, '0')}`;

    // Criar ordem de produção
    const { error: ordemError } = await supabase
      .from('ordens_producao')
      .insert([{
        numero_op: numeroOp,
        pedido_id: pedidoId,
        pedido_item_id: pedidoItemId,
        produto_id: produtoId,
        quantidade_produzir_metros: totalMetros,
        quantidade_pecas: quantidadePecas,
        comprimento_cada_mm: comprimentoCadaMm,
        status: 'aguardando',
        data_programada: dataProgramada,
        instrucoes_tecnicas: instrucoesTecnicas,
        observacoes: `Gerada automaticamente do pedido ${numeroPedido}`,
      }]);

    if (ordemError) {
      // Verificar se é erro de duplicação (constraint violation)
      if (ordemError.code === '23505' || ordemError.message?.includes('duplicate') || ordemError.message?.includes('unique')) {
        console.warn(`⚠️ Ordem de produção duplicada detectada pelo banco para item ${pedidoItemId}`);
        return { success: false, error: 'Duplicação detectada pelo banco' };
      }
      console.error(`Erro ao criar ordem de produção para ${produtoNome}:`, ordemError);
      return { success: false, error: ordemError.message };
    }

    console.log(`✅ Ordem de produção criada: ${numeroOp} para ${produtoNome} (${totalMetros}m)`);
    return { success: true };
  } finally {
    // Sempre remover o lock no final
    itensComOrdemEmCriacao.delete(pedidoItemId);
  }
}

export function usePedidos() {
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPedidos() {
    try {
      setLoading(true);
      setError(null);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      }
      
      // Buscar pedidos com cliente e itens
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(*),
          itens:pedidos_itens(
            *,
            produto:produtos(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar pedidos:', error);
        
        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
          throw new Error('Credenciais do Supabase não configuradas ou inválidas. Configure o arquivo .env.local com suas credenciais.');
        }
        
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          throw new Error('Tabela "pedidos" não encontrada. Execute o schema SQL no Supabase.');
        }
        
        throw error;
      }
      
      setPedidos(data || []);
      console.log(`✅ ${data?.length || 0} pedido(s) carregado(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar pedidos';
      setError(errorMessage);
      console.error('Erro ao carregar pedidos:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPedidos();
  }, []);

  async function createPedido(pedido: any) {
    try {
      // Gerar número do pedido
      const { count } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true });
      
      const numeroPedido = `PED-${String((count || 0) + 1).padStart(4, '0')}`;
      
      // Separar itens do pedido
      const { itens, ...pedidoData } = pedido;
      
      // Preparar dados do pedido com tipos corretos
      const pedidoParaInserir: any = {
        cliente_id: pedidoData.cliente_id,
        data_pedido: pedidoData.data_pedido,
        tipo: pedidoData.tipo || 'orcamento',
        status: pedidoData.status || 'pendente',
        valor_produtos: Number(pedidoData.valor_produtos) || 0,
        valor_frete: Number(pedidoData.valor_frete) || 0,
        valor_desconto: Number(pedidoData.valor_desconto) || 0,
        valor_total: Number(pedidoData.valor_total) || 0,
        numero_pedido: numeroPedido,
        prazo_entrega_dias: pedidoData.prazo_entrega_dias ? Number(pedidoData.prazo_entrega_dias) : null,
        forma_pagamento: pedidoData.forma_pagamento || null,
        condicoes_pagamento: pedidoData.condicoes_pagamento || null,
        observacoes: pedidoData.observacoes || null,
        observacoes_internas: pedidoData.observacoes_internas || null,
        vendedor_id: pedidoData.vendedor_id || null,
        // Campos de pagamento para NF-e
        tipo_cobranca: pedidoData.tipo_cobranca || null,
        banco_id: pedidoData.banco_id ? Number(pedidoData.banco_id) : null,
        data_vencimento: pedidoData.data_vencimento || null,
        // Campos de transporte
        transportadora_id: pedidoData.transportadora_id || null,
        tipo_frete: pedidoData.tipo_frete || null,
      };
      
      // Criar pedido
      const { data: pedidoCriado, error: pedidoError } = await supabase
        .from('pedidos')
        .insert([pedidoParaInserir])
        .select()
        .single();

      if (pedidoError) {
        console.error('Erro ao criar pedido:', pedidoError);
        console.error('Dados sendo inseridos:', pedidoParaInserir);
        
        // Melhorar mensagem de erro
        let errorMessage = pedidoError.message || 'Erro ao criar pedido';
        
        // Verificar se é erro de constraint (status inválido)
        if (pedidoError.message?.includes('check constraint') || pedidoError.message?.includes('violates check constraint')) {
          errorMessage = `Status ou tipo inválido. Status permitidos: pendente, aprovado, producao, finalizado, entregue, cancelado, recusado. Status enviado: ${pedidoParaInserir.status}`;
        }
        
        // Verificar se é erro de foreign key
        if (pedidoError.message?.includes('foreign key') || pedidoError.code === '23503') {
          errorMessage = `Cliente não encontrado. Verifique se o cliente existe no banco de dados.`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Se tiver itens, criar eles
      if (itens && itens.length > 0 && pedidoCriado) {
        const itensParaInserir = itens.map((item: any) => ({
          pedido_id: pedidoCriado.id,
          produto_id: item.produto_id,
          tipo_produto: item.tipo_produto,
          quantidade_pecas: item.quantidade_pecas ? Number(item.quantidade_pecas) : null,
          comprimento_cada_mm: item.comprimento_cada_mm ? Number(item.comprimento_cada_mm) : null,
          total_calculado: item.total_calculado ? Number(item.total_calculado) : null,
          quantidade_simples: item.quantidade_simples ? Number(item.quantidade_simples) : null,
          unidade_medida: item.unidade_medida,
          preco_unitario: Number(item.preco_unitario) || 0,
          subtotal: Number(item.subtotal) || 0,
          observacoes: item.observacoes || null,
        }));
        
        const { error: itensError } = await supabase
          .from('pedidos_itens')
          .insert(itensParaInserir);
          
        if (itensError) {
          console.error('Erro ao criar itens do pedido:', itensError);
          // Deletar o pedido criado se os itens falharem
          await supabase
            .from('pedidos')
            .delete()
            .eq('id', pedidoCriado.id);
          throw new Error(`Erro ao adicionar itens ao pedido: ${itensError.message}`);
        }

        // Se o pedido for aprovado ou confirmado, processar estoque e criar ordens de produção
        const pedidoAprovado = pedidoParaInserir.status === 'aprovado' || pedidoParaInserir.tipo === 'pedido_confirmado';
        
        if (pedidoAprovado) {
          // Buscar itens criados com produtos relacionados
          const { data: itensComProdutos, error: itensComProdutosError } = await supabase
            .from('pedidos_itens')
            .select(`
              *,
              produto:produtos(*)
            `)
            .eq('pedido_id', pedidoCriado.id);

          if (!itensComProdutosError && itensComProdutos) {
            // Processar cada item do pedido
            // A verificação de duplicação é feita na função criarOrdemProducaoSegura
            for (const itemPedido of itensComProdutos) {
              const produto = itemPedido.produto as any;

              if (!produto) continue;

              if (produto.tipo === 'revenda') {
                // Dar baixa imediata no estoque de produtos revenda
                const quantidade = itemPedido.quantidade_simples 
                  ? Number(itemPedido.quantidade_simples) 
                  : 0;

                if (quantidade > 0) {
                  const { error: baixaError } = await darBaixaProdutoRevenda(
                    produto.id,
                    quantidade,
                    'venda',
                    `Pedido ${pedidoParaInserir.numero_pedido}`,
                    `Venda do pedido ${pedidoParaInserir.numero_pedido}`
                  );

                  if (baixaError) {
                    console.error(`Erro ao dar baixa no produto ${produto.nome}:`, baixaError);
                    console.warn(`Atenção: Estoque do produto ${produto.nome} não foi atualizado`);
                  }
                }
              } else if (produto.tipo === 'fabricado') {
                // Criar ordem de produção para produtos fabricados
                const totalMetros = itemPedido.total_calculado
                  ? Number(itemPedido.total_calculado)
                  : (itemPedido.quantidade_simples ? Number(itemPedido.quantidade_simples) : 0);

                if (totalMetros > 0) {
                  // Calcular data programada (se houver prazo de entrega e data do pedido)
                  let dataProgramada: string | null = null;
                  if (pedidoParaInserir.prazo_entrega_dias && pedidoParaInserir.data_pedido) {
                    const dataPedido = new Date(pedidoParaInserir.data_pedido);
                    dataPedido.setDate(dataPedido.getDate() + pedidoParaInserir.prazo_entrega_dias);
                    dataProgramada = dataPedido.toISOString().split('T')[0];
                  }

                  // Usar função segura que evita duplicação
                  await criarOrdemProducaoSegura(
                    pedidoCriado.id,
                    itemPedido.id,
                    produto.id,
                    produto.nome,
                    totalMetros,
                    pedidoParaInserir.numero_pedido,
                    dataProgramada,
                    produto.instrucoes_tecnicas || null,
                    itemPedido.quantidade_pecas ? Number(itemPedido.quantidade_pecas) : null,
                    itemPedido.comprimento_cada_mm ? Number(itemPedido.comprimento_cada_mm) : null
                  );
                }
              }
            }
          }
        }
      }
      
      await fetchPedidos();
      return { data: pedidoCriado, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao criar pedido' };
    }
  }

  async function updatePedido(id: string, pedido: Partial<Pedido>) {
    try {
      console.log('Atualizando pedido:', id, pedido);

      // Verificar se já está processando este pedido (evitar race condition)
      if (pedidosEmProcessamento.has(id)) {
        console.warn('⚠️ Pedido já está sendo processado, ignorando chamada duplicada:', id);
        return { data: null, error: 'Pedido já está sendo processado' };
      }

      // Marcar pedido como em processamento
      pedidosEmProcessamento.add(id);

      // Buscar pedido atual para verificar se está sendo aprovado
      const { data: pedidoAtual, error: fetchError } = await supabase
        .from('pedidos')
        .select(`
          *,
          itens:pedidos_itens(
            *,
            produto:produtos(*)
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar pedido atual:', fetchError);
      }

      // Verificar se o pedido está sendo aprovado (status mudando para 'aprovado' ou tipo para 'pedido_confirmado')
      const estavaPendente = pedidoAtual && (pedidoAtual.status === 'pendente' || pedidoAtual.tipo === 'orcamento');
      const sendoAprovado = pedido.status === 'aprovado' || pedido.tipo === 'pedido_confirmado';
      const pedidoSendoAprovado = estavaPendente && sendoAprovado;

      // Atualizar pedido
      const { data, error } = await supabase
        .from('pedidos')
        .update(pedido)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar pedido:', error);
        console.error('Dados sendo atualizados:', pedido);
        
        // Melhorar mensagem de erro
        let errorMessage = error.message || 'Erro ao atualizar pedido';
        
        // Verificar se é erro de constraint (status inválido)
        if (error.message?.includes('check constraint') || error.message?.includes('violates check constraint')) {
          errorMessage = `Status ou tipo inválido. Status permitidos: pendente, aprovado, producao, finalizado, entregue, cancelado, recusado. Status enviado: ${pedido.status}`;
        }
        
        throw new Error(errorMessage);
      }

      // Se o pedido foi aprovado, processar estoque e criar ordens de produção
      if (pedidoSendoAprovado) {
        // Buscar número do pedido atualizado
        const numeroPedido = data?.numero_pedido || pedidoAtual?.numero_pedido;

        // Buscar itens do pedido com produtos relacionados
        const { data: itensComProdutos, error: itensComProdutosError } = await supabase
          .from('pedidos_itens')
          .select(`
            *,
            produto:produtos(*)
          `)
          .eq('pedido_id', id);

        if (!itensComProdutosError && itensComProdutos && numeroPedido) {
          // Processar cada item do pedido
          // A verificação de duplicação é feita na função criarOrdemProducaoSegura
          for (const itemPedido of itensComProdutos) {
            const produto = itemPedido.produto as any;

            if (!produto) continue;

            if (produto.tipo === 'revenda') {
              // Dar baixa imediata no estoque de produtos revenda
              const quantidade = itemPedido.quantidade_simples 
                ? Number(itemPedido.quantidade_simples) 
                : 0;

              if (quantidade > 0) {
                const { error: baixaError } = await darBaixaProdutoRevenda(
                  produto.id,
                  quantidade,
                  'venda',
                  `Pedido ${numeroPedido}`,
                  `Venda do pedido ${numeroPedido}`
                );

                if (baixaError) {
                  console.error(`Erro ao dar baixa no produto ${produto.nome}:`, baixaError);
                  console.warn(`Atenção: Estoque do produto ${produto.nome} não foi atualizado`);
                }
              }
            } else if (produto.tipo === 'fabricado') {
              // Criar ordem de produção para produtos fabricados
              // Calcular total de metros: usar total_calculado se existir (venda composta),
              // senão usar quantidade_simples (venda simples por metro)
              const totalMetros = itemPedido.total_calculado
                ? Number(itemPedido.total_calculado)
                : (itemPedido.quantidade_simples ? Number(itemPedido.quantidade_simples) : 0);

              if (totalMetros > 0) {
                // Calcular data programada (se houver prazo de entrega e data do pedido)
                let dataProgramada: string | null = null;
                const pedidoFinal = data || pedidoAtual;
                if (pedidoFinal?.prazo_entrega_dias && pedidoFinal?.data_pedido) {
                  const dataPedido = new Date(pedidoFinal.data_pedido);
                  dataPedido.setDate(dataPedido.getDate() + pedidoFinal.prazo_entrega_dias);
                  dataProgramada = dataPedido.toISOString().split('T')[0];
                } else if (pedidoFinal?.data_entrega_prevista) {
                  dataProgramada = pedidoFinal.data_entrega_prevista.split('T')[0];
                }

                // Usar função segura que evita duplicação
                await criarOrdemProducaoSegura(
                  id,
                  itemPedido.id,
                  produto.id,
                  produto.nome,
                  totalMetros,
                  numeroPedido,
                  dataProgramada,
                  produto.instrucoes_tecnicas || null,
                  itemPedido.quantidade_pecas ? Number(itemPedido.quantidade_pecas) : null,
                  itemPedido.comprimento_cada_mm ? Number(itemPedido.comprimento_cada_mm) : null
                );
              }
            }
          }
        }
      }


      await fetchPedidos();

      // Remover pedido do processamento
      pedidosEmProcessamento.delete(id);

      return { data, error: null };
    } catch (err) {
      // Remover pedido do processamento em caso de erro
      pedidosEmProcessamento.delete(id);

      return { data: null, error: err instanceof Error ? err.message : 'Erro ao atualizar pedido' };
    }
  }

  async function deletePedido(id: string) {
    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPedidos();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir pedido' };
    }
  }

  /**
   * Simula a provisao de material para um pedido
   * Retorna alertas de estoque insuficiente e mudanca de custo
   */
  async function simularProvisaoPedido(pedidoId: string): Promise<{
    provisao: ResultadoProvisao | null;
    error: string | null;
  }> {
    try {
      // Buscar itens do pedido com produtos e receitas
      const { data: itens, error: itensError } = await supabase
        .from('pedidos_itens')
        .select(`
          *,
          produto:produtos(
            *,
            receitas(
              *,
              materia_prima:materias_primas(*)
            )
          )
        `)
        .eq('pedido_id', pedidoId);

      if (itensError) {
        return { provisao: null, error: itensError.message };
      }

      // Calcular materiais necessarios
      const materiaisNecessarios: Array<{
        materia_prima_id: string;
        materia_prima_nome: string;
        quantidade_kg: number;
        custo_administrativo: number;
      }> = [];

      // Mapa para acumular quantidades por materia-prima
      const mapaQuantidades: Record<string, {
        materia_prima_id: string;
        materia_prima_nome: string;
        quantidade_kg: number;
        custo_administrativo: number;
      }> = {};

      for (const item of itens || []) {
        const produto = item.produto as any;
        if (!produto || produto.tipo !== 'fabricado') continue;

        // Calcular total de metros
        const totalMetros = item.total_calculado
          ? Number(item.total_calculado)
          : (item.quantidade_simples ? Number(item.quantidade_simples) : 0);

        if (totalMetros <= 0) continue;

        // Processar cada receita do produto
        const receitas = produto.receitas || [];
        for (const receita of receitas) {
          if (!receita.materia_prima) continue;

          const consumoKg = calcularConsumoMaterial(totalMetros, receita.consumo_por_metro_g);
          if (consumoKg <= 0) continue;

          const mpId = receita.materia_prima_id;
          if (mapaQuantidades[mpId]) {
            mapaQuantidades[mpId].quantidade_kg += consumoKg;
          } else {
            mapaQuantidades[mpId] = {
              materia_prima_id: mpId,
              materia_prima_nome: receita.materia_prima.nome,
              quantidade_kg: consumoKg,
              custo_administrativo: receita.materia_prima.custo_por_unidade || 0,
            };
          }
        }
      }

      // Converter mapa para array
      for (const mp of Object.values(mapaQuantidades)) {
        materiaisNecessarios.push(mp);
      }

      if (materiaisNecessarios.length === 0) {
        return {
          provisao: {
            sucesso: true,
            alertas: [],
            reservas: [],
            resumo: {
              tem_estoque_suficiente: true,
              tem_mudanca_custo: false,
              materiais_faltantes: [],
            },
          },
          error: null,
        };
      }

      // Simular provisao
      const provisao = await simularProvisao(materiaisNecessarios);

      return { provisao, error: null };
    } catch (err) {
      return { provisao: null, error: err instanceof Error ? err.message : 'Erro ao simular provisao' };
    }
  }

  /**
   * Aprova pedido e reserva os lotes
   */
  async function aprovarPedidoComReserva(
    pedidoId: string,
    provisao: ResultadoProvisao
  ): Promise<{ error: string | null }> {
    try {
      // Reservar lotes
      if (provisao.reservas.length > 0) {
        const { error: reservaError } = await reservarLotesParaPedido(
          pedidoId,
          null, // pedidoItemId - null para reservar para o pedido inteiro
          provisao.reservas
        );

        if (reservaError) {
          console.error('Erro ao reservar lotes:', reservaError);
          // Nao bloquear aprovacao por erro de reserva
        }
      }

      // Aprovar pedido (isso vai criar as ordens de producao)
      // Atualiza tanto o status para 'aprovado' quanto o tipo para 'pedido_confirmado'
      const { error } = await updatePedido(pedidoId, {
        status: 'aprovado',
        tipo: 'pedido_confirmado'
      });

      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao aprovar pedido' };
    }
  }

  /**
   * Cancela reservas de um pedido (quando cancela ou recusa)
   */
  async function cancelarReservas(pedidoId: string): Promise<{ error: string | null }> {
    return await cancelarReservasPedido(pedidoId);
  }

  return {
    pedidos,
    loading,
    error,
    refresh: fetchPedidos,
    create: createPedido,
    update: updatePedido,
    delete: deletePedido,
    simularProvisaoPedido,
    aprovarPedidoComReserva,
    cancelarReservas,
  };
}

