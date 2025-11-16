
export enum ProductType {
  Fabricado = 'fabricado',
  Revenda = 'revenda',
}

export interface Category {
  id: number;
  nome: string;
  tipo: ProductType;
}

export interface Fornecedor {
  id: number;
  nome_fantasia: string;
}

export interface MateriaPrima {
  id: number;
  nome: string;
  tipo: string;
  gramatura?: number;
  largura_mm?: number;
  peso_por_metro_g?: number; // calculado
  unidade_estoque: 'kg' | 'litro' | 'unidade';
  estoque_atual: number;
  estoque_minimo: number;
  custo_por_unidade: number; // R$/kg, R$/litro
  fornecedor_id: number;
}

export interface ReceitaItem {
  id: number;
  materia_prima_id: number;
  numero_camadas: number;
  consumo_por_metro_g: number; // calculado
  custo_por_metro: number; // calculado
}

export interface Produto {
  id: number;
  nome: string;
  codigo_interno?: string;
  categoria_id: number;
  tipo: ProductType;
  
  // Fabricado
  altura_mm?: number;
  largura_mm?: number;
  espessura_mm?: number;
  permite_medida_composta?: boolean;
  receita?: ReceitaItem[];
  
  // Revenda
  estoque_atual?: number;
  estoque_minimo?: number;
  fornecedor_id?: number;
  
  // Venda
  unidade_venda: 'metro' | 'kg' | 'unidade' | 'rolo';
  preco_venda_unitario: number;
  custo_compra?: number;
}
