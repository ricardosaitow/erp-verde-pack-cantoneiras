import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Pedido, PedidoCompleto } from '../lib/database.types';
import { darBaixaProdutoRevenda } from '../lib/estoque';

export function usePedidos() {
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lock para evitar criação duplicada de ordens de produção
  const pedidosEmProcessamento = new Set<string>();

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
                  // Gerar número da ordem de produção
                  const { count: countOp } = await supabase
                    .from('ordens_producao')
                    .select('*', { count: 'exact', head: true });
                  
                  const numeroOp = `OP-${String((countOp || 0) + 1).padStart(4, '0')}`;

                  // Calcular data programada (se houver prazo de entrega e data do pedido)
                  let dataProgramada: string | null = null;
                  if (pedidoParaInserir.prazo_entrega_dias && pedidoParaInserir.data_pedido) {
                    const dataPedido = new Date(pedidoParaInserir.data_pedido);
                    dataPedido.setDate(dataPedido.getDate() + pedidoParaInserir.prazo_entrega_dias);
                    dataProgramada = dataPedido.toISOString().split('T')[0];
                  }

                  // Criar ordem de produção
                  const { error: ordemError } = await supabase
                    .from('ordens_producao')
                    .insert([{
                      numero_op: numeroOp,
                      pedido_id: pedidoCriado.id,
                      pedido_item_id: itemPedido.id,
                      produto_id: produto.id,
                      quantidade_produzir_metros: totalMetros,
                      status: 'aguardando',
                      data_programada: dataProgramada,
                      instrucoes_tecnicas: produto.instrucoes_tecnicas || null,
                      observacoes: `Gerada automaticamente do pedido ${pedidoParaInserir.numero_pedido}`,
                    }]);

                  if (ordemError) {
                    console.error(`Erro ao criar ordem de produção para ${produto.nome}:`, ordemError);
                    console.warn(`Atenção: Ordem de produção não foi criada para ${produto.nome}`);
                  } else {
                    console.log(`✅ Ordem de produção criada: ${numeroOp} para ${produto.nome} (${totalMetros}m)`);
                  }
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
          // Verificar se já existem ordens de produção para este pedido
          const { data: ordensExistentes } = await supabase
            .from('ordens_producao')
            .select('pedido_item_id')
            .eq('pedido_id', id);

          const itensComOp = new Set(ordensExistentes?.map(op => op.pedido_item_id) || []);

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
            } else if (produto.tipo === 'fabricado' && !itensComOp.has(itemPedido.id)) {
              // Criar ordem de produção para produtos fabricados (se ainda não existe)
              // Calcular total de metros: usar total_calculado se existir (venda composta),
              // senão usar quantidade_simples (venda simples por metro)
              const totalMetros = itemPedido.total_calculado 
                ? Number(itemPedido.total_calculado) 
                : (itemPedido.quantidade_simples ? Number(itemPedido.quantidade_simples) : 0);

              if (totalMetros > 0) {
                // Gerar número da ordem de produção
                const { count: countOp } = await supabase
                  .from('ordens_producao')
                  .select('*', { count: 'exact', head: true });
                
                const numeroOp = `OP-${String((countOp || 0) + 1).padStart(4, '0')}`;

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

                // Criar ordem de produção
                const { error: ordemError } = await supabase
                  .from('ordens_producao')
                  .insert([{
                    numero_op: numeroOp,
                    pedido_id: id,
                    pedido_item_id: itemPedido.id,
                    produto_id: produto.id,
                    quantidade_produzir_metros: totalMetros,
                    status: 'aguardando',
                    data_programada: dataProgramada,
                    instrucoes_tecnicas: produto.instrucoes_tecnicas || null,
                    observacoes: `Gerada automaticamente do pedido ${numeroPedido}`,
                  }]);

                if (ordemError) {
                  console.error(`Erro ao criar ordem de produção para ${produto.nome}:`, ordemError);
                  console.warn(`Atenção: Ordem de produção não foi criada para ${produto.nome}`);
                } else {
                  console.log(`✅ Ordem de produção criada: ${numeroOp} para ${produto.nome} (${totalMetros}m)`);
                }
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

  return {
    pedidos,
    loading,
    error,
    refresh: fetchPedidos,
    create: createPedido,
    update: updatePedido,
    delete: deletePedido,
  };
}

