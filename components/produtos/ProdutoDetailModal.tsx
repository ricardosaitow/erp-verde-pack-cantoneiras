import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { ProdutoComCusto } from '@/lib/database.types';
import { formatCurrency, formatQuantity } from '@/lib/format';
import { formatBrazilianDateTimeLong } from '@/lib/date-utils';

interface ProdutoDetailModalProps {
  produto: ProdutoComCusto | null;
  open: boolean;
  onClose: () => void;
  onEdit: (produto: ProdutoComCusto) => void;
  onDelete: (id: string) => void;
  categoriaNome?: string;
}

export function ProdutoDetailModal({
  produto,
  open,
  onClose,
  onEdit,
  onDelete,
  categoriaNome,
}: ProdutoDetailModalProps) {
  if (!produto) return null;

  const handleEdit = () => {
    onEdit(produto);
    onClose();
  };

  const handleDelete = () => {
    onDelete(produto.id);
  };

  const getEstoqueStatus = () => {
    if (produto.tipo !== 'revenda') return null;

    const estoqueAtual = Number(produto.estoque_atual) || 0;
    const estoqueMinimo = Number(produto.estoque_minimo) || 0;
    const estoquePontoReposicao = Number(produto.estoque_ponto_reposicao) || 0;

    if (estoqueAtual < estoquePontoReposicao) {
      return { nivel: 'critico', label: 'Crítico', variant: 'destructive' as const };
    }
    if (estoqueAtual < estoqueMinimo) {
      return { nivel: 'baixo', label: 'Baixo', variant: 'warning' as const };
    }
    return { nivel: 'normal', label: 'Normal', variant: 'success' as const };
  };

  const estoqueStatus = getEstoqueStatus();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">
                {produto.nome}
              </DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant={produto.ativo ? 'success' : 'secondary'}>
                  {produto.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                <Badge variant="outline">
                  {produto.tipo === 'revenda' ? 'Revenda' : 'Fabricado'}
                </Badge>
                {categoriaNome && (
                  <Badge variant="outline">
                    {categoriaNome}
                  </Badge>
                )}
                {estoqueStatus && (
                  <Badge variant={estoqueStatus.variant}>
                    Estoque: {estoqueStatus.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {produto.codigo_interno && (
                    <div>
                      <p className="text-sm text-muted-foreground">Código Interno</p>
                      <p className="font-medium">{produto.codigo_interno}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Unidade de Venda</p>
                    <p className="font-medium">{produto.unidade_venda}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço de Venda</p>
                    <p className="font-medium text-lg text-purple-600">
                      {formatCurrency(Number(produto.preco_venda_unitario) || 0)}
                    </p>
                  </div>
                  {produto.margem_lucro_percentual && (
                    <div>
                      <p className="text-sm text-muted-foreground">Margem de Lucro</p>
                      <p className="font-medium">{produto.margem_lucro_percentual}%</p>
                    </div>
                  )}
                </div>
                {produto.descricao && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                      <p className="text-sm">{produto.descricao}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Dimensões */}
            {(produto.altura_mm || produto.largura_mm || produto.espessura_mm) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dimensões</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {produto.altura_mm && (
                      <div>
                        <p className="text-sm text-muted-foreground">Altura</p>
                        <p className="font-medium">{produto.altura_mm} mm</p>
                      </div>
                    )}
                    {produto.largura_mm && (
                      <div>
                        <p className="text-sm text-muted-foreground">Largura</p>
                        <p className="font-medium">{produto.largura_mm} mm</p>
                      </div>
                    )}
                    {produto.espessura_mm && (
                      <div>
                        <p className="text-sm text-muted-foreground">Espessura</p>
                        <p className="font-medium">{produto.espessura_mm} mm</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informações de Revenda */}
            {produto.tipo === 'revenda' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações de Revenda</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Atual</p>
                      <p className="font-medium text-lg">
                        {formatQuantity(Number(produto.estoque_atual) || 0, produto.unidade_venda)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Mínimo</p>
                      <p className="font-medium">
                        {formatQuantity(Number(produto.estoque_minimo) || 0, produto.unidade_venda)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ponto de Reposição</p>
                      <p className="font-medium">
                        {formatQuantity(Number(produto.estoque_ponto_reposicao) || 0, produto.unidade_venda)}
                      </p>
                    </div>
                    {produto.custo_compra && (
                      <div>
                        <p className="text-sm text-muted-foreground">Custo de Compra</p>
                        <p className="font-medium">{formatCurrency(Number(produto.custo_compra))}</p>
                      </div>
                    )}
                    {produto.codigo_fornecedor && (
                      <div>
                        <p className="text-sm text-muted-foreground">Código do Fornecedor</p>
                        <p className="font-medium">{produto.codigo_fornecedor}</p>
                      </div>
                    )}
                    {produto.lote_minimo_compra && (
                      <div>
                        <p className="text-sm text-muted-foreground">Lote Mínimo de Compra</p>
                        <p className="font-medium">
                          {formatQuantity(produto.lote_minimo_compra, produto.unidade_venda)}
                        </p>
                      </div>
                    )}
                    {produto.prazo_entrega_dias && (
                      <div>
                        <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                        <p className="font-medium">{produto.prazo_entrega_dias} dias</p>
                      </div>
                    )}
                    {produto.local_armazenamento && (
                      <div>
                        <p className="text-sm text-muted-foreground">Local de Armazenamento</p>
                        <p className="font-medium">{produto.local_armazenamento}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informações de Fabricação */}
            {produto.tipo === 'fabricado' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações de Fabricação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {produto.tempo_producao_metros_hora && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tempo de Produção</p>
                        <p className="font-medium">{produto.tempo_producao_metros_hora} m/h</p>
                      </div>
                    )}
                    {produto.lead_time_dias && (
                      <div>
                        <p className="text-sm text-muted-foreground">Lead Time</p>
                        <p className="font-medium">{produto.lead_time_dias} dias</p>
                      </div>
                    )}
                    {produto.custo_total_por_metro && (
                      <div>
                        <p className="text-sm text-muted-foreground">Custo Total por Metro</p>
                        <p className="font-medium">{formatCurrency(produto.custo_total_por_metro)}</p>
                      </div>
                    )}
                    {produto.margem_real_percentual && (
                      <div>
                        <p className="text-sm text-muted-foreground">Margem Real</p>
                        <p className="font-medium">{produto.margem_real_percentual.toFixed(2)}%</p>
                      </div>
                    )}
                  </div>
                  {produto.instrucoes_tecnicas && (
                    <>
                      <Separator className="my-3" />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Instruções Técnicas</p>
                        <p className="text-sm whitespace-pre-wrap">{produto.instrucoes_tecnicas}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="text-sm">{formatBrazilianDateTimeLong(produto.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última atualização</p>
                    <p className="text-sm">{formatBrazilianDateTimeLong(produto.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex flex-row justify-between items-center gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-initial"
          >
            Fechar
          </Button>
          <div className="flex gap-2 flex-1 sm:flex-initial">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1 sm:flex-initial"
            >
              Excluir
            </Button>
            <Button
              onClick={handleEdit}
              className="flex-1 sm:flex-initial"
            >
              Editar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
