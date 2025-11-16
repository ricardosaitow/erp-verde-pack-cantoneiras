
import { Produto, MateriaPrima, Category, Fornecedor, ProductType } from '../types';

export const mockCategorias: Category[] = [
  { id: 1, nome: 'Cantoneiras', tipo: ProductType.Fabricado },
  { id: 2, nome: 'Adesivos', tipo: ProductType.Revenda },
  { id: 3, nome: 'Embalagens', tipo: ProductType.Revenda },
];

export const mockFornecedores: Fornecedor[] = [
  { id: 1, nome_fantasia: 'Papelaria XYZ' },
  { id: 2, nome_fantasia: 'Distribuidora ABC' },
  { id: 3, nome_fantasia: 'Colas Industriais Ltda' },
];

export const mockMateriasPrimas: MateriaPrima[] = [
  { id: 1, nome: 'Bobina Kraft 400g - Largura 70mm', tipo: 'papel_kraft', gramatura: 400, largura_mm: 70, peso_por_metro_g: 28, unidade_estoque: 'kg', estoque_atual: 150, estoque_minimo: 50, custo_por_unidade: 12.00, fornecedor_id: 1 },
  { id: 2, nome: 'Bobina Kraft 130g - Largura 160mm', tipo: 'papel_kraft', gramatura: 130, largura_mm: 160, peso_por_metro_g: 20.8, unidade_estoque: 'kg', estoque_atual: 80, estoque_minimo: 40, custo_por_unidade: 10.00, fornecedor_id: 1 },
  { id: 3, nome: 'Cola PVA', tipo: 'cola_pva', unidade_estoque: 'kg', estoque_atual: 5, estoque_minimo: 2, custo_por_unidade: 30.00, fornecedor_id: 3 },
];

export const mockProdutos: Produto[] = [
  {
    id: 1,
    nome: 'Cantoneira 50x50x3mm',
    categoria_id: 1,
    tipo: ProductType.Fabricado,
    altura_mm: 50,
    largura_mm: 50,
    espessura_mm: 3,
    permite_medida_composta: true,
    unidade_venda: 'metro',
    preco_venda_unitario: 8.00,
    receita: [
      { id: 1, materia_prima_id: 1, numero_camadas: 4, consumo_por_metro_g: 112, custo_por_metro: 1.34 },
      { id: 2, materia_prima_id: 2, numero_camadas: 1, consumo_por_metro_g: 20.8, custo_por_metro: 0.21 },
    ],
  },
  {
    id: 2,
    nome: 'Fita Adesiva 48mm Transparente',
    categoria_id: 2,
    tipo: ProductType.Revenda,
    unidade_venda: 'rolo',
    preco_venda_unitario: 15.00,
    custo_compra: 12.00,
    estoque_atual: 150,
    estoque_minimo: 30,
    fornecedor_id: 2,
  },
  {
    id: 3,
    nome: 'Stretch Film 50cm',
    categoria_id: 3,
    tipo: ProductType.Revenda,
    unidade_venda: 'rolo',
    preco_venda_unitario: 45.00,
    custo_compra: 35.00,
    estoque_atual: 25,
    estoque_minimo: 30, // Low stock
    fornecedor_id: 2,
  },
  {
    id: 4,
    nome: 'Cantoneira 100x100x5mm',
    categoria_id: 1,
    tipo: ProductType.Fabricado,
    altura_mm: 100,
    largura_mm: 100,
    espessura_mm: 5,
    permite_medida_composta: true,
    unidade_venda: 'metro',
    preco_venda_unitario: 15.00,
    receita: [
      { id: 1, materia_prima_id: 1, numero_camadas: 8, consumo_por_metro_g: 224, custo_por_metro: 2.68 },
    ],
  },
];
