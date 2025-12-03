import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { PedidoCompleto, Cliente, ProdutoComCusto, MateriaPrima } from '../../lib/database.types';
import { formatNumber, formatQuantity, formatCurrency } from '../../lib/format';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Trash2, ShoppingCart, Save, X, User, List, DollarSign, Truck, MessageSquare,
  AlertTriangle, ArrowRight, Check, RotateCcw, CreditCard, Calendar, History,
  Package, Scale
} from 'lucide-react';
import { ClientePedidosModal } from '@/components/clientes/ClientePedidosModal';
import {
  verificarEstoqueMateriasPrimas,
  verificarEstoqueProdutoRevenda,
} from '../../lib/calculos';
import { buscarLotesDisponiveis } from '../../lib/estoque';
import { supabase } from '../../lib/supabase';
import { baseClient } from '../../lib/base';
import { asaasClient } from '../../lib/asaas';
import type { AsaasBillingType } from '../../types/asaas';

// Tipos de cobrança disponíveis (Asaas)
const TIPOS_COBRANCA = [
  { value: 'BOLETO', label: 'Boleto Bancário' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
];

// Opções de parcelamento
const OPCOES_PARCELAS = [
  { value: 1, label: 'À Vista (1x)' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x' },
  { value: 5, label: '5x' },
  { value: 6, label: '6x' },
  { value: 7, label: '7x' },
  { value: 8, label: '8x' },
  { value: 9, label: '9x' },
  { value: 10, label: '10x' },
  { value: 11, label: '11x' },
  { value: 12, label: '12x' },
  { value: 15, label: '15x' },
  { value: 18, label: '18x' },
  { value: 21, label: '21x (Visa/Master)' },
];

// Tipos de frete disponíveis
const TIPOS_FRETE = [
  { value: 'CIF', label: 'CIF (Frete por conta do vendedor)' },
  { value: 'FOB', label: 'FOB (Frete por conta do comprador)' },
  { value: 'SEM_FRETE', label: 'Sem Frete (Retira)' },
];

interface BaseBankOption {
  id: number;
  name: string;
  code: string | null;
}

interface AlertaCustoLote {
  materia_prima_id: string;
  materia_prima_nome: string;
  custo_atual: number;
  custo_lote: number;
  diferenca_percentual: number;
}

interface PedidoItemForm {
  produto_id: string;
  tipo_produto: 'fabricado' | 'revenda';
  quantidade_pecas?: number;
  comprimento_cada_mm?: number;
  total_calculado?: number;
  quantidade_simples?: number;
  unidade_medida: string;
  preco_unitario: number;
  subtotal: number;
  observacoes?: string;
  // Campos de frete CIF
  frete_unitario?: number;
  frete_total_item?: number;
  preco_unitario_com_frete?: number;
  subtotal_com_frete?: number;
  materiais_necessarios?: Array<{
    materia_prima_id: string;
    materia_nome: string;
    consumo_kg: number;
    estoque_disponivel_kg: number;
    disponivel: boolean;
    unidade_estoque: string;
    // Novos campos para custo do lote
    custo_administrativo?: number;
    custo_lote?: number;
    tem_diferenca_custo?: boolean;
  }>;
  estoque_produto?: {
    disponivel: number;
    necessario: number;
    suficiente: boolean;
  };
  alertas_custo?: AlertaCustoLote[];
}

interface PedidoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<{ error: string | null; data?: any }>;
  onUpdate: (id: string, data: any) => Promise<{ error: string | null; data?: any }>;
  pedido: PedidoCompleto | null;
  clientes: Cliente[];
  produtos: ProdutoComCusto[];
  materiasPrimas: MateriaPrima[];
  onSuccess: () => void;
}

export default function PedidoFormModal({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  pedido,
  clientes,
  produtos,
  materiasPrimas,
  onSuccess,
}: PedidoFormModalProps) {
  // Estado para alertas de custo consolidados
  const [alertasCustoGlobal, setAlertasCustoGlobal] = useState<AlertaCustoLote[]>([]);
  const [verificandoCustos, setVerificandoCustos] = useState(false);
  const [mostrarModalCusto, setMostrarModalCusto] = useState(false);

  // Estado para modal de histórico de pedidos do cliente
  const [showPedidosModal, setShowPedidosModal] = useState(false);

  // Estado para bancos
  const [bancos, setBancos] = useState<BaseBankOption[]>([]);
  const [carregandoBancos, setCarregandoBancos] = useState(false);

  // Transportadoras do banco local
  const [transportadoras, setTransportadoras] = useState<{ id: string; nome: string }[]>([]);
  const [carregandoTransportadoras, setCarregandoTransportadoras] = useState(false);

  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo: 'orcamento' as 'orcamento' | 'pedido_confirmado',
    status: 'pendente' as 'pendente' | 'aprovado' | 'producao' | 'finalizado' | 'aguardando_despacho' | 'entregue' | 'cancelado' | 'recusado',
    data_pedido: new Date().toLocaleDateString('en-CA'), // Formato YYYY-MM-DD no fuso local
    valor_produtos: 0,
    valor_frete: 0,
    valor_desconto: 0,
    valor_total: 0,
    prazo_entrega_dias: '',
    forma_pagamento: '',
    condicoes_pagamento: '',
    observacoes: '',
    // Dados de Pagamento para NF-e
    tipo_cobranca: 'BOLETO',
    banco_id: 0,
    data_vencimento: '',
    // Dados de Transporte
    transportadora_id: '',
    tipo_frete: 'CIF',
    // Dados de Volume/Peso para NF-e
    quantidade_volumes: 1,
    especie_volumes: 'PALLET',
    marca_volumes: '1',
    numeracao_volumes: '1',
    peso_bruto_kg: 0,
    peso_liquido_kg: 0,
    // Dados Fiscais
    cfop: '5101', // Padrão SP
    dados_adicionais_nfe: '',
    // Dados de Cobrança Asaas
    gerar_cobranca_asaas: true,
    numero_parcelas: 1,
    valor_parcela: 0,
    desconto_antecipado_valor: 0,
    desconto_antecipado_dias: 0,
    desconto_antecipado_tipo: 'FIXED' as 'FIXED' | 'PERCENTAGE',
    juros_atraso: 0, // % ao mês
    multa_atraso: 0, // % ou valor fixo
    multa_atraso_tipo: 'PERCENTAGE' as 'FIXED' | 'PERCENTAGE',
  });

  const [itens, setItens] = useState<PedidoItemForm[]>([]);

  // Função para verificar custos dos lotes vs custos administrativos
  const verificarCustosLotes = async (itensAtuais: PedidoItemForm[]) => {
    const alertas: AlertaCustoLote[] = [];
    const materiaisVerificados = new Set<string>();

    for (const item of itensAtuais) {
      if (item.tipo_produto !== 'fabricado' || !item.materiais_necessarios) continue;

      for (const material of item.materiais_necessarios) {
        // Evitar verificar o mesmo material mais de uma vez
        if (materiaisVerificados.has(material.materia_prima_id)) continue;
        materiaisVerificados.add(material.materia_prima_id);

        // Buscar matéria-prima para obter custo administrativo atual
        const mp = materiasPrimas.find(m => m.id === material.materia_prima_id);
        if (!mp) continue;

        const custoAdministrativo = Number(mp.custo_por_unidade) || 0;

        // Buscar lotes disponíveis (PEPS - primeiro a entrar, primeiro a sair)
        const { lotes } = await buscarLotesDisponiveis(material.materia_prima_id);

        if (lotes && lotes.length > 0) {
          // Pegar o primeiro lote (PEPS)
          const lotePEPS = lotes[0];
          const custoLote = Number(lotePEPS.custo_real_por_kg) || 0;

          // Atualizar os campos de custo no material
          material.custo_administrativo = custoAdministrativo;
          material.custo_lote = custoLote;

          // Verificar se há diferença significativa (> 0.01 para evitar problemas de precisão)
          if (Math.abs(custoLote - custoAdministrativo) > 0.01 && custoAdministrativo > 0) {
            const diferencaPercentual = ((custoLote - custoAdministrativo) / custoAdministrativo) * 100;
            material.tem_diferenca_custo = true;

            alertas.push({
              materia_prima_id: material.materia_prima_id,
              materia_prima_nome: material.materia_nome,
              custo_atual: custoAdministrativo,
              custo_lote: custoLote,
              diferenca_percentual: diferencaPercentual,
            });
          } else {
            material.tem_diferenca_custo = false;
          }
        }
      }
    }

    return alertas;
  };

  // Verificar custos quando itens mudam
  useEffect(() => {
    const verificar = async () => {
      if (itens.length === 0) {
        setAlertasCustoGlobal([]);
        return;
      }

      // Verificar se tem algum produto fabricado com materiais
      const temFabricado = itens.some(
        item => item.tipo_produto === 'fabricado' && item.materiais_necessarios && item.materiais_necessarios.length > 0
      );

      if (!temFabricado) {
        setAlertasCustoGlobal([]);
        return;
      }

      setVerificandoCustos(true);
      const alertas = await verificarCustosLotes(itens);
      setAlertasCustoGlobal(alertas);
      setVerificandoCustos(false);
    };

    verificar();
  }, [itens, materiasPrimas]);

  // Carregar bancos e transportadoras quando modal abre
  useEffect(() => {
    if (isOpen) {
      carregarBancosETransportadoras();
    }
  }, [isOpen]);

  const carregarBancosETransportadoras = async () => {
    setCarregandoBancos(true);
    try {
      // Carregar bancos do Base ERP
      const bancosResponse = await baseClient.listBanks();
      const bancosData = (bancosResponse.data as any)?.content || bancosResponse.data || [];
      if (Array.isArray(bancosData)) {
        setBancos(bancosData);
        // Se não tiver banco selecionado, selecionar o primeiro
        if (bancosData.length > 0 && !formData.banco_id) {
          setFormData(prev => ({ ...prev, banco_id: bancosData[0].id }));
        }
      }

      // Carregar transportadoras do banco local
      setCarregandoTransportadoras(true);
      const { data: transportadorasData, error: transportadorasError } = await supabase
        .from('transportadoras')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (!transportadorasError && transportadorasData) {
        setTransportadoras(transportadorasData);
      }
      setCarregandoTransportadoras(false);
    } catch (error) {
      console.error('Erro ao carregar bancos/transportadoras:', error);
    } finally {
      setCarregandoBancos(false);
    }
  };

  // Initialize form when editing
  useEffect(() => {
    if (pedido && isOpen) {
      setFormData({
        cliente_id: pedido.cliente_id,
        tipo: pedido.tipo,
        status: pedido.status,
        data_pedido: pedido.data_pedido.split('T')[0],
        valor_produtos: Number(pedido.valor_produtos) || 0,
        valor_frete: Number(pedido.valor_frete) || 0,
        valor_desconto: Number(pedido.valor_desconto) || 0,
        valor_total: Number(pedido.valor_total) || 0,
        prazo_entrega_dias: pedido.prazo_entrega_dias?.toString() || '',
        forma_pagamento: pedido.forma_pagamento || '',
        condicoes_pagamento: pedido.condicoes_pagamento || '',
        observacoes: pedido.observacoes || '',
        // Novos campos
        tipo_cobranca: pedido.tipo_cobranca || 'BOLETO',
        banco_id: pedido.banco_id || 0,
        data_vencimento: pedido.data_vencimento || '',
        transportadora_id: pedido.transportadora_id || '',
        tipo_frete: pedido.tipo_frete || 'CIF',
        // Dados de Volume/Peso para NF-e
        quantidade_volumes: (pedido as any).quantidade_volumes || 1,
        especie_volumes: (pedido as any).especie_volumes || 'PALLET',
        marca_volumes: (pedido as any).marca_volumes || '1',
        numeracao_volumes: (pedido as any).numeracao_volumes || '1',
        peso_bruto_kg: (pedido as any).peso_bruto_kg || 0,
        peso_liquido_kg: (pedido as any).peso_liquido_kg || 0,
        // Dados Fiscais
        cfop: (pedido as any).cfop || '5101',
        dados_adicionais_nfe: (pedido as any).dados_adicionais_nfe || '',
        // Dados de Cobrança Asaas
        gerar_cobranca_asaas: (pedido as any).gerar_cobranca_asaas || false,
        numero_parcelas: (pedido as any).numero_parcelas || 1,
        valor_parcela: (pedido as any).valor_parcela || 0,
        desconto_antecipado_valor: (pedido as any).desconto_antecipado_valor || 0,
        desconto_antecipado_dias: (pedido as any).desconto_antecipado_dias || 0,
        desconto_antecipado_tipo: (pedido as any).desconto_antecipado_tipo || 'FIXED',
        juros_atraso: (pedido as any).juros_atraso || 0,
        multa_atraso: (pedido as any).multa_atraso || 0,
        multa_atraso_tipo: (pedido as any).multa_atraso_tipo || 'PERCENTAGE',
      });

      if (pedido.itens) {
        const itensForm: PedidoItemForm[] = pedido.itens.map(item => ({
          produto_id: item.produto_id,
          tipo_produto: item.tipo_produto as 'fabricado' | 'revenda',
          quantidade_pecas: item.quantidade_pecas || undefined,
          comprimento_cada_mm: item.comprimento_cada_mm || undefined,
          total_calculado: item.total_calculado || undefined,
          quantidade_simples: item.quantidade_simples || undefined,
          unidade_medida: item.unidade_medida,
          preco_unitario: Number(item.preco_unitario) || 0,
          subtotal: Number(item.subtotal) || 0,
          observacoes: item.observacoes || undefined,
        }));
        setItens(itensForm);
      }
    } else if (!pedido && isOpen) {
      resetForm();
    }
  }, [pedido, isOpen]);

  const resetForm = () => {
    // Calcular data de vencimento padrão (30 dias)
    const dataVencimentoPadrao = new Date();
    dataVencimentoPadrao.setDate(dataVencimentoPadrao.getDate() + 30);

    setFormData({
      cliente_id: '',
      tipo: 'orcamento',
      status: 'pendente',
      data_pedido: new Date().toLocaleDateString('en-CA'), // Formato YYYY-MM-DD no fuso local
      valor_produtos: 0,
      valor_frete: 0,
      valor_desconto: 0,
      valor_total: 0,
      prazo_entrega_dias: '',
      forma_pagamento: '',
      condicoes_pagamento: '',
      observacoes: '',
      // Novos campos com valores padrão
      tipo_cobranca: 'BOLETO',
      banco_id: bancos.length > 0 ? bancos[0].id : 0,
      data_vencimento: dataVencimentoPadrao.toISOString().split('T')[0],
      transportadora_id: '',
      tipo_frete: 'CIF',
      // Dados de Volume/Peso para NF-e
      quantidade_volumes: 1,
      especie_volumes: 'PALLET',
      marca_volumes: '1',
      numeracao_volumes: '1',
      peso_bruto_kg: 0,
      peso_liquido_kg: 0,
      // Dados Fiscais
      cfop: '5101',
      dados_adicionais_nfe: '',
      // Dados de Cobrança Asaas
      gerar_cobranca_asaas: true,
      numero_parcelas: 1,
      valor_parcela: 0,
      desconto_antecipado_valor: 0,
      desconto_antecipado_dias: 0,
      desconto_antecipado_tipo: 'FIXED',
      juros_atraso: 0,
      multa_atraso: 0,
      multa_atraso_tipo: 'PERCENTAGE',
    });
    setItens([]);
  };

  const clientesOptions = useMemo(() => {
    return clientes
      .filter(c => c.ativo)
      .map(cliente => ({
        value: cliente.id,
        label: cliente.nome_fantasia || cliente.razao_social || 'Cliente sem nome',
      }));
  }, [clientes]);

  // Atualiza CFOP automaticamente quando o cliente muda
  useEffect(() => {
    if (formData.cliente_id) {
      const cliente = clientes.find(c => c.id === formData.cliente_id);
      if (cliente) {
        const novoCFOP = calcularCFOP(cliente.estado);
        if (novoCFOP !== formData.cfop) {
          setFormData(prev => ({ ...prev, cfop: novoCFOP }));
        }
      }
    }
  }, [formData.cliente_id, clientes]);

  // Atualiza dados adicionais da NF-e quando o valor total muda
  useEffect(() => {
    if (formData.valor_total > 0) {
      const dadosAdicionais = calcularDadosAdicionaisNFe(formData.valor_total);
      if (dadosAdicionais !== formData.dados_adicionais_nfe) {
        setFormData(prev => ({ ...prev, dados_adicionais_nfe: dadosAdicionais }));
      }
    }
  }, [formData.valor_total]);

  // Atualiza numeração dos volumes quando a quantidade muda
  useEffect(() => {
    const novaNumeracao = gerarNumeracaoVolumes(formData.quantidade_volumes);
    if (novaNumeracao !== formData.numeracao_volumes) {
      setFormData(prev => ({ ...prev, numeracao_volumes: novaNumeracao }));
    }
  }, [formData.quantidade_volumes]);

  // Atualiza peso líquido automaticamente quando os itens mudam
  useEffect(() => {
    const novoPesoLiquido = calcularPesoLiquido(itens);
    if (novoPesoLiquido !== formData.peso_liquido_kg) {
      setFormData(prev => ({ ...prev, peso_liquido_kg: novoPesoLiquido }));
    }
  }, [itens, produtos]);

  // Atualiza peso bruto quando peso líquido ou quantidade de volumes muda
  useEffect(() => {
    const pesoPallets = formData.quantidade_volumes * PESO_PALLET_KG;
    const novoPesoBruto = formData.peso_liquido_kg + pesoPallets;
    if (novoPesoBruto !== formData.peso_bruto_kg) {
      setFormData(prev => ({ ...prev, peso_bruto_kg: novoPesoBruto }));
    }
  }, [formData.peso_liquido_kg, formData.quantidade_volumes]);

  const addItem = () => {
    const novoItem: PedidoItemForm = {
      produto_id: '',
      tipo_produto: 'fabricado',
      quantidade_simples: 1,
      unidade_medida: 'metro',
      preco_unitario: 0,
      subtotal: 0,
      total_calculado: undefined,
    };
    setItens([...itens, novoItem]);
  };

  const removeItem = (index: number) => {
    let newItens = itens.filter((_, i) => i !== index);
    // Redistribuir frete se for CIF e tiver frete
    if (formData.tipo_frete === 'CIF' && formData.valor_frete > 0 && newItens.length > 0) {
      newItens = distribuirFrete(newItens, formData.valor_frete);
    }
    setItens(newItens);
    calcularTotais(newItens);
  };

  const updateItem = (index: number, field: keyof PedidoItemForm, value: any) => {
    const newItens = [...itens];
    const item = newItens[index];
    const produto = produtos.find(p => p.id === item.produto_id);

    if (field === 'produto_id') {
      const produto = produtos.find(p => p.id === value);
      if (produto) {
        item.produto_id = value;
        item.tipo_produto = produto.tipo as 'fabricado' | 'revenda';
        item.preco_unitario = Number(produto.preco_venda_unitario) || 0;
        item.unidade_medida = produto.unidade_venda;
        item.materiais_necessarios = undefined;
        item.estoque_produto = undefined;

        if (produto.permite_medida_composta && produto.tipo === 'fabricado') {
          item.quantidade_pecas = 1;
          item.comprimento_cada_mm = 1000;
          item.quantidade_simples = undefined;
          const totalMetros = (item.quantidade_pecas * item.comprimento_cada_mm) / 1000;
          item.subtotal = totalMetros * item.preco_unitario;
          item.total_calculado = totalMetros;

          if (produto.receitas && produto.receitas.length > 0 && totalMetros > 0) {
            const verificacao = verificarEstoqueMateriasPrimas(
              totalMetros,
              produto.receitas,
              materiasPrimas
            );
            item.materiais_necessarios = verificacao.materiais;
          }
        } else if (produto.tipo === 'fabricado' && !produto.permite_medida_composta) {
          item.quantidade_simples = item.quantidade_simples || 1;
          item.quantidade_pecas = undefined;
          item.comprimento_cada_mm = undefined;
          item.total_calculado = item.quantidade_simples;
          item.subtotal = item.quantidade_simples * item.preco_unitario;

          if (produto.receitas && produto.receitas.length > 0 && item.quantidade_simples > 0) {
            const verificacao = verificarEstoqueMateriasPrimas(
              item.quantidade_simples,
              produto.receitas,
              materiasPrimas
            );
            item.materiais_necessarios = verificacao.materiais;
          }
        } else {
          item.quantidade_simples = item.quantidade_simples || 1;
          item.quantidade_pecas = undefined;
          item.comprimento_cada_mm = undefined;
          item.total_calculado = undefined;
          item.subtotal = item.quantidade_simples * item.preco_unitario;

          if (produto.tipo === 'revenda') {
            const verificacao = verificarEstoqueProdutoRevenda(produto, item.quantidade_simples);
            item.estoque_produto = {
              disponivel: verificacao.disponivel_estoque,
              necessario: verificacao.necessario,
              suficiente: verificacao.suficiente,
            };
          }
        }
      }
    } else if (field === 'quantidade_simples') {
      item.quantidade_simples = Number(value) || 0;
      item.subtotal = item.quantidade_simples * item.preco_unitario;
      item.quantidade_pecas = undefined;
      item.comprimento_cada_mm = undefined;
      item.estoque_produto = undefined;

      if (produto) {
        if (produto.tipo === 'revenda') {
          const verificacao = verificarEstoqueProdutoRevenda(produto, item.quantidade_simples);
          item.estoque_produto = {
            disponivel: verificacao.disponivel_estoque,
            necessario: verificacao.necessario,
            suficiente: verificacao.suficiente,
          };
          item.materiais_necessarios = undefined;
        } else if (produto.tipo === 'fabricado') {
          item.total_calculado = item.quantidade_simples;
          item.materiais_necessarios = undefined;

          if (produto.receitas && produto.receitas.length > 0 && item.quantidade_simples > 0) {
            const verificacao = verificarEstoqueMateriasPrimas(
              item.quantidade_simples,
              produto.receitas,
              materiasPrimas
            );
            item.materiais_necessarios = verificacao.materiais;
          }
        }
      }
    } else if (field === 'quantidade_pecas' || field === 'comprimento_cada_mm') {
      (item as any)[field] = Number(value) || 0;
      if (item.quantidade_pecas && item.comprimento_cada_mm) {
        const totalMetros = (item.quantidade_pecas * item.comprimento_cada_mm) / 1000;
        item.subtotal = totalMetros * item.preco_unitario;
        item.total_calculado = totalMetros;
        item.quantidade_simples = undefined;
        item.estoque_produto = undefined;

        if (produto && produto.tipo === 'fabricado' && produto.receitas && produto.receitas.length > 0 && totalMetros > 0) {
          const verificacao = verificarEstoqueMateriasPrimas(
            totalMetros,
            produto.receitas,
            materiasPrimas
          );
          item.materiais_necessarios = verificacao.materiais;
        } else {
          item.materiais_necessarios = undefined;
        }
      }
    } else {
      (item as any)[field] = value;
    }

    // Redistribuir frete se for CIF e houver mudança de quantidade ou produto
    let itensAtualizados = newItens;
    if (formData.tipo_frete === 'CIF' && formData.valor_frete > 0) {
      const camposQueAfetamFrete = ['quantidade_pecas', 'comprimento_cada_mm', 'quantidade_simples', 'produto_id'];
      if (camposQueAfetamFrete.includes(field as string)) {
        itensAtualizados = distribuirFrete(newItens, formData.valor_frete);
      }
    }

    setItens(itensAtualizados);
    calcularTotais(itensAtualizados);
  };

  // Atualizar custo administrativo de uma matéria-prima
  const atualizarCustoMateriaPrima = async (materiaPrimaId: string, novoCusto: number) => {
    try {
      // Buscar custo atual para histórico
      const { data: mp } = await supabase
        .from('materias_primas')
        .select('custo_por_unidade, historico_custos')
        .eq('id', materiaPrimaId)
        .single();

      const historico = mp?.historico_custos || [];
      historico.push({
        data: new Date().toISOString(),
        custo_anterior: mp?.custo_por_unidade || 0,
        custo_novo: novoCusto,
        motivo: 'Atualização manual durante criação de orçamento (PEPS)',
      });

      // Atualizar custo
      const { error } = await supabase
        .from('materias_primas')
        .update({
          custo_por_unidade: novoCusto,
          historico_custos: historico,
        })
        .eq('id', materiaPrimaId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Erro ao atualizar custo:', err);
      return { success: false, error: err };
    }
  };

  // Lidar com decisão do gestor sobre custo
  const handleDecisaoCusto = async (alerta: AlertaCustoLote, acao: 'atualizar' | 'manter') => {
    if (acao === 'atualizar') {
      const result = await atualizarCustoMateriaPrima(alerta.materia_prima_id, alerta.custo_lote);
      if (result.success) {
        toast.success(`Custo de ${alerta.materia_prima_nome} atualizado para ${formatCurrency(alerta.custo_lote)}/kg`);
        // Remover alerta da lista
        setAlertasCustoGlobal(prev => prev.filter(a => a.materia_prima_id !== alerta.materia_prima_id));
      } else {
        toast.error('Erro ao atualizar custo');
      }
    } else {
      toast.info(`Custo de ${alerta.materia_prima_nome} mantido em ${formatCurrency(alerta.custo_atual)}/kg`);
      // Remover alerta da lista
      setAlertasCustoGlobal(prev => prev.filter(a => a.materia_prima_id !== alerta.materia_prima_id));
    }
  };

  const calcularTotais = (itensAtuais: PedidoItemForm[], frete: number = formData.valor_frete, desconto: number = formData.valor_desconto) => {
    const valorProdutos = itensAtuais.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    const valorFrete = Number(frete) || 0;
    const valorDesconto = Number(desconto) || 0;
    const valorTotal = valorProdutos + valorFrete - valorDesconto;

    setFormData(prev => ({
      ...prev,
      valor_produtos: valorProdutos,
      valor_frete: valorFrete,
      valor_desconto: valorDesconto,
      valor_total: valorTotal,
    }));
  };

  // Função para determinar o CFOP baseado no estado do cliente
  // 5101 = Venda dentro do estado (SP)
  // 6101 = Venda fora do estado
  const calcularCFOP = (estadoCliente: string | undefined): string => {
    const estadoEmpresa = 'SP'; // Estado da empresa VerdePack
    if (!estadoCliente) return '5101'; // Padrão dentro do estado
    return estadoCliente.toUpperCase() === estadoEmpresa ? '5101' : '6101';
  };

  // Função para gerar a numeração dos volumes (ex: "1", "1-3" para 3 pallets)
  const gerarNumeracaoVolumes = (quantidade: number): string => {
    if (quantidade <= 1) return '1';
    return `1-${quantidade}`;
  };

  // Função para calcular os dados adicionais da NF-e
  // Crédito ICMS = 1,96% sobre o valor total
  const calcularDadosAdicionaisNFe = (valorTotal: number): string => {
    const aliquotaICMS = 1.96;
    const creditoICMS = (valorTotal * aliquotaICMS) / 100;

    return `Permite o aproveitamento do crédito de ICMS no valor de R$ ${creditoICMS.toFixed(2).replace('.', ',')}. Correspondente à alíquota de ${aliquotaICMS.toFixed(2).replace('.', ',')}%, nos termos do artigo 23 da LC 123. - Trib aprox: R$ 0,00 Federal e R$ 0,00 Estadual Fonte: IBPT Ar5Fr7`;
  };

  // Função para calcular peso líquido dos produtos
  // Para cantoneiras: o consumo_por_metro_g representa o consumo de matéria-prima por metro de BOBINA
  // O peso final do produto depende da largura da cantoneira vs largura da bobina
  // Fórmula: (consumo_por_metro_g × fator_largura × metros) / 1000 = peso em kg
  // Onde fator_largura = (altura_mm + largura_mm) / largura_bobina (geralmente 1000mm)
  const calcularPesoLiquido = (itensAtuais: PedidoItemForm[]): number => {
    let pesoTotalKg = 0;
    const LARGURA_BOBINA_MM = 1000; // Largura padrão da bobina de papel

    for (const item of itensAtuais) {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (!produto) continue;

      // Usar total_calculado se disponível (já está em metros)
      // Senão calcular baseado em quantidade_pecas/comprimento_cada_mm ou quantidade_simples
      let totalMetros = 0;
      if (item.total_calculado && item.total_calculado > 0) {
        // total_calculado já está em metros
        totalMetros = item.total_calculado;
      } else if (item.quantidade_pecas && item.comprimento_cada_mm) {
        // Medida composta: peças × comprimento em mm → converter para metros
        totalMetros = (item.quantidade_pecas * item.comprimento_cada_mm) / 1000;
      } else if (item.quantidade_simples && item.unidade_medida === 'metro') {
        // Quantidade simples em metros
        totalMetros = item.quantidade_simples;
      }

      if (totalMetros > 0 && produto.tipo === 'fabricado' && produto.receitas && produto.receitas.length > 0) {
        // Somar o consumo_por_metro_g de todas as receitas do produto
        const consumoTotalPorMetroG = produto.receitas.reduce(
          (sum, receita) => sum + (receita.consumo_por_metro_g || 0),
          0
        );

        // Calcular fator de largura baseado nas dimensões do produto
        // Para cantoneiras: largura_desenvolvida = altura + largura (as duas abas)
        // Ex: Cantoneira 40x40 = 80mm de largura desenvolvida
        const alturaP = produto.altura_mm || 0;
        const larguraP = produto.largura_mm || 0;
        const larguraDesenvolvida = alturaP + larguraP; // Largura total da cantoneira "aberta"

        // Fator de conversão: quanto da bobina é usada para fazer o produto
        // Se não tiver dimensões cadastradas, assume fator 1 (sem conversão)
        const fatorLargura = larguraDesenvolvida > 0 ? larguraDesenvolvida / LARGURA_BOBINA_MM : 1;

        // Calcular peso em kg: (gramas por metro de bobina × fator × metros) / 1000
        const pesoItemKg = (consumoTotalPorMetroG * fatorLargura * totalMetros) / 1000;
        pesoTotalKg += pesoItemKg;
      } else if (item.quantidade_simples && produto.tipo === 'revenda') {
        // Para produtos de revenda, usar peso_por_unidade_kg se existir
        const pesoPorUnidade = (produto as any).peso_por_unidade_kg || 0;
        pesoTotalKg += item.quantidade_simples * pesoPorUnidade;
      }
    }

    return pesoTotalKg;
  };

  // Constante: peso do pallet em kg
  const PESO_PALLET_KG = 10;

  // Função para obter a quantidade de um item (peças ou simples)
  const getQuantidadeItem = (item: PedidoItemForm): number => {
    if (item.quantidade_pecas && item.quantidade_pecas > 0) {
      return item.quantidade_pecas;
    }
    return item.quantidade_simples || 0;
  };

  // Função para distribuir frete proporcionalmente entre os itens por quantidade
  const distribuirFrete = (itensAtuais: PedidoItemForm[], valorFrete: number): PedidoItemForm[] => {
    if (formData.tipo_frete !== 'CIF' || valorFrete <= 0 || itensAtuais.length === 0) {
      // Se não for CIF ou não tiver frete, limpar campos de frete dos itens
      return itensAtuais.map(item => ({
        ...item,
        frete_unitario: undefined,
        frete_total_item: undefined,
        preco_unitario_com_frete: undefined,
        subtotal_com_frete: undefined,
      }));
    }

    const totalQuantidade = itensAtuais.reduce((sum, item) => sum + getQuantidadeItem(item), 0);

    if (totalQuantidade === 0) {
      return itensAtuais;
    }

    const freteUnitario = valorFrete / totalQuantidade;

    return itensAtuais.map(item => {
      const quantidade = getQuantidadeItem(item);
      const freteTotalItem = freteUnitario * quantidade;
      return {
        ...item,
        frete_unitario: freteUnitario,
        frete_total_item: freteTotalItem,
        preco_unitario_com_frete: item.preco_unitario + freteUnitario,
        subtotal_com_frete: item.subtotal + freteTotalItem,
      };
    });
  };

  // Função para recalcular frete de um item específico e redistribuir o restante
  const recalcularFreteItem = (itensAtuais: PedidoItemForm[], itemIndex: number, novoFreteUnitario: number): PedidoItemForm[] => {
    if (formData.tipo_frete !== 'CIF') return itensAtuais;

    const valorFreteTotal = Number(formData.valor_frete) || 0;
    if (valorFreteTotal <= 0) return itensAtuais;

    const itemAlterado = itensAtuais[itemIndex];
    const quantidadeItemAlterado = getQuantidadeItem(itemAlterado);
    const freteTotalItemAlterado = novoFreteUnitario * quantidadeItemAlterado;

    // Calcular frete restante para os outros itens
    const freteRestante = valorFreteTotal - freteTotalItemAlterado;
    const outrosItens = itensAtuais.filter((_, i) => i !== itemIndex);
    const totalQuantidadeOutros = outrosItens.reduce((sum, item) => sum + getQuantidadeItem(item), 0);

    const novoFreteUnitarioOutros = totalQuantidadeOutros > 0
      ? freteRestante / totalQuantidadeOutros
      : 0;

    return itensAtuais.map((item, index) => {
      const quantidade = getQuantidadeItem(item);
      if (index === itemIndex) {
        return {
          ...item,
          frete_unitario: novoFreteUnitario,
          frete_total_item: freteTotalItemAlterado,
          preco_unitario_com_frete: item.preco_unitario + novoFreteUnitario,
          subtotal_com_frete: item.subtotal + freteTotalItemAlterado,
        };
      } else {
        const freteTotalItem = novoFreteUnitarioOutros * quantidade;
        return {
          ...item,
          frete_unitario: novoFreteUnitarioOutros,
          frete_total_item: freteTotalItem,
          preco_unitario_com_frete: item.preco_unitario + novoFreteUnitarioOutros,
          subtotal_com_frete: item.subtotal + freteTotalItem,
        };
      }
    });
  };

  // Função para validar se a distribuição do frete está correta
  const validarDistribuicaoFrete = (): { status: 'correto' | 'abaixo' | 'acima'; diferenca: number } | null => {
    if (formData.tipo_frete !== 'CIF') return null;

    const valorFreteTotal = Number(formData.valor_frete) || 0;
    if (valorFreteTotal <= 0) return null;

    const freteDistribuido = itens.reduce(
      (sum, item) => sum + (item.frete_total_item || 0),
      0
    );
    const diferenca = valorFreteTotal - freteDistribuido;

    if (Math.abs(diferenca) < 0.01) {
      return { status: 'correto', diferenca: 0 };
    } else if (diferenca > 0) {
      return { status: 'abaixo', diferenca };
    } else {
      return { status: 'acima', diferenca: Math.abs(diferenca) };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    // Validar se todos os itens têm produto selecionado
    const itensSemProduto = itens.filter(item => !item.produto_id);
    if (itensSemProduto.length > 0) {
      toast.error('Todos os itens devem ter um produto selecionado');
      return;
    }

    const problemasEstoque: string[] = [];

    for (const item of itens) {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (!produto) continue;

      if (produto.tipo === 'fabricado' && item.materiais_necessarios) {
        const materiaisFaltantes = item.materiais_necessarios.filter(m => !m.disponivel);
        if (materiaisFaltantes.length > 0) {
          for (const materia of materiaisFaltantes) {
            problemasEstoque.push(
              `${produto.nome}: ${materia.materia_nome} - Necessário: ${formatQuantity(materia.consumo_kg, materia.unidade_estoque)}, Disponível: ${formatQuantity(materia.estoque_disponivel_kg, materia.unidade_estoque)}`
            );
          }
        }
      } else if (produto.tipo === 'revenda' && item.estoque_produto) {
        if (!item.estoque_produto.suficiente) {
          problemasEstoque.push(
            `${produto.nome}: Necessário: ${item.estoque_produto.necessario}, Disponível: ${item.estoque_produto.disponivel}`
          );
        }
      }
    }

    if (problemasEstoque.length > 0) {
      toast.error(
        'Estoque insuficiente para os seguintes itens. Ajuste as quantidades ou compre mais materiais antes de criar o pedido.'
      );
      return;
    }

    const pedidoData: any = {
      cliente_id: formData.cliente_id,
      data_pedido: formData.data_pedido,
      tipo: formData.tipo,
      // Novos pedidos sempre são criados como "pendente"
      // Status só pode ser alterado após a criação via modal de detalhes
      status: pedido ? formData.status : 'pendente',
      valor_produtos: formData.valor_produtos,
      valor_frete: formData.valor_frete || 0,
      valor_desconto: formData.valor_desconto || 0,
      valor_total: formData.valor_total,
      prazo_entrega_dias: formData.prazo_entrega_dias ? Number(formData.prazo_entrega_dias) : null,
      forma_pagamento: formData.forma_pagamento || null,
      condicoes_pagamento: formData.condicoes_pagamento || null,
      observacoes: formData.observacoes || null,
      // Dados de Pagamento para NF-e
      tipo_cobranca: formData.tipo_cobranca || null,
      banco_id: formData.banco_id || null,
      data_vencimento: formData.data_vencimento || null,
      // Dados de Transporte
      transportadora_id: formData.transportadora_id || null,
      tipo_frete: formData.tipo_frete || null,
      // Dados de Volume/Peso para NF-e
      quantidade_volumes: formData.quantidade_volumes || 1,
      especie_volumes: formData.especie_volumes || 'PALLET',
      marca_volumes: formData.marca_volumes || '1',
      numeracao_volumes: formData.numeracao_volumes || '1',
      peso_bruto_kg: formData.peso_bruto_kg || 0,
      peso_liquido_kg: formData.peso_liquido_kg || 0,
      // Dados Fiscais
      cfop: formData.cfop || '5101',
      dados_adicionais_nfe: formData.dados_adicionais_nfe || null,
      // Flag para gerar cobrança Asaas quando o pedido for aprovado
      gerar_cobranca_asaas: formData.gerar_cobranca_asaas || false,
      // Dados adicionais da cobrança
      numero_parcelas: formData.numero_parcelas || 1,
      desconto_antecipado_valor: formData.desconto_antecipado_valor || null,
      desconto_antecipado_dias: formData.desconto_antecipado_dias || null,
      desconto_antecipado_tipo: formData.desconto_antecipado_tipo || null,
      juros_atraso: formData.juros_atraso || null,
      multa_atraso: formData.multa_atraso || null,
      multa_atraso_tipo: formData.multa_atraso_tipo || null,
      itens: itens.map(item => ({
        produto_id: item.produto_id,
        tipo_produto: item.tipo_produto,
        quantidade_pecas: item.quantidade_pecas || null,
        comprimento_cada_mm: item.comprimento_cada_mm || null,
        total_calculado: item.total_calculado || null,
        quantidade_simples: item.quantidade_simples || null,
        unidade_medida: item.unidade_medida,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
        observacoes: item.observacoes || null,
        // Campos de frete (distribuição manual CIF)
        frete_unitario: item.frete_unitario || null,
        frete_total_item: item.frete_total_item || null,
        preco_unitario_com_frete: item.preco_unitario_com_frete || null,
        subtotal_com_frete: item.subtotal_com_frete || null,
      })),
    };

    const result = pedido
      ? await onUpdate(pedido.id, pedidoData)
      : await onCreate(pedidoData);

    if (result.error) {
      toast.error(`Erro ao ${pedido ? 'atualizar' : 'criar'} pedido: ` + result.error);
      return;
    }

    // NOTA: A cobrança no Asaas será gerada apenas quando o pedido for APROVADO
    // A flag gerar_cobranca_asaas foi salva no pedido e será processada em usePedidos.ts

    toast.success(`Pedido ${pedido ? 'atualizado' : 'criado'} com sucesso!`);
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 ${pedido ? 'bg-blue-100' : 'bg-emerald-100'} rounded-lg`}>
              <ShoppingCart className={`h-5 w-5 ${pedido ? 'text-blue-600' : 'text-emerald-600'}`} />
            </div>
            <div>
              <DialogTitle>{pedido ? `Editar Pedido ${pedido.numero_pedido}` : 'Novo Pedido'}</DialogTitle>
              <DialogDescription>
                {pedido ? 'Edite os dados do pedido abaixo' : 'Preencha os dados do pedido abaixo'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {/* Dados Principais */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Dados Principais</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cliente_id" className="text-sm font-medium">
                    Cliente <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={clientesOptions}
                        value={formData.cliente_id}
                        onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                        placeholder="Selecione um cliente"
                        searchPlaceholder="Buscar cliente..."
                        emptyText="Nenhum cliente encontrado"
                      />
                    </div>
                    {formData.cliente_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 flex-shrink-0"
                        onClick={() => setShowPedidosModal(true)}
                        title="Ver pedidos anteriores do cliente"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_pedido" className="text-sm font-medium">
                    Data do Pedido <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="data_pedido"
                    type="date"
                    value={formData.data_pedido}
                    onChange={(e) => setFormData({ ...formData, data_pedido: e.target.value })}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-sm font-medium">
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: any) => {
                      setFormData({ ...formData, tipo: value });
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orcamento">Orçamento</SelectItem>
                      <SelectItem value="pedido_confirmado">Pedido Confirmado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Itens do Pedido */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <List className="h-4 w-4" />
                <span>Itens do Pedido</span>
              </div>
              <Card className="p-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {itens.map((item, index) => {
                    const produto = produtos.find(p => p.id === item.produto_id);
                    const isFabricado = item.tipo_produto === 'fabricado' && produto?.permite_medida_composta;

                    return (
                      <Card key={index} className="p-4 bg-muted/30">
                        <div className="grid grid-cols-12 gap-3 items-end mb-2">
                          <div className="col-span-12 sm:col-span-5 space-y-2">
                            <Label className="text-sm font-medium">
                              Produto <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={item.produto_id}
                              onValueChange={(value) => updateItem(index, 'produto_id', value)}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecione um produto" />
                              </SelectTrigger>
                              <SelectContent>
                                {produtos.filter(p => p.ativo).map(prod => (
                                  <SelectItem key={prod.id} value={prod.id}>
                                    {prod.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {isFabricado ? (
                            <>
                              <div className="col-span-6 sm:col-span-2 space-y-2">
                                <Label className="text-sm font-medium">Qtd (peças)</Label>
                                <NumberInput
                                  className="h-10"
                                  value={Number(item.quantidade_pecas) || 0}
                                  onChange={(value) => updateItem(index, 'quantidade_pecas', value.toString())}
                                />
                              </div>
                              <div className="col-span-6 sm:col-span-2 space-y-2">
                                <Label className="text-sm font-medium">Comp. (mm)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-10"
                                  value={item.comprimento_cada_mm || ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    updateItem(index, 'comprimento_cada_mm', value.toString());
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="col-span-9 sm:col-span-4 space-y-2">
                              <Label className="text-sm font-medium">Quantidade</Label>
                              <NumberInput
                                className="h-10"
                                value={Number(item.quantidade_simples) || 0}
                                onChange={(value) => updateItem(index, 'quantidade_simples', value.toString())}
                                allowDecimals={true}
                                required
                              />
                            </div>
                          )}

                          <div className="col-span-2 flex items-end justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">
                            Preço: {formatCurrency(item.preco_unitario)}
                          </span>
                          <span className="font-bold">
                            Subtotal: {formatCurrency(item.subtotal)}
                          </span>
                        </div>

                        {/* Linha de frete CIF com input editável */}
                        {formData.tipo_frete === 'CIF' && formData.valor_frete > 0 && (
                          <div className="mt-2 pt-2 border-t border-dashed flex items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-2">
                              <Truck className="h-3 w-3 text-blue-600" />
                              <span className="text-muted-foreground">Frete Unit.:</span>
                              <CurrencyInput
                                value={item.frete_unitario || 0}
                                onChange={(valor) => {
                                  const itensAtualizados = recalcularFreteItem(itens, index, valor);
                                  setItens(itensAtualizados);
                                }}
                                className="h-7 w-24 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">
                                Unit. c/ Frete: <span className="font-semibold text-foreground">{formatCurrency(item.preco_unitario_com_frete || item.preco_unitario)}</span>
                              </span>
                              <span className="text-blue-600 font-bold">
                                Subtotal c/ Frete: {formatCurrency(item.subtotal_com_frete || item.subtotal)}
                              </span>
                            </div>
                          </div>
                        )}

                        {item.tipo_produto === 'revenda' && item.estoque_produto && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-semibold mb-2">📦 Estoque do produto:</p>
                            <Alert
                              className={`text-xs p-2 ${
                                item.estoque_produto.suficiente
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-destructive/10 border-destructive/20'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Estoque disponível</span>
                                <span className={item.estoque_produto.suficiente ? 'text-green-700' : 'text-destructive'}>
                                  {item.estoque_produto.suficiente ? '✓' : '⚠️'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-1 text-muted-foreground">
                                <span>
                                  Necessário: {item.estoque_produto.necessario} {item.unidade_medida}
                                </span>
                                <span>
                                  Disponível: {item.estoque_produto.disponivel} {item.unidade_medida}
                                </span>
                              </div>
                              {!item.estoque_produto.suficiente && (
                                <p className="text-xs text-destructive mt-1">
                                  Faltam: {item.estoque_produto.necessario - item.estoque_produto.disponivel} {item.unidade_medida}
                                </p>
                              )}
                            </Alert>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="w-full border-dashed h-10 gap-2 mt-3"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Item
                </Button>
              </Card>
            </div>

            {/* Alertas de Custo - PEPS */}
            {(alertasCustoGlobal.length > 0 || verificandoCustos) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Atenção: Diferença de Custo Detectada (PEPS)</span>
                    {verificandoCustos && (
                      <RotateCcw className="h-4 w-4 animate-spin ml-2" />
                    )}
                  </div>

                  {alertasCustoGlobal.length > 0 && (
                    <Card className="p-4 border-amber-200 bg-amber-50">
                      <p className="text-sm text-amber-800 mb-4">
                        O lote mais antigo (PEPS) possui custo diferente do custo administrativo atual.
                        Deseja manter o custo atual ou usar o custo do lote antigo?
                      </p>

                      <div className="space-y-3">
                        {alertasCustoGlobal.map((alerta) => {
                          const diferencaPositiva = alerta.diferenca_percentual > 0;
                          return (
                            <div
                              key={alerta.materia_prima_id}
                              className="bg-white p-3 rounded-lg border border-amber-200"
                            >
                              <p className="font-semibold text-sm mb-2">{alerta.materia_prima_nome}</p>

                              {/* Comparação de custos */}
                              <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                                <div className="text-center">
                                  <p className="text-muted-foreground">Administrativo</p>
                                  <p className="font-mono font-bold text-blue-600">{formatCurrency(alerta.custo_atual)}/kg</p>
                                </div>

                                <div className="flex flex-col items-center">
                                  <span className="text-xs text-muted-foreground">vs</span>
                                  <span className={`text-xs font-semibold ${diferencaPositiva ? 'text-red-600' : 'text-green-600'}`}>
                                    {diferencaPositiva ? '+' : ''}{formatNumber(alerta.diferenca_percentual, 1)}%
                                  </span>
                                </div>

                                <div className="text-center">
                                  <p className="text-muted-foreground">Lote PEPS</p>
                                  <p className={`font-mono font-bold ${diferencaPositiva ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(alerta.custo_lote)}/kg
                                  </p>
                                </div>
                              </div>

                              {/* Botões de ação */}
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="default"
                                  className="flex-1 gap-1"
                                  onClick={() => handleDecisaoCusto(alerta, 'manter')}
                                >
                                  <Check className="h-3 w-3" />
                                  Manter {formatCurrency(alerta.custo_atual)}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleDecisaoCusto(alerta, 'atualizar')}
                                >
                                  Usar lote {formatCurrency(alerta.custo_lote)}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Valores */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Valores</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Valor Produtos</Label>
                  <Input
                    value={formatCurrency(formData.valor_produtos)}
                    readOnly
                    className="h-10 bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frete" className="text-sm font-medium">
                    Frete
                  </Label>
                  <CurrencyInput
                    id="frete"
                    value={Number(formData.valor_frete) || 0}
                    onChange={(frete) => {
                      calcularTotais(itens, frete, formData.valor_desconto);
                      // Redistribuir frete entre os itens se for CIF
                      if (formData.tipo_frete === 'CIF' && frete > 0) {
                        const itensComFrete = distribuirFrete(itens, frete);
                        setItens(itensComFrete);
                      }
                    }}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desconto" className="text-sm font-medium">
                    Desconto
                  </Label>
                  <CurrencyInput
                    id="desconto"
                    value={Number(formData.valor_desconto) || 0}
                    onChange={(desconto) => {
                      calcularTotais(itens, formData.valor_frete, desconto);
                    }}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Valor Total</Label>
                  <Input
                    value={formatCurrency(formData.valor_total)}
                    readOnly
                    className="h-10 bg-emerald-50 font-bold text-emerald-700"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Transporte */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Transporte</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prazo" className="text-sm font-medium">
                    Prazo Entrega (dias)
                  </Label>
                  <NumberInput
                    id="prazo"
                    value={Number(formData.prazo_entrega_dias) || 0}
                    onChange={(value) => setFormData({ ...formData, prazo_entrega_dias: value.toString() })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_frete" className="text-sm font-medium">
                    Tipo de Frete
                  </Label>
                  <Select
                    value={formData.tipo_frete}
                    onValueChange={(value) => {
                      setFormData({ ...formData, tipo_frete: value });
                      // Quando muda o tipo de frete, redistribuir ou limpar
                      if (value === 'CIF' && formData.valor_frete > 0) {
                        const itensComFrete = distribuirFrete(itens, formData.valor_frete);
                        setItens(itensComFrete);
                      } else {
                        // Se não for CIF, limpar frete dos itens
                        const itensSemFrete = itens.map(item => ({
                          ...item,
                          frete_unitario: undefined,
                          frete_total_item: undefined,
                          preco_unitario_com_frete: undefined,
                          subtotal_com_frete: undefined,
                        }));
                        setItens(itensSemFrete);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_FRETE.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transportadora" className="text-sm font-medium">
                    Transportadora
                  </Label>
                  <Select
                    value={formData.transportadora_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, transportadora_id: value === 'none' ? '' : value })}
                    disabled={carregandoTransportadoras}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={carregandoTransportadoras ? "Carregando..." : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {transportadoras.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Segunda linha: Volumes e Peso para NF-e */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade_volumes" className="text-sm font-medium">
                    <Package className="h-3 w-3 inline mr-1" />
                    Pallets
                  </Label>
                  <NumberInput
                    id="quantidade_volumes"
                    value={formData.quantidade_volumes}
                    onChange={(value) => setFormData({ ...formData, quantidade_volumes: value })}
                    className="h-10"
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    <Scale className="h-3 w-3 inline mr-1" />
                    Peso Líquido (kg)
                  </Label>
                  <Input
                    value={formData.peso_liquido_kg.toFixed(2)}
                    readOnly
                    className="h-10 bg-muted font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Peso Bruto (kg)
                  </Label>
                  <Input
                    value={formData.peso_bruto_kg.toFixed(2)}
                    readOnly
                    className="h-10 bg-muted font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Pagamento e Cobrança */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Pagamento e Cobrança</span>
              </div>

              {/* Linha 1: Tipo de Cobrança, Parcelas, Data Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_cobranca" className="text-sm font-medium">
                    Forma de Pagamento
                  </Label>
                  <Select
                    value={formData.tipo_cobranca}
                    onValueChange={(value) => {
                      setFormData({ ...formData, tipo_cobranca: value });
                      // Limitar parcelas se não for cartão
                      if (value !== 'CREDIT_CARD' && formData.numero_parcelas > 12) {
                        setFormData(prev => ({ ...prev, tipo_cobranca: value, numero_parcelas: 12 }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_COBRANCA.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_parcelas" className="text-sm font-medium">
                    Parcelas
                  </Label>
                  <Select
                    value={String(formData.numero_parcelas)}
                    onValueChange={(value) => {
                      const parcelas = Number(value);
                      const valorParcela = parcelas > 0 ? formData.valor_total / parcelas : 0;
                      setFormData({ ...formData, numero_parcelas: parcelas, valor_parcela: valorParcela });
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_PARCELAS.filter(p => {
                        // Limitar parcelas baseado no tipo de pagamento
                        if (formData.tipo_cobranca === 'CREDIT_CARD') {
                          return p.value <= 21; // Visa/Master até 21x
                        }
                        return p.value <= 12; // Outros até 12x
                      }).map((parcela) => (
                        <SelectItem key={parcela.value} value={String(parcela.value)}>
                          {parcela.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_vencimento" className="text-sm font-medium">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Vencimento (1ª parcela)
                  </Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banco" className="text-sm font-medium">
                    Banco (NF-e)
                  </Label>
                  <Select
                    value={formData.banco_id ? String(formData.banco_id) : ''}
                    onValueChange={(value) => setFormData({ ...formData, banco_id: Number(value) })}
                    disabled={carregandoBancos}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={carregandoBancos ? "Carregando..." : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map((banco) => (
                        <SelectItem key={banco.id} value={String(banco.id)}>
                          {banco.name} {banco.code ? `(${banco.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview do valor das parcelas */}
              {formData.numero_parcelas > 1 && formData.valor_total > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>{formData.numero_parcelas}x</strong> de{' '}
                    <strong>{formatCurrency(formData.valor_total / formData.numero_parcelas)}</strong>
                    {' '}= Total: {formatCurrency(formData.valor_total)}
                  </p>
                </div>
              )}

              {/* Checkbox para gerar cobrança */}
              <div className="flex items-center space-x-3 p-4 border rounded-md bg-blue-50/50 border-blue-200">
                <Switch
                  id="gerar_cobranca_asaas"
                  checked={formData.gerar_cobranca_asaas}
                  onCheckedChange={(checked) => setFormData({ ...formData, gerar_cobranca_asaas: checked })}
                />
                <div className="flex-1">
                  <Label htmlFor="gerar_cobranca_asaas" className="text-sm font-medium cursor-pointer">
                    Gerar cobrança automaticamente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {formData.tipo_cobranca === 'BOLETO' && 'Será gerado um boleto bancário para o cliente'}
                    {formData.tipo_cobranca === 'PIX' && 'Será gerado um QR Code PIX para pagamento'}
                    {formData.tipo_cobranca === 'CREDIT_CARD' && 'Será enviado link para pagamento com cartão'}
                  </p>
                  <p className="text-xs text-amber-600 font-medium mt-1">
                    ⚠️ A cobrança só será gerada após o pedido ser aprovado
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Observações */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>Observações</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-sm font-medium">
                  Observações Gerais
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="resize-none"
                  placeholder="Informações adicionais sobre o pedido..."
                />
              </div>
            </div>
          </div>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              {pedido ? 'Atualizar' : 'Salvar'} Pedido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Modal de Histórico de Pedidos do Cliente */}
      <ClientePedidosModal
        cliente={clientes.find(c => c.id === formData.cliente_id) || null}
        open={showPedidosModal}
        onClose={() => setShowPedidosModal(false)}
      />
    </Dialog>
  );
}
