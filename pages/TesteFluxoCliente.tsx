import { useState } from 'react';
import { useClienteAsaas } from '../hooks/useClienteAsaas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shuffle } from 'lucide-react';
import { gerarClienteFake } from '../lib/fakeData';

export default function TesteFluxoCliente() {
  const { criarClienteCompleto, sincronizarClienteExistente, loading } = useClienteAsaas();
  const [resultado, setResultado] = useState<any>(null);

  const [form, setForm] = useState({
    razao_social: 'Empresa Teste Ltda',
    nome_fantasia: 'Empresa Teste',
    cnpj_cpf: '12345678909',
    email: 'contato@empresateste.com',
    telefone: '1133334444',
    celular: '11987654321',
    cep: '01310100',
    endereco: 'Av Paulista',
    numero: '1000',
    complemento: 'Sala 100',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
    inscricao_estadual: '',
    inscricao_municipal: '',
    observacoes: 'Cliente criado via teste de integração',
    sincronizarAsaas: true,
    notificarAsaas: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultado(null);

    try {
      const cliente = await criarClienteCompleto(form);
      setResultado(cliente);
    } catch (error) {
      console.error(error);
    }
  };

  const updateForm = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const gerarDadosAleatorios = () => {
    const dadosFake = gerarClienteFake('juridica');
    setForm({
      razao_social: dadosFake.razao_social,
      nome_fantasia: dadosFake.nome_fantasia,
      cnpj_cpf: dadosFake.cnpj_cpf,
      email: dadosFake.email,
      telefone: dadosFake.telefone,
      celular: dadosFake.celular,
      cep: dadosFake.cep,
      endereco: dadosFake.endereco,
      numero: dadosFake.numero,
      complemento: dadosFake.complemento,
      bairro: dadosFake.bairro,
      cidade: dadosFake.cidade,
      estado: dadosFake.estado,
      inscricao_estadual: dadosFake.inscricao_estadual,
      inscricao_municipal: dadosFake.inscricao_municipal,
      observacoes: dadosFake.observacoes,
      sincronizarAsaas: true,
      notificarAsaas: true,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* EXPLICAÇÃO DO FLUXO */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">🔄 Fluxo Automático de Integração</CardTitle>
          <CardDescription className="text-blue-700">
            Este teste demonstra o fluxo completo e automático de criação de cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-900">
          <div className="font-semibold">O que acontece quando você clica em "Criar Cliente":</div>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>
              <strong>Cria no ERP</strong> (Supabase) → Gera ID do cliente (ex: 123)
            </li>
            <li>
              <strong>Envia para Asaas</strong> com <code className="bg-blue-100 px-1 rounded">externalReference = "123"</code>
            </li>
            <li>
              <strong>Recebe ID do Asaas</strong> (ex: cus_000005219613)
            </li>
            <li>
              <strong>Salva no banco</strong> o <code className="bg-blue-100 px-1 rounded">asaas_customer_id</code>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-white rounded border border-blue-200">
            <strong>Resultado:</strong> Cliente vinculado em ambos os sistemas!
            <ul className="mt-2 space-y-1 text-xs">
              <li>• No ERP: Você pode achar o cliente pelo <code>id</code></li>
              <li>• No Asaas: Você pode achar pelo <code>externalReference</code> (que é o <code>id</code> do ERP)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* FORMULÁRIO */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Criar Cliente no ERP + Asaas</CardTitle>
                <CardDescription>
                  Preencha os dados do cliente. Ele será criado no banco e automaticamente sincronizado com Asaas.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={gerarDadosAleatorios}
                className="gap-2"
              >
                <Shuffle className="h-4 w-4" />
                Gerar Dados Aleatórios
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados Básicos */}
            <div className="space-y-4">
              <h3 className="font-semibold">Dados da Empresa</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    value={form.razao_social}
                    onChange={(e) => updateForm('razao_social', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={form.nome_fantasia}
                    onChange={(e) => updateForm('nome_fantasia', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj_cpf">CPF/CNPJ *</Label>
                  <Input
                    id="cnpj_cpf"
                    value={form.cnpj_cpf}
                    onChange={(e) => updateForm('cnpj_cpf', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={form.celular}
                    onChange={(e) => updateForm('celular', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={form.telefone}
                    onChange={(e) => updateForm('telefone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="font-semibold">Endereço</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={form.cep}
                    onChange={(e) => updateForm('cep', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={form.numero}
                    onChange={(e) => updateForm('numero', e.target.value)}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={form.endereco}
                    onChange={(e) => updateForm('endereco', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={form.complemento}
                    onChange={(e) => updateForm('complemento', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={form.bairro}
                    onChange={(e) => updateForm('bairro', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={form.cidade}
                    onChange={(e) => updateForm('cidade', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={form.estado}
                    onChange={(e) => updateForm('estado', e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={form.observacoes}
                onChange={(e) => updateForm('observacoes', e.target.value)}
                className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md"
              />
            </div>

            {/* Opções */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">Opções de Sincronização</h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sincronizarAsaas">Sincronizar com Asaas</Label>
                  <p className="text-xs text-gray-500">
                    Se desabilitado, cria apenas no ERP (sem Asaas)
                  </p>
                </div>
                <Switch
                  id="sincronizarAsaas"
                  checked={form.sincronizarAsaas}
                  onCheckedChange={(checked) => updateForm('sincronizarAsaas', checked)}
                />
              </div>

              {form.sincronizarAsaas && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notificarAsaas">Enviar Notificações (Asaas)</Label>
                    <p className="text-xs text-gray-500">
                      Cliente receberá emails/SMS do Asaas
                    </p>
                  </div>
                  <Switch
                    id="notificarAsaas"
                    checked={form.notificarAsaas}
                    onCheckedChange={(checked) => updateForm('notificarAsaas', checked)}
                  />
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Criando Cliente...' : '🚀 Criar Cliente (ERP + Asaas)'}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* RESULTADO */}
      {resultado && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              ✅ Cliente Criado com Sucesso!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded border">
                <div className="text-sm text-gray-600 mb-1">ID no ERP (Supabase)</div>
                <div className="font-mono font-bold text-lg">{resultado.id}</div>
              </div>

              {resultado.asaas_customer_id && (
                <div className="p-4 bg-white rounded border">
                  <div className="text-sm text-gray-600 mb-1">ID no Asaas</div>
                  <div className="font-mono font-bold text-lg">{resultado.asaas_customer_id}</div>
                </div>
              )}

              <div className="p-4 bg-white rounded border col-span-2">
                <div className="text-sm text-gray-600 mb-1">Status de Sincronização</div>
                <div className="flex gap-2">
                  <Badge variant="default">✅ Criado no ERP</Badge>
                  {resultado.asaas_customer_id ? (
                    <Badge className="bg-blue-600">✅ Sincronizado com Asaas</Badge>
                  ) : (
                    <Badge variant="outline">⚠️ Não sincronizado com Asaas</Badge>
                  )}
                </div>
              </div>
            </div>

            {resultado.asaas_customer && (
              <div className="p-4 bg-white rounded border">
                <div className="font-semibold mb-2">🔗 Vínculo Automático Criado:</div>
                <div className="text-sm space-y-1">
                  <p>• No <strong>ERP</strong>: Cliente ID <code className="bg-gray-100 px-1 rounded">{resultado.id}</code> tem <code className="bg-gray-100 px-1 rounded">asaas_customer_id</code> = <code className="bg-gray-100 px-1 rounded">{resultado.asaas_customer_id}</code></p>
                  <p>• No <strong>Asaas</strong>: Cliente <code className="bg-gray-100 px-1 rounded">{resultado.asaas_customer_id}</code> tem <code className="bg-gray-100 px-1 rounded">externalReference</code> = <code className="bg-gray-100 px-1 rounded">"{resultado.id}"</code></p>
                </div>
              </div>
            )}

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
