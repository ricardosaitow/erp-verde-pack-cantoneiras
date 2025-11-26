import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { baseClient } from '../lib/base';
import type { Produto, ProdutoComCusto, Receita } from '../lib/database.types';
import { mapearProdutoParaBase, gerarMensagemErroSync } from '../lib/produto-sync';

export function useProdutos() {
  const [produtos, setProdutos] = useState<ProdutoComCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchProdutos() {
    try {
      setLoading(true);
      setError(null);

      // Verificar se as credenciais estão configuradas
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('Credenciais do Supabase não configuradas. Configure o arquivo .env.local com suas credenciais.');
      }
      // Buscar todos os produtos (incluindo inativos para não perder dados antigos)
      // Incluir categorias e receitas relacionadas
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          categoria:categorias(*),
          receitas:receitas(
            *,
            materia_prima:materias_primas(*)
          )
        `)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar produtos:', error);

        // Verificar se é erro de credenciais/configuração
        if (error.message?.includes('JWT') || error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
          throw new Error('Credenciais do Supabase não configuradas ou inválidas. Configure o arquivo .env.local com suas credenciais.');
        }

        // Verificar se a tabela não existe
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          throw new Error('Tabela "produtos" não encontrada. Execute o schema SQL no Supabase.');
        }

        throw error;
      }

      setProdutos(data || []);
      console.log(`✅ ${data?.length || 0} produto(s) carregado(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Erro ao carregar produtos';
      setError(errorMessage);
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createProduto(produto: any) {
    try {
      // Separar receitas do produto
      const { receitas, ...produtoData } = produto;

      // 1. Criar produto localmente no Supabase
      const { data: produtoCriado, error: produtoError } = await supabase
        .from('produtos')
        .insert([produtoData])
        .select()
        .single();

      if (produtoError) throw produtoError;

      console.log('✅ Produto criado localmente:', produtoCriado.id);

      // 2. Se tiver receitas, criar elas
      if (receitas && receitas.length > 0 && produtoCriado) {
        const receitasParaInserir = receitas.map((r: any) => ({
          produto_id: produtoCriado.id,
          materia_prima_id: r.materia_prima_id,
          numero_camadas: r.numero_camadas,
          consumo_por_metro_g: r.consumo_por_metro_g,
          custo_por_metro: r.custo_por_metro,
        }));

        const { error: receitasError } = await supabase
          .from('receitas')
          .insert(receitasParaInserir);

        if (receitasError) {
          console.error('Erro ao criar receitas:', receitasError);
          // Não falhar se receitas falharem, mas avisar
        }
      }

      // 3. Tentar sincronizar com Base ERP
      try {
        console.log('🔄 Sincronizando produto com Base ERP...');

        const baseProduct = mapearProdutoParaBase(produtoCriado);
        const { data: produtoBase } = await baseClient.createProduct(baseProduct);

        if (produtoBase) {
          // Atualizar produto local com ID do Base e código gerado (se foi gerado)
          const updateData: any = {
            base_id: produtoBase.id,
            sincronizado: true,
            data_sincronizacao: new Date().toISOString(),
          };

          // Se o código foi gerado automaticamente, salvar no banco
          if (!produtoCriado.codigo_interno && (baseProduct.code || baseProduct.sku)) {
            updateData.codigo_interno = baseProduct.code || baseProduct.sku;
          }

          const { error: updateError } = await supabase
            .from('produtos')
            .update(updateData)
            .eq('id', produtoCriado.id);

          if (updateError) {
            console.error('Erro ao atualizar base_id:', updateError);
          } else {
            console.log('✅ Produto sincronizado com Base ERP. ID:', produtoBase.id);
            toast.success('Produto criado e sincronizado com Base ERP', {
              description: `ID Base: ${produtoBase.id}`,
            });
          }
        }
      } catch (syncErr: any) {
        // Produto criado localmente mas não sincronizado
        console.error('❌ Erro ao sincronizar com Base ERP:', syncErr);

        const mensagemErro = gerarMensagemErroSync(syncErr);

        toast.warning('Produto criado localmente', {
          description: `Erro ao sincronizar com Base: ${mensagemErro}. Sincronize manualmente depois.`,
          duration: 7000,
        });

        // Marcar como não sincronizado
        await supabase
          .from('produtos')
          .update({
            sincronizado: false,
          })
          .eq('id', produtoCriado.id);
      }

      await fetchProdutos();
      return { data: produtoCriado, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao criar produto' };
    }
  }

  async function updateProduto(id: string, produto: any) {
    try {
      // Separar receitas do produto
      const { receitas, ...produtoData } = produto;

      // Buscar produto atual para verificar se tem base_id
      const { data: produtoAtual } = await supabase
        .from('produtos')
        .select('base_id')
        .eq('id', id)
        .single();

      // 1. Atualizar produto localmente
      const { data: produtoAtualizado, error: produtoError } = await supabase
        .from('produtos')
        .update(produtoData)
        .eq('id', id)
        .select()
        .single();

      if (produtoError) throw produtoError;

      // 2. Se tiver receitas, atualizar elas (deletar antigas e inserir novas)
      if (receitas !== undefined && produtoAtualizado) {
        // Deletar receitas antigas
        const { error: deleteError } = await supabase
          .from('receitas')
          .delete()
          .eq('produto_id', id);

        if (deleteError) {
          console.error('Erro ao deletar receitas antigas:', deleteError);
        }

        // Inserir novas receitas se houver
        if (receitas && receitas.length > 0) {
          const receitasParaInserir = receitas.map((r: any) => ({
            produto_id: id,
            materia_prima_id: r.materia_prima_id,
            numero_camadas: r.numero_camadas,
            consumo_por_metro_g: r.consumo_por_metro_g,
            custo_por_metro: r.custo_por_metro,
          }));

          const { error: receitasError } = await supabase
            .from('receitas')
            .insert(receitasParaInserir);

          if (receitasError) {
            console.error('Erro ao criar receitas:', receitasError);
          }
        }
      }

      // 3. Se produto está sincronizado com Base, atualizar lá também
      if (produtoAtual?.base_id) {
        try {
          console.log('🔄 Atualizando produto no Base ERP...');

          const baseProduct = mapearProdutoParaBase(produtoAtualizado);
          await baseClient.updateProduct(String(produtoAtual.base_id), baseProduct);

          // Atualizar data de sincronização
          await supabase
            .from('produtos')
            .update({
              data_sincronizacao: new Date().toISOString(),
            })
            .eq('id', id);

          console.log('✅ Produto atualizado no Base ERP');
          toast.success('Produto atualizado localmente e no Base ERP');
        } catch (syncErr: any) {
          console.error('❌ Erro ao sincronizar atualização com Base ERP:', syncErr);

          const mensagemErro = gerarMensagemErroSync(syncErr);

          toast.warning('Produto atualizado localmente', {
            description: `Erro ao sincronizar com Base: ${mensagemErro}`,
            duration: 7000,
          });

          // Marcar como dessincronizado
          await supabase
            .from('produtos')
            .update({
              sincronizado: false,
            })
            .eq('id', id);
        }
      } else {
        toast.success('Produto atualizado localmente');
      }

      await fetchProdutos();
      return { data: produtoAtualizado, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao atualizar produto' };
    }
  }

  async function deleteProduto(id: string) {
    try {
      // Buscar produto para verificar se está sincronizado
      const { data: produto } = await supabase
        .from('produtos')
        .select('base_id, nome')
        .eq('id', id)
        .single();

      // Deletar localmente
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Se estava sincronizado com Base, deletar lá também
      if (produto?.base_id) {
        try {
          await baseClient.deleteProduct(String(produto.base_id));
          console.log('✅ Produto deletado do Base ERP');
        } catch (syncErr) {
          console.error('❌ Erro ao deletar produto do Base ERP:', syncErr);
          toast.warning('Produto deletado localmente, mas não foi possível deletar do Base ERP');
        }
      }

      await fetchProdutos();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao excluir produto' };
    }
  }

  // Sincronizar produto específico com Base ERP (manual)
  async function sincronizarComBase(id: string) {
    try {
      // Buscar produto
      const { data: produto, error: fetchError } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!produto) throw new Error('Produto não encontrado');

      // Se já tem base_id, atualizar. Senão, criar.
      if (produto.base_id) {
        // Atualizar no Base
        const baseProduct = mapearProdutoParaBase(produto);
        await baseClient.updateProduct(String(produto.base_id), baseProduct);

        console.log('✅ Produto atualizado no Base ERP');
        toast.success('Produto atualizado no Base ERP');
      } else {
        // Criar no Base
        const baseProduct = mapearProdutoParaBase(produto);
        const { data: produtoBase } = await baseClient.createProduct(baseProduct);

        if (produtoBase) {
          // Atualizar produto local com ID do Base
          await supabase
            .from('produtos')
            .update({
              base_id: produtoBase.id,
              sincronizado: true,
              data_sincronizacao: new Date().toISOString(),
            })
            .eq('id', id);

          console.log('✅ Produto sincronizado com Base ERP. ID:', produtoBase.id);
          toast.success('Produto sincronizado com Base ERP', {
            description: `ID Base: ${produtoBase.id}`,
          });
        }
      }

      // Atualizar data de sincronização
      await supabase
        .from('produtos')
        .update({
          sincronizado: true,
          data_sincronizacao: new Date().toISOString(),
        })
        .eq('id', id);

      await fetchProdutos();
      return { error: null };
    } catch (err: any) {
      const mensagemErro = gerarMensagemErroSync(err);
      toast.error('Erro ao sincronizar produto', {
        description: mensagemErro,
      });
      return { error: mensagemErro };
    }
  }

  // Sincronização bulk de todos os produtos não sincronizados
  async function sincronizarTodos() {
    try {
      // Buscar produtos não sincronizados
      const { data: produtosNaoSincronizados, error: fetchError } = await supabase
        .from('produtos')
        .select('*')
        .or('sincronizado.is.null,sincronizado.eq.false')
        .eq('ativo', true);

      if (fetchError) throw fetchError;

      if (!produtosNaoSincronizados || produtosNaoSincronizados.length === 0) {
        toast.info('Todos os produtos já estão sincronizados');
        return {
          total: 0,
          sucesso: 0,
          erros: 0,
          detalhes: [],
        };
      }

      toast.info(`Sincronizando ${produtosNaoSincronizados.length} produto(s)...`);

      const resultados = {
        total: produtosNaoSincronizados.length,
        sucesso: 0,
        erros: 0,
        detalhes: [] as any[],
      };

      for (const produto of produtosNaoSincronizados) {
        try {
          const baseProduct = mapearProdutoParaBase(produto);
          const { data: produtoBase } = await baseClient.createProduct(baseProduct);

          if (produtoBase) {
            await supabase
              .from('produtos')
              .update({
                base_id: produtoBase.id,
                sincronizado: true,
                data_sincronizacao: new Date().toISOString(),
              })
              .eq('id', produto.id);

            resultados.sucesso++;
            resultados.detalhes.push({
              produto: produto.nome,
              status: 'sucesso',
              baseId: produtoBase.id,
            });
          }
        } catch (err: any) {
          resultados.erros++;
          resultados.detalhes.push({
            produto: produto.nome,
            status: 'erro',
            erro: gerarMensagemErroSync(err),
          });
        }
      }

      await fetchProdutos();

      if (resultados.erros === 0) {
        toast.success(`${resultados.sucesso} produto(s) sincronizado(s) com sucesso`);
      } else {
        toast.warning(`Sincronização concluída com erros`, {
          description: `Sucesso: ${resultados.sucesso} | Erros: ${resultados.erros}`,
        });
      }

      return resultados;
    } catch (err: any) {
      const mensagemErro = gerarMensagemErroSync(err);
      toast.error('Erro na sincronização bulk', {
        description: mensagemErro,
      });
      return {
        total: 0,
        sucesso: 0,
        erros: 1,
        detalhes: [{ erro: mensagemErro }],
      };
    }
  }

  // Gerenciar receitas (composição)
  async function addReceita(receita: Omit<Receita, 'id' | 'created_at' | 'updated_at' | 'custo_por_metro'>) {
    try {
      const { data, error } = await supabase
        .from('receitas')
        .insert([receita])
        .select()
        .single();

      if (error) throw error;

      await fetchProdutos();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao adicionar receita' };
    }
  }

  async function removeReceita(id: string) {
    try {
      const { error } = await supabase
        .from('receitas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchProdutos();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao remover receita' };
    }
  }

  useEffect(() => {
    fetchProdutos();
  }, []);

  return {
    produtos,
    loading,
    error,
    refresh: fetchProdutos,
    create: createProduto,
    update: updateProduto,
    delete: deleteProduto,
    sincronizarComBase,
    sincronizarTodos,
    addReceita,
    removeReceita,
  };
}
