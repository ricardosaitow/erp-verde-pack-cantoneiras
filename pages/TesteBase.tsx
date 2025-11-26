import { useState } from 'react';
import { useBase } from '../hooks/useBase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function TesteBase() {
  const {
    createCustomer,
    listCustomers,
    createProduct,
    listProducts,
    createSalesOrder,
    listSalesOrders,
    loading
  } = useBase();

  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Form Cliente
  const [clienteForm, setClienteForm] = useState({
    name: 'Empresa Teste Ltda',
    email: 'contato@empresateste.com',
    cpfCnpj: '12345678000195',
    phone: '1133334444',
    mobilePhone: '11987654321',
    postalCode: '01310100',
    address: 'Av Paulista',
    addressNumber: '1000',
    province: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  });

  // Form Produto
  const [produtoForm, setProdutoForm] = useState({
    name: 'Produto Teste',
    description: 'Descrição do produto teste',
    sku: 'PROD-001',
    price: '100.00',
    unit: 'UN',
    inventory: '50',
  });

  const testarCriarCliente = async () => {
    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Criando cliente...', clienteForm);
      const cliente = await createCustomer(clienteForm);
      console.log('✅ Cliente criado:', cliente);
      setResultado({ tipo: 'cliente', data: cliente });
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  const testarListarClientes = async () => {
    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Listando clientes...');
      const clientes = await listCustomers({ limit: 10 });
      console.log('✅ Clientes listados:', clientes);
      setResultado({ tipo: 'lista-clientes', data: clientes });
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  const testarCriarProduto = async () => {
    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Criando produto...', produtoForm);
      const produto = await createProduct({
        ...produtoForm,
        price: parseFloat(produtoForm.price),
        inventory: parseInt(produtoForm.inventory),
      });
      console.log('✅ Produto criado:', produto);
      setResultado({ tipo: 'produto', data: produto });
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  const testarListarProdutos = async () => {
    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Listando produtos...');
      const produtos = await listProducts({ limit: 10 });
      console.log('✅ Produtos listados:', produtos);
      setResultado({ tipo: 'lista-produtos', data: produtos });
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Teste de Integração Base ERP</h1>
        <p className="text-gray-600 mt-2">
          Teste a integração com a API do Base ERP (Sandbox)
        </p>
      </div>

      {/* Alert de configuração */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Configuração Necessária</AlertTitle>
        <AlertDescription>
          <div className="space-y-2 text-sm mt-2">
            <p><strong>1.</strong> Obtenha sua API Key do Base ERP (Sandbox)</p>
            <p><strong>2.</strong> Configure as variáveis de ambiente no Supabase:</p>
            <ul className="list-disc list-inside ml-4">
              <li><code>BASE_API_URL</code> = https://api-sandbox.baseerp.com.br</li>
              <li><code>BASE_API_KEY</code> = sua-api-key-aqui</li>
            </ul>
            <p><strong>3.</strong> Faça deploy da Edge Function: <code>npx supabase functions deploy base-proxy</code></p>
          </div>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
        </TabsList>

        {/* TAB: CLIENTES */}
        <TabsContent value="clientes">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Criar Cliente no Base</CardTitle>
                <CardDescription>Teste de criação de cliente via API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome/Razão Social *</Label>
                    <Input
                      id="name"
                      value={clienteForm.name}
                      onChange={(e) => setClienteForm({ ...clienteForm, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                    <Input
                      id="cpfCnpj"
                      value={clienteForm.cpfCnpj}
                      onChange={(e) => setClienteForm({ ...clienteForm, cpfCnpj: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={clienteForm.email}
                      onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobilePhone">Celular</Label>
                    <Input
                      id="mobilePhone"
                      value={clienteForm.mobilePhone}
                      onChange={(e) => setClienteForm({ ...clienteForm, mobilePhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={testarCriarCliente} disabled={loading} className="flex-1">
                    {loading ? 'Criando...' : '✨ Criar Cliente'}
                  </Button>
                  <Button onClick={testarListarClientes} disabled={loading} variant="outline" className="flex-1">
                    {loading ? 'Carregando...' : '📋 Listar Clientes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: PRODUTOS */}
        <TabsContent value="produtos">
          <Card>
            <CardHeader>
              <CardTitle>Criar Produto no Base</CardTitle>
              <CardDescription>Teste de criação de produto via API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prodName">Nome do Produto *</Label>
                  <Input
                    id="prodName"
                    value={produtoForm.name}
                    onChange={(e) => setProdutoForm({ ...produtoForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU/Código</Label>
                  <Input
                    id="sku"
                    value={produtoForm.sku}
                    onChange={(e) => setProdutoForm({ ...produtoForm, sku: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={produtoForm.price}
                    onChange={(e) => setProdutoForm({ ...produtoForm, price: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventory">Estoque</Label>
                  <Input
                    id="inventory"
                    type="number"
                    value={produtoForm.inventory}
                    onChange={(e) => setProdutoForm({ ...produtoForm, inventory: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={testarCriarProduto} disabled={loading} className="flex-1">
                  {loading ? 'Criando...' : '✨ Criar Produto'}
                </Button>
                <Button onClick={testarListarProdutos} disabled={loading} variant="outline" className="flex-1">
                  {loading ? 'Carregando...' : '📋 Listar Produtos'}
                </Button>
              </div>
            </CardContent>
          </Card>
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
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">✅ Sucesso!</CardTitle>
          </CardHeader>
          <CardContent>
            <details>
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
