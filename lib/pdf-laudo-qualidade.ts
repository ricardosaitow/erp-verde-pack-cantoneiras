import jsPDF from 'jspdf';
import type { PedidoCompleto, PedidoItem, Produto } from './database.types';
import { supabase } from './supabase';

// Dados da empresa
const EMPRESA = {
  nome: 'VERDEPACK EMBALAGENS LTDA',
  cnpj: '37.849.356/0001-04',
  ie: '347.193.018.113',
  endereco: 'R. João Carlos Amaral, 62 - Jd. Aparecida',
  cidadeUf: 'Campinas/SP',
  cep: '13068-617',
  telefone: '(19) 3282-8250',
  email: 'contato@verdepack.com.br',
  website: 'www.verdepack.com.br',
};

// Tolerâncias padrão
const TOLERANCIAS = {
  comprimento: 30, // ±30mm
  aba: 3, // ±3mm para Aba A e Aba B
  espessura: 0.3, // ±0.3mm
  peso: 0.03, // ±0.03kg
};

// Função para carregar a logo como base64
async function carregarLogo(): Promise<string | null> {
  const caminhosPossiveis = [
    '/logofinal.png',
    './logofinal.png',
    'logofinal.png',
  ];

  for (const caminho of caminhosPossiveis) {
    try {
      const response = await fetch(caminho);
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.warn(`Erro ao carregar logo de ${caminho}:`, error);
    }
  }

  return null;
}

interface ItemComProduto extends PedidoItem {
  produto?: Produto;
}

interface GerarLaudoParams {
  pedido: PedidoCompleto;
  item: ItemComProduto;
  numeroLaudo: number;
  totalLaudos: number;
  pesoPorMetroKg: number; // Peso calculado das receitas
}

// Função para calcular o peso por metro do produto a partir das receitas
async function calcularPesoPorMetro(produtoId: string): Promise<number> {
  try {
    const { data: receitas, error } = await supabase
      .from('receitas')
      .select('consumo_por_metro_g')
      .eq('produto_id', produtoId);

    if (error || !receitas || receitas.length === 0) {
      console.warn(`Nenhuma receita encontrada para produto ${produtoId}`);
      return 0;
    }

    // Soma o consumo de todas as matérias-primas em g/m e converte para kg/m
    const totalGramsPorMetro = receitas.reduce((sum, r) => sum + (r.consumo_por_metro_g || 0), 0);
    return totalGramsPorMetro / 1000; // Converter g para kg
  } catch (err) {
    console.error('Erro ao calcular peso por metro:', err);
    return 0;
  }
}

// Gerar laudo para um único item/produto
async function gerarLaudoItem(
  doc: jsPDF,
  params: GerarLaudoParams,
  logoBase64: string | null
): Promise<void> {
  const { pedido, item, numeroLaudo, totalLaudos } = params;
  const produto = item.produto;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // ========== CABEÇALHO ==========
  // Logo centralizada
  if (logoBase64) {
    try {
      const logoWidth = 50;
      const logoHeight = 17;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logoBase64, 'PNG', logoX, margin, logoWidth, logoHeight);
      y = margin + logoHeight + 5;
    } catch (e) {
      console.warn('Erro ao adicionar logo:', e);
    }
  }

  // Título
  doc.setTextColor(34, 139, 34);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('LAUDO DE QUALIDADE', pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Subtítulo
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Cantoneira de Papelão', pageWidth / 2, y, { align: 'center' });
  y += 3;

  // Número do laudo (se houver mais de um)
  if (totalLaudos > 1) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Laudo ${numeroLaudo} de ${totalLaudos}`, pageWidth / 2, y, { align: 'center' });
  }
  y += 10;

  // Linha separadora
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ========== INFORMAÇÕES GERAIS ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES GERAIS', margin, y);
  y += 7;

  // Dados do cliente e produto
  const clienteNome = pedido.cliente?.razao_social || pedido.cliente?.nome_fantasia || 'N/A';
  const produtoNome = produto?.nome || 'CANTONEIRAS DE PAPELÃO';
  const acabamento = 'PARDA'; // Padrão para cantoneiras

  // Montar especificação nominal: AlturaXLarguraXEspessura - Comprimento
  const altura = produto?.altura_mm || 0;
  const largura = produto?.largura_mm || 0;
  const espessura = produto?.espessura_mm || 0;
  const comprimento = item.comprimento_cada_mm || 0;
  const especificacaoNominal = `${altura}X${largura}X${espessura.toFixed(1).replace('.', ',')} - ${comprimento}`;

  doc.setFontSize(10);
  const infoGeral = [
    { label: 'Solicitante Laudo:', valor: clienteNome },
    { label: 'Produto:', valor: produtoNome },
    { label: 'Acabamento:', valor: acabamento },
    { label: 'Especificação Nominal:', valor: especificacaoNominal },
  ];

  for (const info of infoGeral) {
    doc.setFont('helvetica', 'bold');
    doc.text(info.label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(info.valor, margin + 45, y);
    y += 6;
  }

  y += 8;

  // ========== TOLERÂNCIAS ==========
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOLERÂNCIAS', margin, y);
  y += 7;

  // Calcular peso nominal usando o peso por metro calculado das receitas
  const { pesoPorMetroKg } = params;
  const pesoNominal = pesoPorMetroKg * (comprimento / 1000);

  // Tabela de tolerâncias
  const tableStartY = y;
  const colWidths = [50, 30, 30, 30, 30];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableX = (pageWidth - tableWidth) / 2;

  // Cabeçalho da tabela
  doc.setFillColor(34, 139, 34);
  doc.rect(tableX, y, tableWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  let colX = tableX;
  const headers = ['Parâmetro', 'Nominal', 'Mínimo', 'Máximo', 'Unidade'];
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], colX + colWidths[i] / 2, y + 5.5, { align: 'center' });
    colX += colWidths[i];
  }
  y += 8;

  // Dados da tabela
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const toleranciasData = [
    {
      parametro: 'Comprimento',
      nominal: comprimento.toFixed(2),
      minimo: (comprimento - TOLERANCIAS.comprimento).toFixed(2),
      maximo: (comprimento + TOLERANCIAS.comprimento).toFixed(2),
      unidade: 'mm',
    },
    {
      parametro: 'Aba A',
      nominal: altura.toFixed(2),
      minimo: (altura - TOLERANCIAS.aba).toFixed(2),
      maximo: (altura + TOLERANCIAS.aba).toFixed(2),
      unidade: 'mm',
    },
    {
      parametro: 'Aba B',
      nominal: largura.toFixed(2),
      minimo: (largura - TOLERANCIAS.aba).toFixed(2),
      maximo: (largura + TOLERANCIAS.aba).toFixed(2),
      unidade: 'mm',
    },
    {
      parametro: 'Espessura',
      nominal: espessura.toFixed(2),
      minimo: (espessura - TOLERANCIAS.espessura).toFixed(2),
      maximo: (espessura + TOLERANCIAS.espessura).toFixed(2),
      unidade: 'mm',
    },
    {
      parametro: 'Peso',
      nominal: pesoNominal.toFixed(3),
      minimo: (pesoNominal - TOLERANCIAS.peso).toFixed(3),
      maximo: (pesoNominal + TOLERANCIAS.peso).toFixed(3),
      unidade: 'KG',
    },
  ];

  for (let rowIndex = 0; rowIndex < toleranciasData.length; rowIndex++) {
    const row = toleranciasData[rowIndex];
    const rowColor = rowIndex % 2 === 0 ? 245 : 255;
    doc.setFillColor(rowColor, rowColor, rowColor);
    doc.rect(tableX, y, tableWidth, 7, 'F');

    colX = tableX;
    const values = [row.parametro, row.nominal, row.minimo, row.maximo, row.unidade];
    for (let i = 0; i < values.length; i++) {
      doc.text(values[i], colX + colWidths[i] / 2, y + 5, { align: 'center' });
      colX += colWidths[i];
    }
    y += 7;
  }

  // Borda da tabela
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(tableX, tableStartY, tableWidth, y - tableStartY);

  y += 10;

  // ========== RESULTADOS AMOSTRA ==========
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('RESULTADOS AMOSTRA', margin, y);
  y += 7;

  // Tabela de resultados
  const resultTableX = margin;
  const resultColWidths = [60, 50];
  const resultTableWidth = resultColWidths[0] + resultColWidths[1];

  // Cabeçalho
  doc.setFillColor(240, 240, 240);
  doc.rect(resultTableX, y, resultTableWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Parâmetro', resultTableX + resultColWidths[0] / 2, y + 5, { align: 'center' });
  doc.text('Aferição', resultTableX + resultColWidths[0] + resultColWidths[1] / 2, y + 5, { align: 'center' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  const resultados = [
    { parametro: 'Comprimento (mm)', valor: comprimento.toString() },
    { parametro: 'Aba A (mm)', valor: `${altura}X${largura}` },
    { parametro: 'Espessura (mm)', valor: espessura.toFixed(1).replace('.', ',') },
    { parametro: 'Peso (KG)', valor: pesoNominal.toFixed(3).replace('.', ',') },
  ];

  for (const res of resultados) {
    doc.text(res.parametro, resultTableX + 5, y + 5);
    doc.text(res.valor, resultTableX + resultColWidths[0] + resultColWidths[1] / 2, y + 5, { align: 'center' });
    y += 7;
  }

  // Borda da tabela de resultados
  doc.setDrawColor(200, 200, 200);
  doc.rect(resultTableX, y - 28, resultTableWidth, 35);

  y += 12;

  // ========== SITUAÇÃO ==========
  doc.setFillColor(34, 139, 34);
  doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('APROVADO', pageWidth / 2, y + 13, { align: 'center' });

  y += 26;

  // ========== OBSERVAÇÕES ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('OBSERVAÇÕES', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const observacoes = [
    '• Material inspecionado conforme especificações',
    '• Material isento de defeitos',
    '• Condições de embalagem CE',
    '• Recomendação PEPS (primeiro que entra, primeiro que sai)',
    '• Prazo máximo de armazenamento: 10 meses',
  ];

  for (const obs of observacoes) {
    doc.text(obs, margin, y);
    y += 5;
  }

  // ========== RODAPÉ ==========
  const footerY = pageHeight - 25;

  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'bold');
  doc.text(EMPRESA.nome, pageWidth / 2, footerY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${EMPRESA.cnpj} | I.E.: ${EMPRESA.ie}`, pageWidth / 2, footerY + 9, { align: 'center' });
  doc.text(`${EMPRESA.endereco} - ${EMPRESA.cidadeUf} - CEP: ${EMPRESA.cep}`, pageWidth / 2, footerY + 13, { align: 'center' });
  doc.text(`Tel: ${EMPRESA.telefone} | ${EMPRESA.email} | ${EMPRESA.website}`, pageWidth / 2, footerY + 17, { align: 'center' });
}

export async function gerarPDFLaudoQualidade(pedido: PedidoCompleto): Promise<{ success: boolean; error?: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Carregar logo uma vez
    const logoBase64 = await carregarLogo();

    // Filtrar apenas itens de produtos fabricados (cantoneiras)
    const itensFabricados = (pedido.itens || []).filter(
      (item) => item.tipo_produto === 'fabricado' && item.produto
    );

    if (itensFabricados.length === 0) {
      return { success: false, error: 'Nenhum produto fabricado encontrado no pedido' };
    }

    // Gerar um laudo para cada item/produto
    for (let i = 0; i < itensFabricados.length; i++) {
      if (i > 0) {
        doc.addPage();
      }

      const item = itensFabricados[i] as ItemComProduto;

      // Calcular peso por metro do produto a partir das receitas
      const pesoPorMetroKg = item.produto?.id
        ? await calcularPesoPorMetro(item.produto.id)
        : 0;

      await gerarLaudoItem(doc, {
        pedido,
        item,
        numeroLaudo: i + 1,
        totalLaudos: itensFabricados.length,
        pesoPorMetroKg,
      }, logoBase64);
    }

    // Abrir PDF para impressão
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const printWindow = window.open(pdfUrl, '_blank');

    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 1000);
      };
    } else {
      const nomeArquivo = `laudo_qualidade_pedido_${pedido.numero_pedido}.pdf`;
      doc.save(nomeArquivo);
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao gerar PDF de Laudo de Qualidade:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}
