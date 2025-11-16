import { useState, useEffect } from 'react';
import { useProdutos } from '../hooks/useProdutos';
import { useMateriasPrimas } from '../hooks/useMateriasPrimas';
import type { ProdutoComCusto, MateriaPrima, AlertaEstoque } from '../lib/database.types';
import { formatQuantity } from '../lib/format';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { RefreshCw, AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';

export default function AlertasPage() {
  const { produtos, loading: loadingProdutos, error: errorProdutos, refresh: refreshProdutos } = useProdutos();
  const { materiasPrimas, loading: loadingMateriasPrimas, error: errorMateriasPrimas, refresh: refreshMateriasPrimas } = useMateriasPrimas();
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [filterNivel, setFilterNivel] = useState<string>('todos');

  useEffect(() => {
    const novosAlertas: AlertaEstoque[] = [];

    materiasPrimas.forEach(mp => {
      const estoqueAtual = Number(mp.estoque_atual) || 0;
      const estoqueMinimo = Number(mp.estoque_minimo) || 0;
      const estoquePontoReposicao = Number(mp.estoque_ponto_reposicao) || 0;

      if (estoqueAtual < estoquePontoReposicao) {
        novosAlertas.push({
          tipo_item: 'materia_prima',
          id: mp.id,
          nome: mp.nome,
          estoque_atual: estoqueAtual,
          estoque_minimo: estoqueMinimo,
          unidade_estoque: mp.unidade_estoque,
          nivel_alerta: 'critico',
        });
      } else if (estoqueAtual < estoqueMinimo) {
        novosAlertas.push({
          tipo_item: 'materia_prima',
          id: mp.id,
          nome: mp.nome,
          estoque_atual: estoqueAtual,
          estoque_minimo: estoqueMinimo,
          unidade_estoque: mp.unidade_estoque,
          nivel_alerta: 'baixo',
        });
      }
    });

    produtos
      .filter(p => p.tipo === 'revenda')
      .forEach(produto => {
        const estoqueAtual = Number(produto.estoque_atual) || 0;
        const estoqueMinimo = Number(produto.estoque_minimo) || 0;
        const estoquePontoReposicao = Number(produto.estoque_ponto_reposicao) || 0;

        if (estoqueAtual < estoquePontoReposicao) {
          novosAlertas.push({
            tipo_item: 'produto_revenda',
            id: produto.id,
            nome: produto.nome,
            estoque_atual: estoqueAtual,
            estoque_minimo: estoqueMinimo,
            unidade_estoque: produto.unidade_venda,
            nivel_alerta: 'critico',
          });
        } else if (estoqueAtual < estoqueMinimo) {
          novosAlertas.push({
            tipo_item: 'produto_revenda',
            id: produto.id,
            nome: produto.nome,
            estoque_atual: estoqueAtual,
            estoque_minimo: estoqueMinimo,
            unidade_estoque: produto.unidade_venda,
            nivel_alerta: 'baixo',
          });
        }
      });

    novosAlertas.sort((a, b) => {
      if (a.nivel_alerta === 'critico' && b.nivel_alerta !== 'critico') return -1;
      if (a.nivel_alerta !== 'critico' && b.nivel_alerta === 'critico') return 1;
      return 0;
    });

    setAlertas(novosAlertas);
  }, [materiasPrimas, produtos]);

  const filteredAlertas = alertas.filter(alerta => {
    if (filterNivel === 'todos') return true;
    return alerta.nivel_alerta === filterNivel;
  });

  const getNivelBadgeVariant = (nivel: string): 'destructive' | 'warning' => {
    return nivel === 'critico' ? 'destructive' : 'warning';
  };

  const getNivelLabel = (nivel: string) => {
    switch (nivel) {
      case 'critico':
        return 'Crítico';
      case 'baixo':
        return 'Baixo';
      default:
        return 'Normal';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'materia_prima':
        return 'Matéria-Prima';
      case 'produto_revenda':
        return 'Produto Revenda';
      default:
        return tipo;
    }
  };

  const getEstoqueTextColor = (nivel: string) => {
    return nivel === 'critico' ? 'text-red-600' : 'text-yellow-600';
  };

  const loading = loadingProdutos || loadingMateriasPrimas;
  const error = errorProdutos || errorMateriasPrimas;

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar alertas</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <Button
              onClick={() => {
                refreshProdutos();
                refreshMateriasPrimas();
              }}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Alertas de Estoque"
        description={alertas.length > 0 ? `Monitore itens com estoque baixo ou crítico. ${alertas.length} ${alertas.length === 1 ? 'alerta encontrado' : 'alertas encontrados'}` : 'Monitore itens com estoque baixo ou crítico'}
      >
        <Button
          onClick={() => {
            refreshProdutos();
            refreshMateriasPrimas();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </PageHeader>

      <Card className="p-4">
        <div className="space-y-2">
          <Label htmlFor="filterNivel">Filtrar por Nível de Alerta</Label>
          <Select value={filterNivel} onValueChange={setFilterNivel}>
            <SelectTrigger id="filterNivel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Alertas</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
              <SelectItem value="baixo">Baixo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="space-y-4">
        {filteredAlertas.length === 0 && alertas.length === 0 ? (
          <Card className="p-12">
            <EmptyState
              icon={<CheckCircle2 size={48} className="text-green-600" />}
              title="Nenhum alerta de estoque"
              description="Todos os itens estão com estoque adequado"
            />
          </Card>
        ) : filteredAlertas.length === 0 ? (
          <Card className="p-12">
            <EmptyState
              icon={<Bell size={48} />}
              title="Nenhum alerta encontrado"
              description="Nenhum alerta encontrado com o filtro selecionado"
            />
          </Card>
        ) : (
          filteredAlertas.map(alerta => {
            const falta = alerta.estoque_minimo - alerta.estoque_atual;

            return (
              <Card
                key={`${alerta.tipo_item}-${alerta.id}`}
                className={`hover:shadow-lg transition-shadow border-l-4 ${
                  alerta.nivel_alerta === 'critico' ? 'border-l-red-500' : 'border-l-yellow-500'
                }`}
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold">{alerta.nome}</h3>
                      <Badge variant={getNivelBadgeVariant(alerta.nivel_alerta)}>
                        {getNivelLabel(alerta.nivel_alerta)}
                      </Badge>
                      <Badge variant="outline">
                        {getTipoLabel(alerta.tipo_item)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Estoque Atual:</span>
                        <span className={`ml-2 font-bold ${getEstoqueTextColor(alerta.nivel_alerta)}`}>
                          {formatQuantity(alerta.estoque_atual, alerta.unidade_estoque)}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Estoque Mínimo:</span>
                        <span className="ml-2">{formatQuantity(alerta.estoque_minimo, alerta.unidade_estoque)}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Falta:</span>
                        <span className="ml-2 font-bold text-red-600">
                          {formatQuantity(falta, alerta.unidade_estoque)}
                        </span>
                      </div>
                    </div>
                    {alerta.nivel_alerta === 'critico' && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertDescription className="text-sm text-red-800 font-semibold">
                          ⚠️ Atenção: Estoque crítico! É necessário repor urgentemente.
                        </AlertDescription>
                      </Alert>
                    )}
                    {alerta.nivel_alerta === 'baixo' && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertDescription className="text-sm text-yellow-800 font-semibold">
                          ⚠️ Atenção: Estoque abaixo do mínimo. Considere repor em breve.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
