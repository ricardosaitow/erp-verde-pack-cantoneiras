// ============================================
// GERADOR DE DADOS FAKE PARA TESTES
// ============================================
// Gera dados aleatórios para teste de clientes e cobranças
// ============================================

const nomesPessoa = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa',
  'Carlos Souza', 'Juliana Lima', 'Rafael Alves', 'Fernanda Rocha',
  'Lucas Martins', 'Beatriz Carvalho', 'Gabriel Ribeiro', 'Larissa Dias',
  'Felipe Araújo', 'Amanda Ferreira', 'Bruno Gomes', 'Camila Barbosa'
];

const nomesEmpresas = [
  'Tech Solutions', 'Digital Systems', 'Smart Innovation', 'Cloud Services',
  'Data Analytics', 'Cyber Security', 'Mobile Apps', 'Web Development',
  'AI Research', 'Blockchain Labs', 'IoT Solutions', 'Software House',
  'Consulting Group', 'Business Intelligence', 'Marketing Digital', 'E-commerce Plus',
  'Logistics Express', 'Food Delivery', 'Health Care', 'Education Online'
];

const sufixosEmpresas = ['Ltda', 'S.A.', 'EIRELI', 'ME', 'EPP'];

const ruas = [
  'Rua das Flores', 'Av Paulista', 'Rua dos Três Irmãos', 'Av Brasil',
  'Rua Augusta', 'Av Faria Lima', 'Rua Oscar Freire', 'Av Brigadeiro Faria Lima',
  'Rua Consolação', 'Av Ibirapuera', 'Rua da Mooca', 'Av Rebouças'
];

const bairros = [
  'Centro', 'Jardim Paulista', 'Pinheiros', 'Vila Mariana',
  'Moema', 'Itaim Bibi', 'Brooklin', 'Vila Olímpia',
  'Perdizes', 'Santana', 'Tatuapé', 'Mooca'
];

const cidades = [
  { nome: 'São Paulo', estado: 'SP' },
  { nome: 'Rio de Janeiro', estado: 'RJ' },
  { nome: 'Belo Horizonte', estado: 'MG' },
  { nome: 'Curitiba', estado: 'PR' },
  { nome: 'Porto Alegre', estado: 'RS' },
  { nome: 'Brasília', estado: 'DF' },
  { nome: 'Salvador', estado: 'BA' },
  { nome: 'Fortaleza', estado: 'CE' }
];

const complementos = [
  'Apto 101', 'Sala 205', 'Bloco A', 'Conj 302',
  'Sobreloja', 'Casa 2', 'Loja 15', 'Galpão 3'
];

// Gera CPF válido
function gerarCPF(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));

  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += n[i] * (10 - i);
  }
  const d1 = (sum * 10) % 11;
  n.push(d1 === 10 ? 0 : d1);

  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += n[i] * (11 - i);
  }
  const d2 = (sum * 10) % 11;
  n.push(d2 === 10 ? 0 : d2);

  return n.join('');
}

// Gera CNPJ válido
function gerarCNPJ(): string {
  const n = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
  n.push(0, 0, 0, 1); // Filial 0001

  // Calcular primeiro dígito
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += n[i] * weights1[i];
  }
  const d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  n.push(d1);

  // Calcular segundo dígito
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += n[i] * weights2[i];
  }
  const d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  n.push(d2);

  return n.join('');
}

// Gera email baseado no nome
function gerarEmail(nome: string): string {
  const dominios = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'empresa.com.br'];
  const nomeEmail = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, '.')
    .replace(/[^\w.]/g, '');

  const dominio = dominios[Math.floor(Math.random() * dominios.length)];
  return `${nomeEmail}@${dominio}`;
}

// Gera telefone
function gerarTelefone(): string {
  const ddd = ['11', '21', '31', '41', '51', '61', '71', '81'][Math.floor(Math.random() * 8)];
  const numero = Math.floor(30000000 + Math.random() * 69999999);
  return `${ddd}${numero}`;
}

// Gera celular
function gerarCelular(): string {
  const ddd = ['11', '21', '31', '41', '51', '61', '71', '81'][Math.floor(Math.random() * 8)];
  const numero = Math.floor(900000000 + Math.random() * 99999999);
  return `${ddd}9${numero}`;
}

// Gera CEP
function gerarCEP(): string {
  const n = Math.floor(10000000 + Math.random() * 89999999);
  return n.toString();
}

// Pega item aleatório de array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Gera número aleatório entre min e max
function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================
// EXPORTAÇÕES
// ============================================

export interface DadosClienteFake {
  tipo_pessoa: 'fisica' | 'juridica';
  razao_social: string;
  nome_fantasia: string;
  cnpj_cpf: string;
  email: string;
  telefone: string;
  celular: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  observacoes: string;
}

export interface DadosCobrancaFake {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
}

// Gera dados fake de cliente
export function gerarClienteFake(tipoPessoa?: 'fisica' | 'juridica', tipoDocumento?: 'cpf' | 'cnpj'): DadosClienteFake {
  // Se não especificar tipo de pessoa, gera aleatório
  let tipo = tipoPessoa || (Math.random() > 0.5 ? 'juridica' : 'fisica');

  // Se especificar tipo de documento, ajusta o tipo de pessoa de acordo
  if (tipoDocumento === 'cpf') {
    tipo = 'fisica';
  } else if (tipoDocumento === 'cnpj') {
    tipo = 'juridica';
  }

  const cidade = randomItem(cidades);

  if (tipo === 'fisica') {
    const nome = randomItem(nomesPessoa);
    return {
      tipo_pessoa: 'fisica',
      razao_social: nome,
      nome_fantasia: '',
      cnpj_cpf: gerarCPF(),
      email: gerarEmail(nome),
      telefone: gerarTelefone(),
      celular: gerarCelular(),
      cep: gerarCEP(),
      endereco: randomItem(ruas),
      numero: randomNumber(1, 9999).toString(),
      complemento: Math.random() > 0.5 ? randomItem(complementos) : '',
      bairro: randomItem(bairros),
      cidade: cidade.nome,
      estado: cidade.estado,
      inscricao_estadual: '',
      inscricao_municipal: '',
      observacoes: `Cliente de teste gerado automaticamente - ${new Date().toLocaleString()}`
    };
  } else {
    const nomeEmpresa = randomItem(nomesEmpresas);
    const sufixo = randomItem(sufixosEmpresas);
    const razaoSocial = `${nomeEmpresa} ${sufixo}`;

    return {
      tipo_pessoa: 'juridica',
      razao_social: razaoSocial,
      nome_fantasia: nomeEmpresa,
      cnpj_cpf: gerarCNPJ(),
      email: gerarEmail(nomeEmpresa),
      telefone: gerarTelefone(),
      celular: gerarCelular(),
      cep: gerarCEP(),
      endereco: randomItem(ruas),
      numero: randomNumber(1, 9999).toString(),
      complemento: Math.random() > 0.5 ? randomItem(complementos) : '',
      bairro: randomItem(bairros),
      cidade: cidade.nome,
      estado: cidade.estado,
      inscricao_estadual: Math.floor(100000000 + Math.random() * 899999999).toString(),
      inscricao_municipal: Math.floor(10000000 + Math.random() * 89999999).toString(),
      observacoes: `Cliente de teste gerado automaticamente - ${new Date().toLocaleString()}`
    };
  }
}

// Gera dados fake de cobrança
export function gerarCobrancaFake(customerId?: string): DadosCobrancaFake {
  const tiposCobranca: Array<'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'> = [
    'BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED'
  ];

  const descricoes = [
    'Pedido #',
    'Fatura #',
    'Serviço de ',
    'Mensalidade de ',
    'Compra de produtos - Pedido '
  ];

  // Data de vencimento entre hoje e 30 dias
  const hoje = new Date();
  const diasFuturos = randomNumber(1, 30);
  const dataVencimento = new Date(hoje);
  dataVencimento.setDate(hoje.getDate() + diasFuturos);

  const valor = randomNumber(5000, 500000) / 100; // Entre R$ 50 e R$ 5000
  const numeroPedido = randomNumber(1000, 9999);

  return {
    customer: customerId || '',
    billingType: randomItem(tiposCobranca),
    value: Math.round(valor * 100) / 100, // Arredondar para 2 casas decimais
    dueDate: dataVencimento.toISOString().split('T')[0],
    description: `${randomItem(descricoes)}${numeroPedido}`,
    externalReference: numeroPedido.toString()
  };
}

// Formata CPF (apenas visual)
export function formatarCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Formata CNPJ (apenas visual)
export function formatarCNPJ(cnpj: string): string {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Formata CEP (apenas visual)
export function formatarCEP(cep: string): string {
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// Formata Telefone (apenas visual)
export function formatarTelefone(tel: string): string {
  if (tel.length === 10) {
    return tel.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (tel.length === 11) {
    return tel.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return tel;
}
