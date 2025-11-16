import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { PedidoCompleto } from './database.types';
import { formatCurrency } from './format';

export async function gerarPDFPedido(pedido: PedidoCompleto): Promise<void> {
  const pdf = new jsPDF();

  // Configurações
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Título
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ORDEM DE DESPACHO', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Linha separadora
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Informações do Pedido
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DADOS DO PEDIDO', margin, yPosition);
  yPosition += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Número do Pedido: ${pedido.numero_pedido}`, margin, yPosition);
  yPosition += 6;

  pdf.text(`Tipo: ${pedido.tipo === 'pedido_confirmado' ? 'Pedido Confirmado' : 'Orçamento'}`, margin, yPosition);
  yPosition += 6;

  if (pedido.data_pedido) {
    const dataPedido = new Date(pedido.data_pedido).toLocaleDateString('pt-BR');
    pdf.text(`Data do Pedido: ${dataPedido}`, margin, yPosition);
    yPosition += 6;
  }

  if (pedido.data_entrega) {
    const dataEntrega = new Date(pedido.data_entrega).toLocaleDateString('pt-BR');
    pdf.text(`Data de Entrega: ${dataEntrega}`, margin, yPosition);
    yPosition += 6;
  }

  if (pedido.observacoes) {
    pdf.text(`Observações: ${pedido.observacoes}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 4;

  // Informações do Cliente
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('DADOS DO CLIENTE', margin, yPosition);
  yPosition += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const clienteNome = pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social || 'Cliente não identificado';
  pdf.text(`Nome: ${clienteNome}`, margin, yPosition);
  yPosition += 6;

  if (pedido.cliente?.razao_social && pedido.cliente?.nome_fantasia) {
    pdf.text(`Razão Social: ${pedido.cliente.razao_social}`, margin, yPosition);
    yPosition += 6;
  }

  if (pedido.cliente?.cnpj_cpf) {
    pdf.text(`CNPJ/CPF: ${pedido.cliente.cnpj_cpf}`, margin, yPosition);
    yPosition += 6;
  }

  if (pedido.cliente?.telefone) {
    pdf.text(`Telefone: ${pedido.cliente.telefone}`, margin, yPosition);
    yPosition += 6;
  }

  if (pedido.cliente?.endereco_completo) {
    pdf.text(`Endereço: ${pedido.cliente.endereco_completo}`, margin, yPosition);
    yPosition += 6;
  }

  if (pedido.cliente?.cidade && pedido.cliente?.estado) {
    pdf.text(`Cidade/Estado: ${pedido.cliente.cidade} - ${pedido.cliente.estado}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 4;

  // Linha separadora
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Itens do Pedido
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('ITENS DO PEDIDO', margin, yPosition);
  yPosition += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  if (pedido.itens && pedido.itens.length > 0) {
    pedido.itens.forEach((item, index) => {
      const produtoNome = item.produto?.nome || 'Produto não identificado';

      // Verifica se precisa de nova página
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${produtoNome}`, margin, yPosition);
      yPosition += 5;

      pdf.setFont('helvetica', 'normal');

      if (item.quantidade_pecas && item.comprimento_cada_mm) {
        pdf.text(`   Quantidade: ${item.quantidade_pecas.toLocaleString('pt-BR')} peças`, margin, yPosition);
        yPosition += 5;
        pdf.text(`   Comprimento: ${item.comprimento_cada_mm.toLocaleString('pt-BR')} mm`, margin, yPosition);
        yPosition += 5;
      } else if (item.quantidade_simples) {
        pdf.text(`   Quantidade: ${item.quantidade_simples.toLocaleString('pt-BR')} ${item.unidade_medida}`, margin, yPosition);
        yPosition += 5;
      }


      if (item.observacoes) {
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text(`   Obs: ${item.observacoes}`, margin, yPosition);
        pdf.setTextColor(0);
        pdf.setFontSize(9);
        yPosition += 5;
      }

      yPosition += 3;
    });
  }

  yPosition += 5;

  // Linha separadora
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Gerar QR Code com URL pública
  try {
    // Construir URL pública para despacho
    // Em desenvolvimento, usa a URL do ngrok se estiver configurada
    const publicUrl = import.meta.env.VITE_PUBLIC_URL;
    const baseUrl = publicUrl || window.location.origin;

    const despachoUrl = `${baseUrl}/despacho/publico?id=${pedido.id}`;

    const qrCodeDataUrl = await QRCode.toDataURL(despachoUrl, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Centralizar QR Code
    const qrSize = 50;
    const qrX = (pageWidth - qrSize) / 2;

    // Verifica se precisa de nova página para o QR Code
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('CÓDIGO PARA DESPACHO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    pdf.addImage(qrCodeDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
    yPosition += qrSize + 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text('Escaneie este código para confirmar o despacho', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;

    // Mostrar URL para acesso manual
    pdf.setFontSize(7);
    const urlText = despachoUrl.length > 60 ? despachoUrl.substring(0, 57) + '...' : despachoUrl;
    pdf.text(urlText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.text(`Pedido: ${pedido.numero_pedido}`, pageWidth / 2, yPosition, { align: 'center' });

  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
  }

  // Abrir PDF para impressão ao invés de apenas baixar
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Abrir em nova janela com foco automático em impressão
  const printWindow = window.open(pdfUrl, '_blank');

  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();

      // Aguardar um tempo antes de revogar a URL
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
    };
  } else {
    // Fallback: se popup bloqueado, fazer download
    const fileName = `Pedido_${pedido.numero_pedido}_${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }
}
