import { useState } from 'react';
import { useAsaas } from '../hooks/useAsaas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shuffle } from 'lucide-react';
import { gerarClienteFake, gerarCobrancaFake, formatarCPF, formatarCEP } from '../lib/fakeData';

export default function TesteAsaas() {
  const { createCustomer, createPayment, loading } = useAsaas();
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Dados do cliente
  const [clienteForm, setClienteForm] = useState({
    name: 'João Silva',
    email: 'joao.silva@example.com',
    cpfCnpj: '12345678909', // CPF válido de teste
    mobilePhone: '11987654321',
    postalCode: '01310-100',
    address: 'Av Paulista',
    addressNumber: '1000',
    province: 'Bela Vista',
  });

  // Dados da cobrança
  const [cobrancaForm, setCobrancaForm] = useState({
    value: '100.00',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 dias
    description: 'Teste de cobrança',
    billingType: 'PIX',
  });

  const gerarDadosClienteAleatorios = () => {
    const dadosFake = gerarClienteFake();
    setClienteForm({
      name: dadosFake.razao_social,
      email: dadosFake.email,
      cpfCnpj: dadosFake.cnpj_cpf,
      mobilePhone: dadosFake.celular,
      postalCode: dadosFake.cep,
      address: dadosFake.endereco,
      addressNumber: dadosFake.numero,
      province: dadosFake.bairro,
    });
  };

  const gerarDadosCobrancaAleatorios = () => {
    const dadosFake = gerarCobrancaFake();
    setCobrancaForm({
      value: dadosFake.value.toFixed(2),
      dueDate: dadosFake.dueDate,
      description: dadosFake.description,
      billingType: dadosFake.billingType,
    });
  };

  const testarCriarCliente = async () => {
    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Criando cliente...', clienteForm);

      const cliente = await createCustomer({
        name: clienteForm.name,
        email: clienteForm.email,
        cpfCnpj: clienteForm.cpfCnpj,
        mobilePhone: clienteForm.mobilePhone,
        postalCode: clienteForm.postalCode,
        address: clienteForm.address,
        addressNumber: clienteForm.addressNumber,
        province: clienteForm.province,
      });

      console.log('✅ Cliente criado:', cliente);
      setResultado({ tipo: 'cliente', data: cliente });
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  const testarCriarCobranca = async () => {
    setResultado(null);
    setErro(null);

    try {
      // Primeiro criar cliente
      console.log('🔄 Criando cliente...');
      const cliente = await createCustomer({
        name: clienteForm.name,
        email: clienteForm.email,
        cpfCnpj: clienteForm.cpfCnpj,
        mobilePhone: clienteForm.mobilePhone,
      });

      console.log('✅ Cliente criado:', cliente);

      if (!cliente?.id) {
        throw new Error('Cliente não retornou ID');
      }

      // Criar cobrança
      console.log('🔄 Criando cobrança...');
      const cobranca = await createPayment({
        customer: cliente.id,
        billingType: cobrancaForm.billingType as any,
        value: parseFloat(cobrancaForm.value),
        dueDate: cobrancaForm.dueDate,
        description: cobrancaForm.description,
      });

      console.log('✅ Cobrança criada:', cobranca);
      setResultado({ tipo: 'cobranca', cliente, cobranca });
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Teste de Integração Asaas</h1>
        <p className="text-gray-600 mt-2">
          Teste a integração com a API do Asaas criando clientes e cobranças
        </p>
      </div>

      <Tabs defaultValue="cliente" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cliente">Criar Cliente</TabsTrigger>
          <TabsTrigger value="cobranca">Criar Cobrança Completa</TabsTrigger>
        </TabsList>

        {/* TAB: CRIAR CLIENTE */}
        <TabsContent value="cliente">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Dados do Cliente</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={gerarDadosClienteAleatorios}
                  className="gap-2"
                >
                  <Shuffle className="h-4 w-4" />
                  Gerar Dados Aleatórios
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={clienteForm.name}
                    onChange={(e) => setClienteForm({ ...clienteForm, name: e.target.value })}
                    placeholder="João Silva"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clienteForm.email}
                    onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
                    placeholder="joao@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
                  <Input
                    id="cpfCnpj"
                    value={clienteForm.cpfCnpj}
                    onChange={(e) => setClienteForm({ ...clienteForm, cpfCnpj: e.target.value })}
                    placeholder="12345678909"
                  />
                  <p className="text-xs text-gray-500">Apenas números (CPF: 11 dígitos, CNPJ: 14 dígitos)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobilePhone">Celular</Label>
                  <Input
                    id="mobilePhone"
                    value={clienteForm.mobilePhone}
                    onChange={(e) => setClienteForm({ ...clienteForm, mobilePhone: e.target.value })}
                    placeholder="11987654321"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">CEP</Label>
                  <Input
                    id="postalCode"
                    value={clienteForm.postalCode}
                    onChange={(e) => setClienteForm({ ...clienteForm, postalCode: e.target.value })}
                    placeholder="01310-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={clienteForm.address}
                    onChange={(e) => setClienteForm({ ...clienteForm, address: e.target.value })}
                    placeholder="Av Paulista"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressNumber">Número</Label>
                  <Input
                    id="addressNumber"
                    value={clienteForm.addressNumber}
                    onChange={(e) => setClienteForm({ ...clienteForm, addressNumber: e.target.value })}
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">Bairro</Label>
                  <Input
                    id="province"
                    value={clienteForm.province}
                    onChange={(e) => setClienteForm({ ...clienteForm, province: e.target.value })}
                    placeholder="Bela Vista"
                  />
                </div>
              </div>

              <Button onClick={testarCriarCliente} disabled={loading} className="w-full">
                {loading ? 'Criando...' : 'Criar Cliente'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: CRIAR COBRANÇA */}
        <TabsContent value="cobranca">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Dados do Cliente</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={gerarDadosClienteAleatorios}
                    className="gap-2"
                  >
                    <Shuffle className="h-4 w-4" />
                    Gerar Cliente Aleatório
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name2">Nome *</Label>
                    <Input
                      id="name2"
                      value={clienteForm.name}
                      onChange={(e) => setClienteForm({ ...clienteForm, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email2">Email</Label>
                    <Input
                      id="email2"
                      type="email"
                      value={clienteForm.email}
                      onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpfCnpj2">CPF/CNPJ *</Label>
                    <Input
                      id="cpfCnpj2"
                      value={clienteForm.cpfCnpj}
                      onChange={(e) => setClienteForm({ ...clienteForm, cpfCnpj: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobilePhone2">Celular</Label>
                    <Input
                      id="mobilePhone2"
                      value={clienteForm.mobilePhone}
                      onChange={(e) => setClienteForm({ ...clienteForm, mobilePhone: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Dados da Cobrança</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={gerarDadosCobrancaAleatorios}
                    className="gap-2"
                  >
                    <Shuffle className="h-4 w-4" />
                    Gerar Cobrança Aleatória
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Valor (R$) *</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      value={cobrancaForm.value}
                      onChange={(e) => setCobrancaForm({ ...cobrancaForm, value: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Data de Vencimento *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={cobrancaForm.dueDate}
                      onChange={(e) => setCobrancaForm({ ...cobrancaForm, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={cobrancaForm.description}
                      onChange={(e) => setCobrancaForm({ ...cobrancaForm, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingType">Forma de Pagamento *</Label>
                    <select
                      id="billingType"
                      value={cobrancaForm.billingType}
                      onChange={(e) => setCobrancaForm({ ...cobrancaForm, billingType: e.target.value })}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md"
                    >
                      <option value="PIX">PIX</option>
                      <option value="BOLETO">Boleto</option>
                      <option value="CREDIT_CARD">Cartão de Crédito</option>
                    </select>
                  </div>
                </div>

                <Button onClick={testarCriarCobranca} disabled={loading} className="w-full">
                  {loading ? 'Criando...' : 'Criar Cliente e Cobrança'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* RESULTADO */}
      {erro && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">❌ Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{erro}</p>
          </CardContent>
        </Card>
      )}

      {resultado && (
        <div className="space-y-4">
          {resultado.tipo === 'cliente' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-700">✅ Cliente Criado com Sucesso!</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>ID:</strong> {resultado.data.id}</p>
                  <p><strong>Nome:</strong> {resultado.data.name}</p>
                  <p><strong>Email:</strong> {resultado.data.email}</p>
                  <p><strong>CPF/CNPJ:</strong> {resultado.data.cpfCnpj}</p>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium">Ver JSON completo</summary>
                  <pre className="mt-2 text-xs bg-white p-4 rounded overflow-auto max-h-64">
                    {JSON.stringify(resultado.data, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}

          {resultado.tipo === 'cobranca' && (
            <div className="space-y-4">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-700">✅ Cliente Criado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><strong>ID:</strong> {resultado.cliente.id}</p>
                  <p><strong>Nome:</strong> {resultado.cliente.name}</p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-700">💰 Cobrança Criada com Sucesso!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p><strong>ID:</strong> {resultado.cobranca.id}</p>
                    <p><strong>Valor:</strong> R$ {resultado.cobranca.value}</p>
                    <p><strong>Status:</strong> {resultado.cobranca.status}</p>
                    <p><strong>Vencimento:</strong> {resultado.cobranca.dueDate}</p>
                  </div>

                  {resultado.cobranca.pixTransaction && (
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium mb-2">QR Code PIX:</p>
                        <img
                          src={`data:image/png;base64,${resultado.cobranca.pixTransaction.qrCode.encodedImage}`}
                          alt="QR Code PIX"
                          className="w-64 h-64 border-2 border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <p className="font-medium mb-2">Código Copia e Cola:</p>
                        <textarea
                          readOnly
                          value={resultado.cobranca.pixTransaction.payload}
                          className="w-full p-2 text-xs border rounded font-mono"
                          rows={3}
                          onClick={(e) => e.currentTarget.select()}
                        />
                      </div>
                    </div>
                  )}

                  {resultado.cobranca.invoiceUrl && (
                    <div className="space-y-2">
                      <a
                        href={resultado.cobranca.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Ver Fatura
                      </a>
                    </div>
                  )}

                  {resultado.cobranca.bankSlipUrl && (
                    <div className="space-y-2">
                      <a
                        href={resultado.cobranca.bankSlipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                      >
                        Ver Boleto
                      </a>
                    </div>
                  )}

                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium">Ver JSON completo</summary>
                    <pre className="mt-2 text-xs bg-white p-4 rounded overflow-auto max-h-64">
                      {JSON.stringify(resultado.cobranca, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* DICAS */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Dicas para Testes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>CPF de teste válido:</strong> Use 11 dígitos (ex: 12345678909)</p>
          <p><strong>CNPJ de teste válido:</strong> Use 14 dígitos (ex: 12345678000195)</p>
          <p><strong>Email:</strong> Pode usar qualquer email válido</p>
          <p><strong>Telefone:</strong> Formato: DDI + DDD + Número (ex: 11987654321)</p>
          <p><strong>Ambiente:</strong> Sandbox (não gera cobranças reais)</p>
        </CardContent>
      </Card>
    </div>
  );
}
