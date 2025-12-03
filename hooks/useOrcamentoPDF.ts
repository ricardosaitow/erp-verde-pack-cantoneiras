import { jsPDF } from 'jspdf';
import type { PedidoCompleto } from '../lib/database.types';
import { formatCurrency } from '../lib/format';

// Logo VerdePack em base64 (será carregado dinamicamente)
let logoBase64: string | null = null;

// Função para carregar o logo
async function carregarLogo(): Promise<string> {
  if (logoBase64) return logoBase64;

  try {
    const response = await fetch('/logofinal.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result as string;
        resolve(logoBase64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erro ao carregar logo:', error);
    return '';
  }
}

// Cores da marca VerdePack
const CORES = {
  verde: [76, 175, 80] as [number, number, number],
  azulEsverdeado: [0, 128, 128] as [number, number, number],
  cinzaEscuro: [50, 50, 50] as [number, number, number],
  cinzaClaro: [150, 150, 150] as [number, number, number],
  branco: [255, 255, 255] as [number, number, number],
};

interface DadosEmpresa {
  nome: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cidadeUf: string;
  cep: string;
  telefone: string;
  email: string;
}

// Dados da empresa VerdePack
const EMPRESA: DadosEmpresa = {
  nome: 'VerdePack Embalagens',
  cnpj: '37.849.356/0001-04',
  endereco: 'R. João Carlos Amaral, 62',
  bairro: 'Jd. Aparecida',
  cidadeUf: 'Campinas/SP',
  cep: '13068-617',
  telefone: '(19) 3282-8250',
  email: 'vendas@verdepackembalagens.com.br',
};

export async function gerarOrcamentoPDF(pedido: PedidoCompleto): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Carregar logo
  const logo = await carregarLogo();

  // ========== CABEÇALHO ==========
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', margin, y, 45, 18);
    } catch (e) {
      console.warn('Não foi possível adicionar o logo');
    }
  }

  // Dados da empresa (lado direito)
  doc.setFontSize(10);
  doc.setTextColor(...CORES.cinzaEscuro);
  doc.setFont('helvetica', 'bold');
  doc.text(EMPRESA.nome, pageWidth - margin, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...CORES.cinzaClaro);
  doc.text(`CNPJ: ${EMPRESA.cnpj}`, pageWidth - margin, y + 9, { align: 'right' });
  doc.text(`${EMPRESA.endereco} - ${EMPRESA.bairro}`, pageWidth - margin, y + 13, { align: 'right' });
  doc.text(`${EMPRESA.cidadeUf} - CEP: ${EMPRESA.cep}`, pageWidth - margin, y + 17, { align: 'right' });
  doc.text(`${EMPRESA.telefone} | ${EMPRESA.email}`, pageWidth - margin, y + 21, { align: 'right' });

  y += 28;

  // Linha separadora verde
  doc.setDrawColor(...CORES.verde);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  // ========== TÍTULO ==========
  doc.setFontSize(16);
  doc.setTextColor(...CORES.azulEsverdeado);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pageWidth / 2, y, { align: 'center' });

  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(...CORES.cinzaEscuro);
  doc.text(`Nº ${pedido.numero_pedido}`, pageWidth / 2, y, { align: 'center' });

  y += 10;

  // ========== DADOS DO CLIENTE ==========
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 24, 2, 2, 'F');

  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...CORES.azulEsverdeado);
  doc.text('CLIENTE', margin + 4, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CORES.cinzaEscuro);

  const cliente = pedido.cliente;
  const nomeCliente = cliente?.nome_fantasia || cliente?.razao_social || 'Cliente não identificado';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(nomeCliente, margin + 4, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // Info cliente - lado esquerdo
  let yCliente = y + 4;
  if (cliente?.cnpj_cpf) {
    doc.text(`CPF/CNPJ: ${cliente.cnpj_cpf}`, margin + 4, yCliente);
    yCliente += 4;
  }
  if (cliente?.cidade && cliente?.estado) {
    doc.text(`${cliente.cidade}/${cliente.estado}`, margin + 4, yCliente);
  }

  // Info cliente - lado direito
  const xRight = pageWidth / 2 + 5;
  yCliente = y + 4;
  if (cliente?.telefone || cliente?.celular) {
    doc.text(`Tel: ${cliente.telefone || cliente.celular}`, xRight, yCliente);
    yCliente += 4;
  }
  if (cliente?.email) {
    doc.text(`Email: ${cliente.email}`, xRight, yCliente);
  }

  y += 18;

  // ========== INFORMAÇÕES DO ORÇAMENTO ==========
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(...CORES.cinzaClaro);

  const dataEmissao = new Date(pedido.data_pedido).toLocaleDateString('pt-BR');
  const validade = new Date(pedido.data_pedido);
  validade.setDate(validade.getDate() + 5);
  const dataValidade = validade.toLocaleDateString('pt-BR');

  doc.text(`Emissão: ${dataEmissao}`, margin, y);
  doc.text(`Validade: ${dataValidade}`, margin + 50, y);
  if (pedido.prazo_entrega_dias) {
    doc.text(`Prazo de Entrega: ${pedido.prazo_entrega_dias} dias úteis`, margin + 100, y);
  }

  y += 8;

  // ========== TABELA DE ITENS ==========
  // Cabeçalho da tabela
  doc.setFillColor(...CORES.azulEsverdeado);
  doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');

  doc.setTextColor(...CORES.branco);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  // Definir colunas com espaçamento adequado
  const colWidths = {
    item: 10,
    descricao: 75,
    qtd: 30,
    unitario: 30,
    total: 35,
  };

  const colX = {
    item: margin + 2,
    descricao: margin + colWidths.item + 2,
    qtd: margin + colWidths.item + colWidths.descricao,
    unitario: margin + colWidths.item + colWidths.descricao + colWidths.qtd,
    total: pageWidth - margin - 2,
  };

  y += 5;
  doc.text('Item', colX.item, y);
  doc.text('Descrição do Produto', colX.descricao, y);
  doc.text('Quantidade', colX.qtd, y);
  doc.text('Valor Unit.', colX.unitario, y);
  doc.text('Total', colX.total, y, { align: 'right' });

  y += 4;

  // Itens
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CORES.cinzaEscuro);

  const isCIF = pedido.tipo_frete === 'CIF';
  const itens = pedido.itens || [];

  itens.forEach((item, index) => {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }

    // Linha alternada
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 3, pageWidth - 2 * margin, 8, 'F');
    }

    const nomeProduto = item.produto?.nome || 'Produto';
    let descricao = nomeProduto;

    if (item.quantidade_pecas && item.comprimento_cada_mm) {
      descricao += ` - ${item.comprimento_cada_mm}mm`;
    }

    // Truncar descrição
    const maxDescLen = 42;
    if (descricao.length > maxDescLen) {
      descricao = descricao.substring(0, maxDescLen - 3) + '...';
    }

    const quantidade = item.quantidade_pecas || item.quantidade_simples || 0;
    const unidade = item.unidade_medida || 'un';

    const precoUnitario = (isCIF && item.preco_unitario_com_frete)
      ? Number(item.preco_unitario_com_frete)
      : Number(item.preco_unitario) || 0;
    const subtotal = (isCIF && item.subtotal_com_frete)
      ? Number(item.subtotal_com_frete)
      : Number(item.subtotal) || 0;

    doc.setFontSize(8);
    doc.text(String(index + 1).padStart(2, '0'), colX.item, y);
    doc.text(descricao, colX.descricao, y);
    doc.text(`${quantidade.toLocaleString('pt-BR')} ${unidade}`, colX.qtd, y);
    doc.text(formatCurrency(precoUnitario), colX.unitario, y);
    doc.text(formatCurrency(subtotal), colX.total, y, { align: 'right' });

    y += 7;
  });

  y += 3;

  // Linha separadora
  doc.setDrawColor(...CORES.cinzaClaro);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;

  // ========== TOTAIS ==========
  const xLabelTotais = pageWidth - margin - 55;
  const xValueTotais = pageWidth - margin - 2;

  doc.setFontSize(9);
  doc.setTextColor(...CORES.cinzaEscuro);

  const subtotalProdutos = isCIF
    ? itens.reduce((sum, item) => sum + (Number(item.subtotal_com_frete) || Number(item.subtotal) || 0), 0)
    : Number(pedido.valor_produtos) || 0;

  // Subtotal
  doc.text('Subtotal:', xLabelTotais, y, { align: 'right' });
  doc.text(formatCurrency(subtotalProdutos), xValueTotais, y, { align: 'right' });
  y += 5;

  // Frete - NÃO mostrar se for CIF
  if (!isCIF && Number(pedido.valor_frete) > 0) {
    doc.text(`Frete (${pedido.tipo_frete || 'FOB'}):`, xLabelTotais, y, { align: 'right' });
    doc.text(formatCurrency(Number(pedido.valor_frete)), xValueTotais, y, { align: 'right' });
    y += 5;
  }

  // Desconto
  if (Number(pedido.valor_desconto) > 0) {
    doc.setTextColor(180, 50, 50);
    doc.text('Desconto:', xLabelTotais, y, { align: 'right' });
    doc.text(`- ${formatCurrency(Number(pedido.valor_desconto))}`, xValueTotais, y, { align: 'right' });
    y += 5;
  }

  // Total
  const valorTotal = isCIF
    ? subtotalProdutos - (Number(pedido.valor_desconto) || 0)
    : Number(pedido.valor_total) || 0;

  y += 2;
  doc.setFillColor(...CORES.verde);
  // Badge verde estendendo até a margem direita
  const badgeStart = xLabelTotais - 25;
  const badgeWidth = (pageWidth - margin) - badgeStart;
  doc.roundedRect(badgeStart, y - 4, badgeWidth, 10, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...CORES.branco);
  doc.text('TOTAL:', xLabelTotais - 2, y + 2, { align: 'right' });
  doc.text(formatCurrency(valorTotal), pageWidth - margin - 3, y + 2, { align: 'right' });

  y += 15;

  // ========== INFORMAÇÕES DE PAGAMENTO ==========
  if (pedido.forma_pagamento || pedido.condicoes_pagamento || pedido.tipo_cobranca || pedido.data_vencimento || pedido.numero_parcelas) {
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 22, 2, 2, 'F');

    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CORES.azulEsverdeado);
    doc.text('CONDIÇÕES DE PAGAMENTO', margin + 4, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...CORES.cinzaEscuro);

    let infoPagamento: string[] = [];

    if (pedido.forma_pagamento) {
      infoPagamento.push(`Forma: ${pedido.forma_pagamento}`);
    }
    if (pedido.tipo_cobranca) {
      const tiposCobranca: Record<string, string> = {
        'BOLETO': 'Boleto Bancário',
        'PIX': 'PIX',
        'CREDIT_CARD': 'Cartão de Crédito',
        'UNDEFINED': 'A definir',
      };
      infoPagamento.push(`Tipo: ${tiposCobranca[pedido.tipo_cobranca] || pedido.tipo_cobranca}`);
    }
    if (pedido.numero_parcelas) {
      if (pedido.numero_parcelas > 1) {
        infoPagamento.push(`Parcelas: ${pedido.numero_parcelas}x`);
      } else {
        infoPagamento.push('À vista');
      }
    }
    if (pedido.data_vencimento) {
      const dataVenc = new Date(pedido.data_vencimento).toLocaleDateString('pt-BR');
      infoPagamento.push(`Vencimento: ${dataVenc}`);
    }

    doc.text(infoPagamento.join('   |   '), margin + 4, y);

    if (pedido.condicoes_pagamento) {
      y += 4;
      doc.text(pedido.condicoes_pagamento, margin + 4, y);
    }

    y += 12;
  }

  // ========== OBSERVAÇÕES ==========
  if (pedido.observacoes) {
    y += 3;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CORES.azulEsverdeado);
    doc.text('OBSERVAÇÕES', margin, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...CORES.cinzaEscuro);

    const linhas = doc.splitTextToSize(pedido.observacoes, pageWidth - 2 * margin);
    doc.text(linhas, margin, y);
    y += linhas.length * 4 + 3;
  }

  // ========== RODAPÉ ==========
  const footerY = pageHeight - 18;

  doc.setDrawColor(...CORES.cinzaClaro);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFontSize(7);
  doc.setTextColor(...CORES.cinzaClaro);
  doc.text('Este orçamento tem validade de 05 dias a partir da data de emissão.', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Os preços podem sofrer alterações sem aviso prévio após o vencimento.', pageWidth / 2, footerY + 4, { align: 'center' });
  doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, footerY + 8, { align: 'center' });

  // Salvar PDF
  const nomeArquivo = `Orcamento_${pedido.numero_pedido}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nomeArquivo);
}

export function useOrcamentoPDF() {
  const gerarPDF = async (pedido: PedidoCompleto) => {
    try {
      await gerarOrcamentoPDF(pedido);
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      return { success: false, error: error.message };
    }
  };

  return { gerarPDF };
}
