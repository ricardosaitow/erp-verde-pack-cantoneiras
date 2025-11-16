import type { ProdutoComCusto } from '../../lib/database.types';
import { ProductType } from '../../types';
import { formatCurrency } from '../../lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2, Factory, Package } from 'lucide-react';

interface ProductListItemProps {
  product: ProdutoComCusto | any;
  onEdit: (product: any) => void;
  onDelete: (id: string | number) => void;
  categoriaNome?: string;
}

export default function ProductListItem({ product, onEdit, onDelete, categoriaNome }: ProductListItemProps) {
  const category = categoriaNome || product.categoria?.nome || 'Sem categoria';
  const isManufactured = product.tipo === ProductType.Fabricado || product.tipo === 'fabricado';
  const precoVenda = product.preco_venda_unitario || 0;
  const unidadeVenda = product.unidade_venda || 'unidade';

  const getStockStatus = () => {
    const tipo = product.tipo === ProductType.Revenda || product.tipo === 'revenda';
    const estoqueAtual = product.estoque_atual;
    const estoqueMinimo = product.estoque_minimo;

    if (tipo && estoqueAtual !== undefined && estoqueMinimo !== undefined) {
      if (Number(estoqueAtual) < Number(estoqueMinimo)) {
        return <Badge variant="destructive" className="text-xs">Estoque Baixo</Badge>;
      }
      return <Badge variant="success" className="text-xs">Em Estoque</Badge>;
    }
    return null;
  };

  const getProductDetails = () => {
    if (isManufactured) {
      const compositionCount = product.receitas?.length || product.receita?.length || 0;
      const altura = product.altura_mm || 0;
      const largura = product.largura_mm || 0;
      const espessura = product.espessura_mm || 0;

      return (
        <div className="flex items-center text-sm text-muted-foreground space-x-4">
          {altura && largura && espessura && (
            <>
              <span>{altura}x{largura}x{espessura}mm</span>
              <span className="h-4 border-l"></span>
            </>
          )}
          <span>{compositionCount} {compositionCount === 1 ? 'matéria-prima' : 'matérias-primas'}</span>
        </div>
      );
    }

    const estoque = product.estoque_atual || 0;
    const unidade = product.unidade_venda || 'unidade';
    return (
      <div className="flex items-center text-sm text-muted-foreground space-x-4">
        <span>Estoque: <span className="font-medium text-foreground">{estoque} {unidade}(s)</span></span>
        <span className="h-4 border-l"></span>
        <span>Unidade: {unidade}</span>
      </div>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <div className={`flex-shrink-0 h-12 w-12 rounded-md flex items-center justify-center ${
            isManufactured
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-500'
              : 'bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-500'
          }`}>
            {isManufactured ? <Factory className="h-6 w-6" /> : <Package className="h-6 w-6" />}
          </div>
          <div>
            <p className="font-bold text-lg">{product.nome}</p>
            <div className="flex items-center text-sm text-muted-foreground mt-1 space-x-2">
              <Badge variant={isManufactured ? "default" : "secondary"} className={
                isManufactured
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                  : 'bg-sky-100 text-sky-800 hover:bg-sky-100'
              }>
                {isManufactured ? 'Fabricado' : 'Revenda'}
              </Badge>
              <span>•</span>
              <span>{category}</span>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto flex-1 sm:flex-none sm:mx-8">
          {getProductDetails()}
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-emerald-600">{formatCurrency(Number(precoVenda))}</span>
            <span className="text-sm text-muted-foreground">/{unidadeVenda}</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStockStatus()}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(product)}
              aria-label={`Editar ${product.nome}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(product.id)}
              aria-label={`Excluir ${product.nome}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
