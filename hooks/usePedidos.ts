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
import { asaasClient } from '../lib/asaas';

// Locks globais para evitar criação duplicada de ordens de produção
// Devem ficar fora do hook para persistir entre renderizações
const pedidosEmProcessamento = new Set<string>();
const pedidosComOrdemEmCriacao = new Set<string>(); // Lock por pedido_id

// Interface para item fabricado a ser incluído na OP
interface ItemFabricadoParaOP {
  pedido_item_id: string;
  produto_id: string;
  quantidade_metros: number;
  quantidade_pecas?: number;
  comprimento_cada_mm?: number;
}

// Função auxiliar para criar UMA ÚNICA ordem de produção por PEDIDO (não por item)
// Agora também cria os itens individuais na tabela ordens_producao_itens
async function criarOrdemProducaoPorPedido(
  pedidoId: string,
  numeroPedido: string,
  dataProgramada: string | null,
  itensFabricados: ItemFabricadoParaOP[]
): Promise<{ success: boolean; error?: string; ordemId?: string }> {
  // Lock por pedido - se já está criando ordem para este pedido, ignorar
  if (pedidosComOrdemEmCriacao.has(pedidoId)) {
    console.warn(`⚠️ Ordem de produção já está sendo criada para pedido ${pedidoId}, ignorando`);
    return { success: false, error: 'Já está criando ordem para este pedido' };
  }

  pedidosComOrdemEmCriacao.add(pedidoId);

  try {
    // Verificar se já existe ordem para este PEDIDO
    const { data: ordemExistente, error: checkError } = await supabase
      .from('ordens_producao')
      .select('id, numero_op')
      .eq('pedido_id', pedidoId)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar ordem existente:', checkError);
    }

    if (ordemExistente) {
      console.warn(`⚠️ Ordem de produção ${ordemExistente.numero_op} já existe para pedido ${pedidoId}, não criando duplicada`);
      return { success: false, error: 'Ordem já existe para este pedido' };
    }

    // Calcular total de metros de todos os itens
    const totalMetrosGeral = itensFabricados.reduce((acc, item) => acc + item.quantidade_metros, 0);

    // Pegar referência do primeiro item (retrocompatibilidade)
    const primeiroItem = itensFabricados[0];

    // Gerar número da ordem de produção
    const { count: countOp } = await supabase
      .from('ordens_producao')
      .select('*', { count: 'exact', head: true });

    const numeroOp = `OP-${String((countOp || 0) + 1).padStart(4, '0')}`;

    // Criar ordem de produção ÚNICA para o pedido
    const { data: ordemCriada, error: ordemError } = await supabase
      .from('ordens_producao')
      .insert([{
        numero_op: numeroOp,
        pedido_id: pedidoId,
        pedido_item_id: primeiroItem?.pedido_item_id || null,
        produto_id: primeiroItem?.produto_id || null,
        quantidade_produzir_metros: totalMetrosGeral,
        status: 'aguardando',
        data_programada: dataProgramada,
        observacoes: `Ordem de produção do pedido ${numeroPedido}${itensFabricados.length > 1 ? ` (${itensFabricados.length} produtos)` : ''}`,
      }])
      .select('id')
      .single();

    if (ordemError) {
      // Verificar se é erro de duplicação (constraint violation)
      if (ordemError.code === '23505' || ordemError.message?.includes('duplicate') || ordemError.message?.includes('unique')) {
        console.warn(`⚠️ Ordem de produção duplicada detectada pelo banco para pedido ${pedidoId}`);
        return { success: false, error: 'Duplicação detectada pelo banco' };
      }
      console.error(`Erro ao criar ordem de produção para pedido ${numeroPedido}:`, ordemError);
      return { success: false, error: ordemError.message };
    }

    // Criar os itens individuais da OP na tabela ordens_producao_itens
    if (ordemCriada && itensFabricados.length > 0) {
      const itensParaInserir = itensFabricados.map(item => ({
        ordem_producao_id: ordemCriada.id,
        pedido_item_id: item.pedido_item_id,
        produto_id: item.produto_id,
        quantidade_metros: item.quantidade_metros,
        quantidade_pecas: item.quantidade_pecas || null,
        comprimento_cada_mm: item.comprimento_cada_mm || null,
        status: 'aguardando',
      }));

      const { error: itensError } = await supabase
        .from('ordens_producao_itens')
        .insert(itensParaInserir);

      if (itensError) {
        console.error(`Erro ao criar itens da ordem de produção ${numeroOp}:`, itensError);
        // Não falhar a criação da OP por erro nos itens, mas logar
      } else {
        console.log(`✅ ${itensFabricados.length} item(ns) criado(s) para OP ${numeroOp}`);
      }
    }

    console.log(`✅ Ordem de produção criada: ${numeroOp} para pedido ${numeroPedido} (${totalMetrosGeral.toFixed(2)}m total)`);
    return { success: true, ordemId: ordemCriada?.id };
  } finally {
    // Sempre remover o lock no final
    pedidosComOrdemEmCriacao.delete(pedidoId);
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
        // Campos de Volume/Peso para NF-e
        quantidade_volumes: pedidoData.quantidade_volumes ? Number(pedidoData.quantidade_volumes) : 1,
        especie_volumes: pedidoData.especie_volumes || 'PALLET',
        marca_volumes: pedidoData.marca_volumes || '1',
        numeracao_volumes: pedidoData.numeracao_volumes || '1',
        peso_bruto_kg: pedidoData.peso_bruto_kg ? Number(pedidoData.peso_bruto_kg) : null,
        peso_liquido_kg: pedidoData.peso_liquido_kg ? Number(pedidoData.peso_liquido_kg) : null,
        // Dados Fiscais
        cfop: pedidoData.cfop || '5101',
        dados_adicionais_nfe: pedidoData.dados_adicionais_nfe || null,
        // Campos de cobrança Asaas (processados na aprovação)
        gerar_cobranca_asaas: pedidoData.gerar_cobranca_asaas || false,
        numero_parcelas: pedidoData.numero_parcelas ? Number(pedidoData.numero_parcelas) : 1,
        desconto_antecipado_valor: pedidoData.desconto_antecipado_valor ? Number(pedidoData.desconto_antecipado_valor) : null,
        desconto_antecipado_dias: pedidoData.desconto_antecipado_dias ? Number(pedidoData.desconto_antecipado_dias) : null,
        desconto_antecipado_tipo: pedidoData.desconto_antecipado_tipo || null,
        juros_atraso: pedidoData.juros_atraso ? Number(pedidoData.juros_atraso) : null,
        multa_atraso: pedidoData.multa_atraso ? Number(pedidoData.multa_atraso) : null,
        multa_atraso_tipo: pedidoData.multa_atraso_tipo || null,
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
        // Filtrar itens sem produto_id (proteção extra)
        const itensValidos = itens.filter((item: any) => item.produto_id && item.produto_id.trim() !== '');

        if (itensValidos.length === 0) {
          throw new Error('Nenhum item válido com produto selecionado');
        }

        const itensParaInserir = itensValidos.map((item: any) => ({
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
          // Campos de frete (distribuição manual CIF)
          frete_unitario: item.frete_unitario ? Number(item.frete_unitario) : null,
          frete_total_item: item.frete_total_item ? Number(item.frete_total_item) : null,
          preco_unitario_com_frete: item.preco_unitario_com_frete ? Number(item.preco_unitario_com_frete) : null,
          subtotal_com_frete: item.subtotal_com_frete ? Number(item.subtotal_com_frete) : null,
        }));

        console.log('📦 Itens a inserir:', JSON.stringify(itensParaInserir, null, 2));

        const { error: itensError } = await supabase
          .from('pedidos_itens')
          .insert(itensParaInserir);

        if (itensError) {
          console.error('Erro ao criar itens do pedido:', itensError);
          console.error('Dados enviados:', itensParaInserir);
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
            // Coletar itens fabricados para criar OP
            const itensFabricados: ItemFabricadoParaOP[] = [];

            // Processar cada item do pedido
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
                // Coletar item fabricado para a OP
                const totalMetros = itemPedido.total_calculado
                  ? Number(itemPedido.total_calculado)
                  : (itemPedido.quantidade_simples ? Number(itemPedido.quantidade_simples) : 0);

                if (totalMetros > 0) {
                  itensFabricados.push({
                    pedido_item_id: itemPedido.id,
                    produto_id: produto.id,
                    quantidade_metros: totalMetros,
                    quantidade_pecas: itemPedido.quantidade_pecas ? Number(itemPedido.quantidade_pecas) : undefined,
                    comprimento_cada_mm: itemPedido.comprimento_cada_mm ? Number(itemPedido.comprimento_cada_mm) : undefined,
                  });
                }
              }
            }

            // Criar UMA ÚNICA ordem de produção para todo o pedido (se houver itens fabricados)
            if (itensFabricados.length > 0) {
              // Calcular data programada (se houver prazo de entrega e data do pedido)
              let dataProgramada: string | null = null;
              if (pedidoParaInserir.prazo_entrega_dias && pedidoParaInserir.data_pedido) {
                const dataPedido = new Date(pedidoParaInserir.data_pedido);
                dataPedido.setDate(dataPedido.getDate() + pedidoParaInserir.prazo_entrega_dias);
                dataProgramada = dataPedido.toISOString().split('T')[0];
              }

              // Criar ordem de produção única para o pedido com todos os itens
              await criarOrdemProducaoPorPedido(
                pedidoCriado.id,
                pedidoParaInserir.numero_pedido,
                dataProgramada,
                itensFabricados
              );
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
          // Coletar itens fabricados para criar OP
          const itensFabricados: ItemFabricadoParaOP[] = [];

          // Processar cada item do pedido
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
              // Coletar item fabricado para a OP
              const totalMetros = itemPedido.total_calculado
                ? Number(itemPedido.total_calculado)
                : (itemPedido.quantidade_simples ? Number(itemPedido.quantidade_simples) : 0);

              if (totalMetros > 0) {
                itensFabricados.push({
                  pedido_item_id: itemPedido.id,
                  produto_id: produto.id,
                  quantidade_metros: totalMetros,
                  quantidade_pecas: itemPedido.quantidade_pecas ? Number(itemPedido.quantidade_pecas) : undefined,
                  comprimento_cada_mm: itemPedido.comprimento_cada_mm ? Number(itemPedido.comprimento_cada_mm) : undefined,
                });
              }
            }
          }

          // Criar UMA ÚNICA ordem de produção para todo o pedido (se houver itens fabricados)
          if (itensFabricados.length > 0) {
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

            // Criar ordem de produção única para o pedido com todos os itens
            await criarOrdemProducaoPorPedido(
              id,
              numeroPedido,
              dataProgramada,
              itensFabricados
            );
          }
        }

        // Gerar cobrança no Asaas se marcado no pedido
        const pedidoComDados = data || pedidoAtual;
        if (pedidoComDados?.gerar_cobranca_asaas && !pedidoComDados?.asaas_payment_id) {
          try {
            // Buscar cliente para obter asaas_customer_id
            const { data: cliente } = await supabase
              .from('clientes')
              .select('asaas_customer_id')
              .eq('id', pedidoComDados.cliente_id)
              .single();

            if (!cliente?.asaas_customer_id) {
              console.warn('Pedido aprovado, mas cliente não possui cadastro no Asaas. Cobrança não gerada.');
            } else {
              const isParcelado = (pedidoComDados.numero_parcelas || 1) > 1;

              // Montar objeto de cobrança
              const cobrancaData: any = {
                customer: cliente.asaas_customer_id,
                billingType: pedidoComDados.tipo_cobranca || 'BOLETO',
                dueDate: pedidoComDados.data_vencimento,
                description: `Pedido #${numeroPedido} - Aprovado`,
                externalReference: id,
              };

              // Valor: se parcelado, usar installmentCount e totalValue
              if (isParcelado) {
                cobrancaData.installmentCount = pedidoComDados.numero_parcelas;
                cobrancaData.totalValue = Number(pedidoComDados.valor_total) || 0;
              } else {
                cobrancaData.value = Number(pedidoComDados.valor_total) || 0;
              }

              // Desconto antecipado
              if (pedidoComDados.desconto_antecipado_valor && pedidoComDados.desconto_antecipado_dias) {
                cobrancaData.discount = {
                  value: pedidoComDados.desconto_antecipado_valor,
                  dueDateLimitDays: pedidoComDados.desconto_antecipado_dias,
                  type: pedidoComDados.desconto_antecipado_tipo || 'FIXED',
                };
              }

              // Juros
              if (pedidoComDados.juros_atraso) {
                cobrancaData.interest = {
                  value: pedidoComDados.juros_atraso,
                };
              }

              // Multa
              if (pedidoComDados.multa_atraso) {
                cobrancaData.fine = {
                  value: pedidoComDados.multa_atraso,
                  type: pedidoComDados.multa_atraso_tipo || 'PERCENTAGE',
                };
              }

              console.log('🏦 Gerando cobrança Asaas (pedido aprovado):', cobrancaData);
              const cobrancaResult = await asaasClient.createPayment(cobrancaData);

              if (cobrancaResult && (cobrancaResult as any).id) {
                // Atualizar pedido com ID da cobrança Asaas
                await supabase
                  .from('pedidos')
                  .update({
                    asaas_payment_id: (cobrancaResult as any).id,
                    asaas_payment_url: (cobrancaResult as any).invoiceUrl || (cobrancaResult as any).bankSlipUrl,
                  })
                  .eq('id', id);

                console.log('✅ Cobrança Asaas gerada com sucesso:', (cobrancaResult as any).id);
              }
            }
          } catch (asaasError: any) {
            console.error('Erro ao gerar cobrança Asaas:', asaasError);
            // Não bloquear a aprovação por erro de cobrança
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

