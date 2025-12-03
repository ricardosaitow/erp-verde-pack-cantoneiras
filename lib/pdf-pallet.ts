import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { PedidoCompleto, PedidoPallet } from './database.types';

// Dados da empresa
const EMPRESA = {
  nome: 'VerdePack Embalagens',
  cnpj: '37.849.356/0001-04',
  endereco: 'R. João Carlos Amaral, 62 - Jd. Aparecida',
  cidadeUf: 'Campinas/SP',
  cep: '13068-617',
  telefone: '(19) 3282-8250',
};

// Função para carregar a logo como base64
async function carregarLogo(): Promise<string | null> {
  // Lista de caminhos possíveis para a logo
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

  console.warn('Logo não encontrada em nenhum caminho');
  return null;
}

// Gerar hash único para QR code
export function gerarHashPallet(pedidoId: string, numeroPallet: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const data = `${pedidoId}-${numeroPallet}-${timestamp}-${random}`;

  // Criar hash simples (para produção, usar crypto)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16).padStart(16, '0') + random;
}

// Gerar URL para conferência do pallet
export function gerarUrlPallet(qrCodeHash: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.VITE_PUBLIC_URL || 'http://localhost:5173';
  return `${baseUrl}/pallet/conferir?hash=${qrCodeHash}`;
}

interface GerarPDFPalletsParams {
  pedido: PedidoCompleto;
  pallets: PedidoPallet[];
}

export async function gerarPDFPallets({ pedido, pallets }: GerarPDFPalletsParams): Promise<{ success: boolean; error?: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Carregar logo uma vez para todas as páginas
    const logoBase64 = await carregarLogo();

    // Gerar uma página para cada pallet
    for (let i = 0; i < pallets.length; i++) {
      const pallet = pallets[i];

      if (i > 0) {
        doc.addPage();
      }

      let y = margin;

      // ========== CABEÇALHO COM LOGO ==========
      // Logo centralizada no topo (sem barra verde)
      if (logoBase64) {
        try {
          // Logo maior e mais proporcional (largura 60mm, altura proporcional)
          const logoWidth = 60;
          const logoHeight = 20; // Ajustar proporção
          const logoX = (pageWidth - logoWidth) / 2;
          doc.addImage(logoBase64, 'PNG', logoX, margin, logoWidth, logoHeight);
          y = margin + logoHeight + 3;
        } catch (e) {
          console.warn('Erro ao adicionar logo no PDF:', e);
          y = margin;
        }
      } else {
        // Se não tiver logo, mostrar nome da empresa
        doc.setTextColor(34, 139, 34);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(EMPRESA.nome, pageWidth / 2, y + 10, { align: 'center' });
        y = margin + 15;
      }

      // Informações da empresa abaixo do logo
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`CNPJ: ${EMPRESA.cnpj} | ${EMPRESA.telefone}`, pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.text(`${EMPRESA.endereco} - ${EMPRESA.cidadeUf} - CEP: ${EMPRESA.cep}`, pageWidth / 2, y, { align: 'center' });
      y += 8;

      // ========== TÍTULO DO PALLET ==========
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - 2 * margin, 20, 'F');

      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text(`PALLET ${pallet.numero_pallet} DE ${pallets.length}`, pageWidth / 2, y + 14, { align: 'center' });

      y += 30;

      // ========== DADOS DO PEDIDO ==========
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO PEDIDO', margin, y);
      y += 8;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const clienteNome = pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social || 'N/A';
      const clienteCidade = pedido.cliente?.cidade || '';
      const clienteEstado = pedido.cliente?.estado || '';
      const clienteEndereco = pedido.cliente?.endereco_completo || '';

      const dadosPedido = [
        { label: 'Pedido Nº:', valor: pedido.numero_pedido },
        { label: 'Cliente:', valor: clienteNome },
        { label: 'Cidade/UF:', valor: `${clienteCidade}/${clienteEstado}` },
        { label: 'Data:', valor: new Date(pedido.data_pedido).toLocaleDateString('pt-BR') },
      ];

      for (const dado of dadosPedido) {
        doc.setFont('helvetica', 'bold');
        doc.text(dado.label, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(dado.valor, margin + 35, y);
        y += 7;
      }

      y += 5;

      // ========== ITENS DO PEDIDO ==========
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ITENS', margin, y);
      y += 8;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFontSize(10);
      if (pedido.itens && pedido.itens.length > 0) {
        for (const item of pedido.itens) {
          const produtoNome = item.produto?.nome || 'Produto';
          let quantidade = '';

          if (item.quantidade_pecas && item.comprimento_cada_mm) {
            quantidade = `${item.quantidade_pecas.toLocaleString('pt-BR')} pçs × ${item.comprimento_cada_mm}mm`;
          } else if (item.quantidade_simples) {
            quantidade = `${item.quantidade_simples.toLocaleString('pt-BR')} ${item.unidade_medida}`;
          }

          doc.setFont('helvetica', 'bold');
          doc.text(`• ${produtoNome}`, margin, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          doc.text(`  Qtd: ${quantidade}`, margin, y);
          y += 7;

          if (y > pageHeight - 120) break; // Reservar espaço para QR code
        }
      }

      y += 10;

      // ========== INFORMAÇÕES DE PESO/VOLUME ==========
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES DE TRANSPORTE', margin, y);
      y += 8;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFontSize(11);
      const pesoLiquido = (pedido as any).peso_liquido_kg || 0;
      const pesoBruto = (pedido as any).peso_bruto_kg || 0;
      const tipoFrete = (pedido as any).tipo_frete || 'N/A';

      doc.setFont('helvetica', 'normal');
      doc.text(`Peso Líquido Total: ${pesoLiquido.toFixed(2)} kg`, margin, y);
      y += 6;
      doc.text(`Peso Bruto Total: ${pesoBruto.toFixed(2)} kg`, margin, y);
      y += 6;
      doc.text(`Tipo de Frete: ${tipoFrete}`, margin, y);
      y += 6;
      doc.text(`Total de Pallets: ${pallets.length}`, margin, y);

      // ========== QR CODE ==========
      const qrSize = 60;
      const qrX = pageWidth / 2 - qrSize / 2;
      const qrY = pageHeight - margin - qrSize - 20;

      // Gerar QR code
      const url = gerarUrlPallet(pallet.qr_code_hash);
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'M',
      });

      // QR code (sem borda)
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // ========== RODAPÉ ==========
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Gerado em ${new Date().toLocaleString('pt-BR')} | ${EMPRESA.nome}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    // Abrir PDF para impressão ao invés de apenas baixar
    const pdfBlob = doc.output('blob');
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
      const nomeArquivo = `pallets_pedido_${pedido.numero_pedido}.pdf`;
      doc.save(nomeArquivo);
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao gerar PDF de pallets:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Função para criar pallets no banco de dados
export async function criarPalletsPedido(
  supabase: any,
  pedidoId: string,
  quantidadePallets: number
): Promise<{ success: boolean; pallets?: PedidoPallet[]; error?: string }> {
  try {
    // Verificar se já existem pallets para este pedido
    const { data: palletsExistentes } = await supabase
      .from('pedido_pallets')
      .select('id')
      .eq('pedido_id', pedidoId);

    if (palletsExistentes && palletsExistentes.length > 0) {
      // Deletar pallets existentes
      await supabase
        .from('pedido_pallets')
        .delete()
        .eq('pedido_id', pedidoId);
    }

    // Criar novos pallets
    const palletsParaCriar = [];
    for (let i = 1; i <= quantidadePallets; i++) {
      palletsParaCriar.push({
        pedido_id: pedidoId,
        numero_pallet: i,
        qr_code_hash: gerarHashPallet(pedidoId, i),
        status: 'pendente',
      });
    }

    const { data: palletsCriados, error } = await supabase
      .from('pedido_pallets')
      .insert(palletsParaCriar)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, pallets: palletsCriados };
  } catch (error) {
    console.error('Erro ao criar pallets:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Função para buscar pallets de um pedido
export async function buscarPalletsPedido(
  supabase: any,
  pedidoId: string
): Promise<{ success: boolean; pallets?: PedidoPallet[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('pedido_pallets')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('numero_pallet', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, pallets: data || [] };
  } catch (error) {
    console.error('Erro ao buscar pallets:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Função para conferir um pallet via QR code
export async function conferirPallet(
  supabase: any,
  qrCodeHash: string,
  conferidoPor?: string
): Promise<{ success: boolean; pallet?: PedidoPallet; todosConferidos?: boolean; error?: string }> {
  try {
    // Buscar o pallet pelo hash
    const { data: pallet, error: fetchError } = await supabase
      .from('pedido_pallets')
      .select('*, pedido:pedidos(*)')
      .eq('qr_code_hash', qrCodeHash)
      .single();

    if (fetchError || !pallet) {
      return { success: false, error: 'Pallet não encontrado' };
    }

    if (pallet.status === 'conferido') {
      return { success: false, error: 'Este pallet já foi conferido' };
    }

    // Atualizar status do pallet
    const { data: palletAtualizado, error: updateError } = await supabase
      .from('pedido_pallets')
      .update({
        status: 'conferido',
        data_conferencia: new Date().toISOString(),
        conferido_por: conferidoPor || null,
      })
      .eq('id', pallet.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Verificar se todos os pallets do pedido foram conferidos
    const { data: todosPallets } = await supabase
      .from('pedido_pallets')
      .select('status')
      .eq('pedido_id', pallet.pedido_id);

    const todosConferidos = todosPallets?.every((p: any) => p.status === 'conferido') || false;

    return { success: true, pallet: palletAtualizado, todosConferidos };
  } catch (error) {
    console.error('Erro ao conferir pallet:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Função para verificar status de todos os pallets de um pedido
export async function verificarStatusPallets(
  supabase: any,
  pedidoId: string
): Promise<{ total: number; conferidos: number; pendentes: number; todosConferidos: boolean }> {
  try {
    const { data: pallets } = await supabase
      .from('pedido_pallets')
      .select('status')
      .eq('pedido_id', pedidoId);

    if (!pallets || pallets.length === 0) {
      return { total: 0, conferidos: 0, pendentes: 0, todosConferidos: false };
    }

    const total = pallets.length;
    const conferidos = pallets.filter((p: any) => p.status === 'conferido').length;
    const pendentes = total - conferidos;
    const todosConferidos = pendentes === 0;

    return { total, conferidos, pendentes, todosConferidos };
  } catch (error) {
    console.error('Erro ao verificar status dos pallets:', error);
    return { total: 0, conferidos: 0, pendentes: 0, todosConferidos: false };
  }
}
