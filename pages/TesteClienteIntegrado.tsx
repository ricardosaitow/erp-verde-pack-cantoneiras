import { useState } from 'react';
import { useClienteIntegrado } from '../hooks/useClienteIntegrado';
import { useClienteBase } from '../hooks/useClienteBase';
import { useClienteAsaas } from '../hooks/useClienteAsaas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Shuffle } from 'lucide-react';

// Função para gerar CNPJ válido
function gerarCNPJValido(): string {
  const randomNum = (n: number) => Math.floor(Math.random() * n);

  // Gerar os primeiros 12 dígitos
  const n1 = randomNum(10);
  const n2 = randomNum(10);
  const n3 = randomNum(10);
  const n4 = randomNum(10);
  const n5 = randomNum(10);
  const n6 = randomNum(10);
  const n7 = randomNum(10);
  const n8 = randomNum(10);
  const n9 = 0; // Normalmente 0001 para matriz
  const n10 = 0;
  const n11 = 0;
  const n12 = 1;

  // Calcular primeiro dígito verificador
  let soma = n1 * 5 + n2 * 4 + n3 * 3 + n4 * 2 + n5 * 9 + n6 * 8 + n7 * 7 + n8 * 6 + n9 * 5 + n10 * 4 + n11 * 3 + n12 * 2;
  const d1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);

  // Calcular segundo dígito verificador
  soma = n1 * 6 + n2 * 5 + n3 * 4 + n4 * 3 + n5 * 2 + n6 * 9 + n7 * 8 + n8 * 7 + n9 * 6 + n10 * 5 + n11 * 4 + n12 * 3 + d1 * 2;
  const d2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);

  return `${n1}${n2}.${n3}${n4}${n5}.${n6}${n7}${n8}/${n9}${n10}${n11}${n12}-${d1}${d2}`;
}

// CEPs reais de diversas cidades brasileiras
const cepsReais = [
  // São Paulo - SP
  '01310-100', // Av Paulista
  '01311-000', // Cerqueira César
  '04551-060', // Brooklin
  '05508-000', // Butantã
  '03428-000', // Tatuapé

  // Rio de Janeiro - RJ
  '22040-020', // Copacabana
  '22021-010', // Leme
  '20031-170', // Centro
  '22640-102', // Barra da Tijuca
  '22250-040', // Botafogo

  // Belo Horizonte - MG
  '30130-100', // Savassi
  '30140-071', // Funcionários
  '31270-000', // Pampulha
  '30360-000', // Barreiro

  // Curitiba - PR
  '80250-010', // Batel
  '80420-210', // Centro
  '82810-000', // Portão

  // Porto Alegre - RS
  '90040-371', // Moinhos de Vento
  '90035-003', // Centro Histórico
  '91040-000', // Restinga
];

// Função para gerar CEP aleatório (agora retorna CEP real)
function gerarCEP(): string {
  return cepsReais[Math.floor(Math.random() * cepsReais.length)];
}

// Lista de nomes de empresas
const nomesEmpresas = [
  'Tech Solutions', 'Inovação Digital', 'Comercial Santos', 'Distribuidora Silva',
  'Indústria Moderna', 'Serviços Premium', 'Atacado Central', 'Varejo Express',
  'Logística Rápida', 'Construtora Forte', 'Alimentos Naturais', 'Moda Elegante'
];

const sufixos = ['Ltda', 'S.A.', 'ME', 'EPP', 'Eireli'];

// Mapeamento de CEPs para cidades (consistência de dados)
const cepParaCidade: { [key: string]: { cidade: string; estado: string; bairro: string; rua: string } } = {
  // São Paulo - SP
  '01310-100': { cidade: 'São Paulo', estado: 'SP', bairro: 'Bela Vista', rua: 'Av Paulista' },
  '01311-000': { cidade: 'São Paulo', estado: 'SP', bairro: 'Cerqueira César', rua: 'Rua Haddock Lobo' },
  '04551-060': { cidade: 'São Paulo', estado: 'SP', bairro: 'Brooklin', rua: 'Av Eng Luís Carlos Berrini' },
  '05508-000': { cidade: 'São Paulo', estado: 'SP', bairro: 'Butantã', rua: 'Rua Alvarenga' },
  '03428-000': { cidade: 'São Paulo', estado: 'SP', bairro: 'Tatuapé', rua: 'Rua Tuiuti' },

  // Rio de Janeiro - RJ
  '22040-020': { cidade: 'Rio de Janeiro', estado: 'RJ', bairro: 'Copacabana', rua: 'Av Atlântica' },
  '22021-010': { cidade: 'Rio de Janeiro', estado: 'RJ', bairro: 'Leme', rua: 'Av Princesa Isabel' },
  '20031-170': { cidade: 'Rio de Janeiro', estado: 'RJ', bairro: 'Centro', rua: 'Av Rio Branco' },
  '22640-102': { cidade: 'Rio de Janeiro', estado: 'RJ', bairro: 'Barra da Tijuca', rua: 'Av das Américas' },
  '22250-040': { cidade: 'Rio de Janeiro', estado: 'RJ', bairro: 'Botafogo', rua: 'Rua Voluntários da Pátria' },

  // Belo Horizonte - MG
  '30130-100': { cidade: 'Belo Horizonte', estado: 'MG', bairro: 'Savassi', rua: 'Av Getúlio Vargas' },
  '30140-071': { cidade: 'Belo Horizonte', estado: 'MG', bairro: 'Funcionários', rua: 'Rua dos Guajajaras' },
  '31270-000': { cidade: 'Belo Horizonte', estado: 'MG', bairro: 'Pampulha', rua: 'Av Portugal' },
  '30360-000': { cidade: 'Belo Horizonte', estado: 'MG', bairro: 'Barreiro', rua: 'Av Afonso Vaz de Melo' },

  // Curitiba - PR
  '80250-010': { cidade: 'Curitiba', estado: 'PR', bairro: 'Batel', rua: 'Av Batel' },
  '80420-210': { cidade: 'Curitiba', estado: 'PR', bairro: 'Centro', rua: 'Rua XV de Novembro' },
  '82810-000': { cidade: 'Curitiba', estado: 'PR', bairro: 'Portão', rua: 'Av República Argentina' },

  // Porto Alegre - RS
  '90040-371': { cidade: 'Porto Alegre', estado: 'RS', bairro: 'Moinhos de Vento', rua: 'Rua Padre Chagas' },
  '90035-003': { cidade: 'Porto Alegre', estado: 'RS', bairro: 'Centro Histórico', rua: 'Av Borges de Medeiros' },
  '91040-000': { cidade: 'Porto Alegre', estado: 'RS', bairro: 'Restinga', rua: 'Av João Antônio da Silveira' },
};

const complementos = ['Sala 101', 'Galpão A', 'Loja 15', 'Andar 3', 'Bloco B', 'Conjunto 205'];

const condicoesPagamento = [
  'À vista com desconto',
  '30 dias',
  '30/60 dias',
  '30/60/90 dias',
  'Pagamento antecipado',
  '15 dias',
];

const grupos = ['Atacado', 'Varejo', 'VIP', 'Industrial', 'Distribuidor', 'Pequeno Porte'];

const nomesContato = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa',
  'Carlos Ferreira', 'Juliana Souza', 'Ricardo Lima', 'Fernanda Alves'
];

// Função auxiliar para remover acentos e caracteres especiais
function removerAcentos(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function gerarDadosAleatorios() {
  const nomeEmpresa = nomesEmpresas[Math.floor(Math.random() * nomesEmpresas.length)];
  const sufixo = sufixos[Math.floor(Math.random() * sufixos.length)];

  // Escolher CEP e pegar dados consistentes da cidade
  const cep = gerarCEP();
  const enderecoInfo = cepParaCidade[cep];

  const numero = Math.floor(Math.random() * 9000) + 100;
  const temComplemento = Math.random() > 0.3; // 70% de chance de ter complemento
  const limiteCredito = [5000, 10000, 25000, 50000, 100000, 250000][Math.floor(Math.random() * 6)];

  // Gerar email válido removendo espaços, acentos e caracteres especiais
  const emailSanitizado = removerAcentos(nomeEmpresa)
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/[^a-z0-9]/g, ''); // Remove tudo que não for letra ou número

  return {
    // Identificação
    tipo_pessoa: 'juridica' as const,
    razao_social: `${nomeEmpresa} ${sufixo}`,
    nome_fantasia: nomeEmpresa,
    cnpj_cpf: gerarCNPJValido(),
    inscricao_estadual: `${Math.floor(Math.random() * 900000000) + 100000000}.${Math.floor(Math.random() * 900) + 100}`,
    inscricao_municipal: String(Math.floor(Math.random() * 900000) + 100000),

    // Contato
    email: `contato@${emailSanitizado}.com.br`,
    telefone: `11 ${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
    celular: `11 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
    contato_principal: nomesContato[Math.floor(Math.random() * nomesContato.length)],

    // Endereço (DADOS CONSISTENTES COM O CEP)
    cep: cep,
    endereco: enderecoInfo.rua,
    numero: String(numero),
    complemento: temComplemento ? complementos[Math.floor(Math.random() * complementos.length)] : undefined,
    bairro: enderecoInfo.bairro,
    cidade: enderecoInfo.cidade,
    estado: enderecoInfo.estado,

    // Comercial
    condicoes_pagamento: condicoesPagamento[Math.floor(Math.random() * condicoesPagamento.length)],
    limite_credito: limiteCredito,
    group_name: grupos[Math.floor(Math.random() * grupos.length)],
    observacoes: `Cliente cadastrado automaticamente. Limite de crédito: R$ ${limiteCredito.toLocaleString('pt-BR')}`,
  };
}

export default function TesteClienteIntegrado() {
  const { criarClienteCompleto, loading: loadingIntegrado } = useClienteIntegrado();
  const { sincronizarComBase, sincronizarClientesBulk: syncBaseBulk, loading: loadingBase } = useClienteBase();
  const { sincronizarClienteExistente, sincronizarClientesBulk: syncAsaasBulk } = useClienteAsaas();

  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [clienteIdTeste, setClienteIdTeste] = useState('');

  // Form de teste
  const [formData, setFormData] = useState({
    tipo_pessoa: 'juridica' as const,
    razao_social: 'Empresa Teste Integração Ltda',
    nome_fantasia: 'Empresa Teste',
    cnpj_cpf: '11.222.333/0001-81', // CNPJ válido para teste
    inscricao_estadual: '123.456.789.012',
    inscricao_municipal: '123456',
    email: 'teste@empresateste.com',
    telefone: '11 3333-4444',
    celular: '11 98765-4321',
    contato_principal: 'João Silva',
    cep: '01310-100',
    endereco: 'Av Paulista',
    numero: '1000',
    complemento: 'Sala 101',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
    condicoes_pagamento: '30 dias',
    limite_credito: 50000,
    group_name: 'Varejo',
    observacoes: 'Cliente teste',
  });

  const handleGerarDados = () => {
    setFormData(gerarDadosAleatorios());
  };

  const handleCriarCliente = async () => {
    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Criando cliente integrado...');

      // Sanitizar razão social para email comercial
      const emailComercialSanitizado = removerAcentos(formData.razao_social)
        .toLowerCase()
        .replace(/\s/g, '')
        .replace(/[^a-z0-9]/g, '');

      const result = await criarClienteCompleto({
        ...formData,
        tipo_pessoa: 'juridica',
        sincronizarBase: true,
        sincronizarAsaas: true,
        notificarAsaas: false,
        contatos: [
          // ============================================
          // CONTATO OBRIGATÓRIO 1: FINANCEIRO
          // ============================================
          {
            tipo_contato: 'financeiro',
            nome_responsavel: formData.contato_principal || 'Responsável Financeiro',
            email: formData.email,
            telefone: formData.telefone || formData.celular,
          },
          // ============================================
          // CONTATO OBRIGATÓRIO 2: COMERCIAL
          // ============================================
          {
            tipo_contato: 'comercial',
            nome_responsavel: 'Responsável Comercial',
            email: `comercial@${emailComercialSanitizado}.com.br`,
            telefone: formData.celular || formData.telefone,
          }
        ],
      });

      console.log('✅ Resultado:', result);
      setResultado(result);

    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  const handleSincronizarBase = async () => {
    if (!clienteIdTeste) {
      setErro('Informe o ID do cliente');
      return;
    }

    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Sincronizando com Base...');
      const result = await sincronizarComBase(clienteIdTeste);
      console.log('✅ Resultado:', result);
      setResultado({ tipo: 'sync-base', data: result });
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  const handleSyncBulkBase = async () => {
    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Sincronização em massa - Base...');
      const result = await syncBaseBulk({
        somenteNaoSincronizados: true,
        limite: 10,
      });
      console.log('✅ Resultado:', result);
      setResultado({ tipo: 'bulk-base', data: result });
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  const handleSyncBulkAsaas = async () => {
    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Sincronização em massa - Asaas...');
      const result = await syncAsaasBulk({
        somenteNaoSincronizados: true,
        limite: 10,
      });
      console.log('✅ Resultado:', result);
      setResultado({ tipo: 'bulk-asaas', data: result });
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  const loading = loadingIntegrado || loadingBase;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Teste Cliente Integrado</h1>
        <p className="text-gray-600 mt-2">
          Teste a integração Base ERP + Asaas
        </p>
      </div>

      {/* Info */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription>
          <div className="space-y-2 text-sm mt-2">
            <p><strong>1.</strong> Criar Cliente: cria no banco local + Base ERP + Asaas (paralelo)</p>
            <p><strong>2.</strong> Sincronizar Existente: envia cliente já cadastrado para Base/Asaas</p>
            <p><strong>3.</strong> Sync Bulk: sincroniza vários clientes de uma vez</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Form: Criar Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>1. Criar Novo Cliente (Integrado)</CardTitle>
          <CardDescription>
            Cria no banco local e sincroniza automaticamente com Base ERP e Asaas.
            Use o botão "Gerar Dados Aleatórios" para preencher com CNPJ válido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DADOS DA EMPRESA */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 border-b pb-1">Dados da Empresa</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="razao_social">Razão Social *</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf">CNPJ *</Label>
                <Input
                  id="cnpj_cpf"
                  value={formData.cnpj_cpf}
                  onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                <Input
                  id="inscricao_estadual"
                  value={formData.inscricao_estadual}
                  onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                <Input
                  id="inscricao_municipal"
                  value={formData.inscricao_municipal}
                  onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* CONTATO */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 border-b pb-1">Contato</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  value={formData.celular}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contato_principal">Contato Principal</Label>
                <Input
                  id="contato_principal"
                  value={formData.contato_principal}
                  onChange={(e) => setFormData({ ...formData, contato_principal: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* ENDEREÇO */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 border-b pb-1">Endereço</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.complemento || ''}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado (UF)</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* DADOS COMERCIAIS */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 border-b pb-1">Dados Comerciais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condicoes_pagamento">Condições de Pagamento</Label>
                <Input
                  id="condicoes_pagamento"
                  value={formData.condicoes_pagamento}
                  onChange={(e) => setFormData({ ...formData, condicoes_pagamento: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="limite_credito">Limite de Crédito (R$)</Label>
                <Input
                  id="limite_credito"
                  type="number"
                  value={formData.limite_credito}
                  onChange={(e) => setFormData({ ...formData, limite_credito: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group_name">Grupo/Categoria</Label>
                <Input
                  id="group_name"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGerarDados}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Gerar Dados Aleatórios
            </Button>

            <Button onClick={handleCriarCliente} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                '✨ Criar Cliente'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Form: Sincronizar Cliente Existente */}
      <Card>
        <CardHeader>
          <CardTitle>2. Sincronizar Cliente Existente</CardTitle>
          <CardDescription>
            Envia um cliente já cadastrado para o Base ERP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clienteId">ID do Cliente (UUID)</Label>
            <Input
              id="clienteId"
              placeholder="Ex: 123e4567-e89b-12d3-a456-426614174000"
              value={clienteIdTeste}
              onChange={(e) => setClienteIdTeste(e.target.value)}
            />
          </div>

          <Button onClick={handleSincronizarBase} disabled={loading} className="w-full" variant="outline">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              '🔄 Sincronizar com Base ERP'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Bulk */}
      <Card>
        <CardHeader>
          <CardTitle>3. Sincronização em Massa</CardTitle>
          <CardDescription>
            Sincroniza todos os clientes não sincronizados (máximo 10)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={handleSyncBulkBase} disabled={loading} className="w-full" variant="outline">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando Base...
              </>
            ) : (
              '📋 Sincronizar Bulk - Base ERP'
            )}
          </Button>

          <Button onClick={handleSyncBulkAsaas} disabled={loading} className="w-full" variant="outline">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando Asaas...
              </>
            ) : (
              '📋 Sincronizar Bulk - Asaas'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ERRO */}
      {erro && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{erro}</p>
          </CardContent>
        </Card>
      )}

      {/* RESULTADO */}
      {resultado && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Resultado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resultado de criação integrada */}
            {resultado.cliente && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <strong>Cliente criado:</strong>
                  <code className="bg-white px-2 py-1 rounded text-sm">
                    {resultado.cliente.id}
                  </code>
                </div>

                <div className="flex items-center gap-2">
                  <strong>Status de Sincronização:</strong>
                </div>

                <div className="flex gap-3">
                  {resultado.sincronizadoBase ? (
                    <Badge className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Base ERP ✓
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Base ERP ✗
                    </Badge>
                  )}

                  {resultado.sincronizadoAsaas ? (
                    <Badge className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Asaas ✓
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Asaas ✗
                    </Badge>
                  )}
                </div>

                {resultado.errosBase && (
                  <Alert variant="destructive">
                    <AlertTitle>Erro Base ERP</AlertTitle>
                    <AlertDescription>{resultado.errosBase}</AlertDescription>
                  </Alert>
                )}

                {resultado.errosAsaas && (
                  <Alert variant="destructive">
                    <AlertTitle>Erro Asaas</AlertTitle>
                    <AlertDescription>{resultado.errosAsaas}</AlertDescription>
                  </Alert>
                )}

                {resultado.cliente.base_customer_id && (
                  <div className="text-sm">
                    <strong>ID Base ERP:</strong>{' '}
                    <code className="bg-white px-2 py-1 rounded">
                      {resultado.cliente.base_customer_id}
                    </code>
                  </div>
                )}

                {resultado.cliente.asaas_customer_id && (
                  <div className="text-sm">
                    <strong>ID Asaas:</strong>{' '}
                    <code className="bg-white px-2 py-1 rounded">
                      {resultado.cliente.asaas_customer_id}
                    </code>
                  </div>
                )}
              </div>
            )}

            {/* Resultado de sync bulk */}
            {resultado.tipo?.includes('bulk') && (
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Total:</strong> {resultado.data.total}
                </div>
                <div className="text-sm text-green-700">
                  <strong>Sincronizados:</strong> {resultado.data.sincronizados}
                </div>
                {resultado.data.erros > 0 && (
                  <div className="text-sm text-red-700">
                    <strong>Erros:</strong> {resultado.data.erros}
                  </div>
                )}
              </div>
            )}

            {/* JSON completo */}
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-green-700 hover:text-green-800">
                Ver Dados Completos (JSON)
              </summary>
              <pre className="mt-4 text-xs bg-white p-4 rounded overflow-auto max-h-96 border">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
