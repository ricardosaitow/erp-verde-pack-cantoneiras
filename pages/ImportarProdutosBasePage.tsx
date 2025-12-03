import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DataPagination } from '@/components/ui/data-pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Download,
  Check,
  X,
  Package,
  Loader2,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { baseClient } from '@/lib/base';
import { supabase } from '@/lib/supabase';
import type { BaseProduct } from '@/types/base';

interface ProdutoBaseStaging {
  id: string;
  base_id: number;
  base_code: string | null;
  base_sku: string | null;
  base_name: string;
  base_description: string | null;
  base_ncm: string | null;
  base_unit: string | null;
  base_price: number | null;
  base_cost: number | null;
  base_inventory: number | null;
  base_min_inventory: number | null;
  base_observations: string | null;
  base_external_reference: string | null;
  status: 'pendente' | 'selecionado' | 'importado' | 'ignorado';
  produto_id: string | null;
  data_sincronizacao: string;
  created_at: string;
}

export default function ImportarProdutosBasePage() {
  const [loading, setLoading] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoBaseStaging[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  // Modal de detalhes
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoBaseStaging | null>(null);

  // Carregar produtos do staging
  const fetchProdutos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos_base_staging')
        .select('*')
        .order('base_name', { ascending: true });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar produtos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  // Sincronizar produtos do Base
  const handleSincronizarBase = async () => {
    setLoadingSync(true);
    try {
      toast.info('Buscando produtos do Base ERP...');

      // Buscar todos os produtos do Base (paginado)
      let allProducts: BaseProduct[] = [];
      let currentPage = 0;
      const limit = 100;
      let totalPages = 1;

      while (currentPage < totalPages) {
        toast.info(`Buscando página ${currentPage + 1}...`);
        const response = await baseClient.listProducts({ limit, page: currentPage });
        const responseData = response.data as any;

        // Verificar formato da resposta (pode ser array direto ou objeto paginado)
        if (responseData?.content) {
          // Formato paginado: { content: [], totalPages, totalElements }
          const content = responseData.content || [];
          allProducts = [...allProducts, ...content];
          totalPages = responseData.totalPages || 1;
          console.log(`Página ${currentPage + 1}/${totalPages}: ${content.length} produtos`);
        } else if (Array.isArray(responseData)) {
          // Formato array direto
          allProducts = [...allProducts, ...responseData];
          // Se retornou menos que o limite, não há mais páginas
          if (responseData.length < limit) {
            totalPages = currentPage + 1;
          } else {
            totalPages = currentPage + 2; // Continua buscando
          }
        } else {
          console.log('Formato de resposta não reconhecido:', responseData);
          break;
        }

        currentPage++;
      }

      toast.info(`${allProducts.length} produtos encontrados. Salvando...`);

      // Salvar/atualizar no staging
      let criados = 0;
      let atualizados = 0;

      for (const product of allProducts) {
        const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;

        const stagingData = {
          base_id: productId,
          base_code: product.code || null,
          base_sku: product.sku || null,
          base_name: product.name,
          base_description: product.description || null,
          base_ncm: product.ncm || null,
          base_unit: product.unit || null,
          base_price: product.price || null,
          base_cost: product.cost || null,
          base_inventory: product.inventory || null,
          base_min_inventory: product.minInventory || null,
          base_observations: product.observations || null,
          base_external_reference: product.externalReference || null,
          data_sincronizacao: new Date().toISOString(),
        };

        // Verificar se já existe
        const { data: existing } = await supabase
          .from('produtos_base_staging')
          .select('id, status')
          .eq('base_id', productId)
          .single();

        if (existing) {
          // Atualizar apenas se não foi importado
          if (existing.status !== 'importado') {
            await supabase
              .from('produtos_base_staging')
              .update(stagingData)
              .eq('id', existing.id);
          }
          atualizados++;
        } else {
          // Criar novo
          await supabase
            .from('produtos_base_staging')
            .insert({
              ...stagingData,
              status: 'pendente',
            });
          criados++;
        }
      }

      toast.success(`Sincronização concluída! ${criados} novos, ${atualizados} atualizados.`);
      fetchProdutos();
    } catch (error: any) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar: ' + error.message);
    } finally {
      setLoadingSync(false);
    }
  };

  // Marcar/desmarcar seleção
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Selecionar todos visíveis
  const selectAllVisible = () => {
    const visibleIds = produtosFiltrados
      .filter(p => p.status === 'pendente')
      .map(p => p.id);
    setSelectedIds(new Set(visibleIds));
  };

  // Desmarcar todos
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Marcar selecionados para importar
  const handleMarcarParaImportar = async () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione pelo menos um produto');
      return;
    }

    try {
      const { error } = await supabase
        .from('produtos_base_staging')
        .update({ status: 'selecionado' })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} produto(s) marcado(s) para importação`);
      setSelectedIds(new Set());
      fetchProdutos();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  // Ignorar selecionados
  const handleIgnorar = async () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione pelo menos um produto');
      return;
    }

    try {
      const { error } = await supabase
        .from('produtos_base_staging')
        .update({ status: 'ignorado' })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} produto(s) ignorado(s)`);
      setSelectedIds(new Set());
      fetchProdutos();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  // Importar produtos selecionados para tabela produtos
  const handleImportarProdutos = async () => {
    const produtosParaImportar = produtos.filter(p => p.status === 'selecionado');

    if (produtosParaImportar.length === 0) {
      toast.warning('Nenhum produto marcado para importação');
      return;
    }

    setLoadingImport(true);
    let importados = 0;
    let erros = 0;

    try {
      for (const prod of produtosParaImportar) {
        try {
          // Criar produto na tabela principal
          const { data: novoProduto, error } = await supabase
            .from('produtos')
            .insert({
              nome: prod.base_name,
              codigo_interno: prod.base_code || prod.base_sku || null,
              descricao: prod.base_description,
              tipo: 'fabricado', // Padrão, usuário pode alterar depois
              ncm: prod.base_ncm,
              unidade_venda: prod.base_unit || 'un',
              preco_venda_unitario: prod.base_price || 0,
              base_id: prod.base_id,
              sincronizado: true,
              data_sincronizacao: new Date().toISOString(),
              ativo: true,
            })
            .select()
            .single();

          if (error) throw error;

          // Atualizar staging
          await supabase
            .from('produtos_base_staging')
            .update({
              status: 'importado',
              produto_id: novoProduto.id,
            })
            .eq('id', prod.id);

          importados++;
        } catch (err: any) {
          console.error(`Erro ao importar ${prod.base_name}:`, err);
          erros++;
        }
      }

      if (erros > 0) {
        toast.warning(`Importação concluída: ${importados} sucesso, ${erros} erros`);
      } else {
        toast.success(`${importados} produto(s) importado(s) com sucesso!`);
      }

      fetchProdutos();
    } catch (error: any) {
      toast.error('Erro na importação: ' + error.message);
    } finally {
      setLoadingImport(false);
    }
  };

  // Filtrar produtos
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      // Filtro de busca
      if (search) {
        const searchLower = search.toLowerCase();
        const matchName = p.base_name?.toLowerCase().includes(searchLower);
        const matchCode = p.base_code?.toLowerCase().includes(searchLower);
        const matchSku = p.base_sku?.toLowerCase().includes(searchLower);
        if (!matchName && !matchCode && !matchSku) return false;
      }

      // Filtro de status
      if (statusFilter !== 'todos' && p.status !== statusFilter) return false;

      return true;
    });
  }, [produtos, search, statusFilter]);

  // Paginação
  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);
  const produtosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return produtosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [produtosFiltrados, paginaAtual, itensPorPagina]);

  // Contadores
  const contadores = useMemo(() => ({
    total: produtos.length,
    pendentes: produtos.filter(p => p.status === 'pendente').length,
    selecionados: produtos.filter(p => p.status === 'selecionado').length,
    importados: produtos.filter(p => p.status === 'importado').length,
    ignorados: produtos.filter(p => p.status === 'ignorado').length,
  }), [produtos]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline">Pendente</Badge>;
      case 'selecionado':
        return <Badge className="bg-blue-500">Selecionado</Badge>;
      case 'importado':
        return <Badge className="bg-green-500">Importado</Badge>;
      case 'ignorado':
        return <Badge variant="secondary">Ignorado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Importar Produtos do Base"
        description="Sincronize produtos do Base ERP e selecione quais importar para o sistema"
      >
        <Button
          variant="outline"
          onClick={fetchProdutos}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        <Button
          onClick={handleSincronizarBase}
          disabled={loadingSync}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loadingSync ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Cloud className="h-4 w-4 mr-2" />
          )}
          Buscar do Base
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{contadores.total}</div>
          </Card>
          <Card className="p-4 border-yellow-200 bg-yellow-50">
            <div className="text-sm text-yellow-700">Pendentes</div>
            <div className="text-2xl font-bold text-yellow-700">{contadores.pendentes}</div>
          </Card>
          <Card className="p-4 border-blue-200 bg-blue-50">
            <div className="text-sm text-blue-700">Selecionados</div>
            <div className="text-2xl font-bold text-blue-700">{contadores.selecionados}</div>
          </Card>
          <Card className="p-4 border-green-200 bg-green-50">
            <div className="text-sm text-green-700">Importados</div>
            <div className="text-2xl font-bold text-green-700">{contadores.importados}</div>
          </Card>
          <Card className="p-4 border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">Ignorados</div>
            <div className="text-2xl font-bold text-gray-600">{contadores.ignorados}</div>
          </Card>
        </div>

        {/* Barra de ações */}
        {contadores.selecionados > 0 && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-700">
                  {contadores.selecionados} produto(s) marcado(s) para importação
                </span>
              </div>
              <Button
                onClick={handleImportarProdutos}
                disabled={loadingImport}
                className="bg-green-600 hover:bg-green-700"
              >
                {loadingImport ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Importar para Produtos
              </Button>
            </div>
          </Card>
        )}

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, código ou SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="selecionado">Selecionados</SelectItem>
                  <SelectItem value="importado">Importados</SelectItem>
                  <SelectItem value="ignorado">Ignorados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator orientation="vertical" className="h-8" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selecionado(s)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllVisible}
                disabled={produtosFiltrados.filter(p => p.status === 'pendente').length === 0}
              >
                Selecionar Pendentes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={selectedIds.size === 0}
              >
                Limpar
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8" />

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleMarcarParaImportar}
                disabled={selectedIds.size === 0}
              >
                <Check className="h-4 w-4 mr-1" />
                Marcar para Importar
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleIgnorar}
                disabled={selectedIds.size === 0}
              >
                <X className="h-4 w-4 mr-1" />
                Ignorar
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabela de produtos */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="mt-4 text-muted-foreground">Carregando produtos...</span>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="Nenhum produto encontrado"
            description={
              produtos.length === 0
                ? 'Clique em "Buscar do Base" para sincronizar os produtos do Base ERP'
                : 'Nenhum produto corresponde aos filtros selecionados'
            }
          />
        ) : (
          <>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          produtosPaginados.filter(p => p.status === 'pendente').length > 0 &&
                          produtosPaginados
                            .filter(p => p.status === 'pendente')
                            .every(p => selectedIds.has(p.id))
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newSelected = new Set(selectedIds);
                            produtosPaginados
                              .filter(p => p.status === 'pendente')
                              .forEach(p => newSelected.add(p.id));
                            setSelectedIds(newSelected);
                          } else {
                            const newSelected = new Set(selectedIds);
                            produtosPaginados.forEach(p => newSelected.delete(p.id));
                            setSelectedIds(newSelected);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosPaginados.map((produto) => (
                    <TableRow
                      key={produto.id}
                      className={
                        selectedIds.has(produto.id)
                          ? 'bg-blue-50'
                          : produto.status === 'importado'
                          ? 'bg-green-50/50'
                          : produto.status === 'ignorado'
                          ? 'bg-gray-50'
                          : ''
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(produto.id)}
                          onCheckedChange={() => toggleSelection(produto.id)}
                          disabled={produto.status === 'importado'}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {produto.base_code || produto.base_sku || '-'}
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {produto.base_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {produto.base_ncm || '-'}
                      </TableCell>
                      <TableCell>{produto.base_unit || '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(produto.base_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(produto.base_cost)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(produto.status)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedProduto(produto);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <DataPagination
              currentPage={paginaAtual}
              totalPages={totalPaginas}
              onPageChange={(page) => setPaginaAtual(page)}
              itemsPerPage={itensPorPagina}
              onItemsPerPageChange={(size) => setItensPorPagina(size)}
              totalItems={produtosFiltrados.length}
            />
          </>
        )}
      </div>

      {/* Modal de detalhes */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
            <DialogDescription>
              Informações do produto importado do Base ERP
            </DialogDescription>
          </DialogHeader>

          {selectedProduto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ID Base</Label>
                  <div className="font-mono">{selectedProduto.base_id}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedProduto.status)}</div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <div className="font-medium text-lg">{selectedProduto.base_name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Código</Label>
                  <div className="font-mono">{selectedProduto.base_code || '-'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">SKU</Label>
                  <div className="font-mono">{selectedProduto.base_sku || '-'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">NCM</Label>
                  <div className="font-mono">{selectedProduto.base_ncm || '-'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Unidade</Label>
                  <div>{selectedProduto.base_unit || '-'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Preço de Venda</Label>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(selectedProduto.base_price)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Custo</Label>
                  <div className="text-lg font-semibold">
                    {formatCurrency(selectedProduto.base_cost)}
                  </div>
                </div>
              </div>

              {selectedProduto.base_description && (
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <div className="text-sm">{selectedProduto.base_description}</div>
                </div>
              )}

              {selectedProduto.base_observations && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <div className="text-sm">{selectedProduto.base_observations}</div>
                </div>
              )}

              <Separator />

              <div className="text-xs text-muted-foreground">
                Última sincronização: {new Date(selectedProduto.data_sincronizacao).toLocaleString('pt-BR')}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
