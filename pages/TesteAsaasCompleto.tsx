import { useState } from 'react';
import { useAsaas } from '../hooks/useAsaas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

export default function TesteAsaasCompleto() {
  const { createCustomer, loading } = useAsaas();
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Formulário COMPLETO com TODOS os campos da API Asaas
  const [form, setForm] = useState({
    // OBRIGATÓRIO
    name: 'João Silva Teste',

    // CONTATO
    email: 'joao.silva@example.com',
    phone: '1133334444', // Telefone fixo
    mobilePhone: '11987654321', // Celular
    additionalEmails: '', // Emails adicionais separados por vírgula

    // ENDEREÇO
    postalCode: '01310-100', // CEP
    address: 'Av Paulista',
    addressNumber: '1000',
    complement: 'Andar 10',
    province: 'Bela Vista', // Bairro
    city: '', // Não precisa se enviar postalCode

    // DADOS FISCAIS
    cpfCnpj: '12345678909', // CPF (11) ou CNPJ (14 dígitos)
    municipalInscription: '', // Inscrição municipal
    stateInscription: '', // Inscrição estadual

    // OUTROS
    externalReference: '', // ID do seu sistema
    groupName: '', // Nome do grupo
    observations: 'Cliente criado via teste de integração',
    notificationDisabled: false, // Desabilitar notificações
  });

  const updateForm = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const testarCriarCliente = async () => {
    setResultado(null);
    setErro(null);

    try {
      console.log('🔄 Criando cliente completo...', form);

      // Preparar dados (remover campos vazios)
      const dadosCliente: any = {
        name: form.name,
      };

      // Adicionar apenas campos preenchidos
      if (form.email) dadosCliente.email = form.email;
      if (form.phone) dadosCliente.phone = form.phone;
      if (form.mobilePhone) dadosCliente.mobilePhone = form.mobilePhone;
      if (form.additionalEmails) dadosCliente.additionalEmails = form.additionalEmails;

      if (form.cpfCnpj) dadosCliente.cpfCnpj = form.cpfCnpj;

      if (form.postalCode) dadosCliente.postalCode = form.postalCode;
      if (form.address) dadosCliente.address = form.address;
      if (form.addressNumber) dadosCliente.addressNumber = form.addressNumber;
      if (form.complement) dadosCliente.complement = form.complement;
      if (form.province) dadosCliente.province = form.province;
      if (form.city) dadosCliente.city = form.city;

      if (form.municipalInscription) dadosCliente.municipalInscription = form.municipalInscription;
      if (form.stateInscription) dadosCliente.stateInscription = form.stateInscription;

      if (form.externalReference) dadosCliente.externalReference = form.externalReference;
      if (form.groupName) dadosCliente.groupName = form.groupName;
      if (form.observations) dadosCliente.observations = form.observations;
      if (form.notificationDisabled) dadosCliente.notificationDisabled = form.notificationDisabled;

      const cliente = await createCustomer(dadosCliente);

      console.log('✅ Cliente criado:', cliente);
      setResultado(cliente);
    } catch (error: any) {
      console.error('❌ Erro:', error);
      setErro(error.message || 'Erro desconhecido');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cadastro Completo de Cliente - Asaas</h1>
        <p className="text-gray-600 mt-2">
          Formulário com TODOS os campos disponíveis na API do Asaas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>Preencha os campos abaixo. Apenas o nome é obrigatório.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DADOS OBRIGATÓRIOS */}
          <div>
            <h3 className="font-semibold text-lg mb-4">📋 Dados Básicos (Obrigatório)</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="João Silva"
                  required
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* CONTATO */}
          <div>
            <h3 className="font-semibold text-lg mb-4">📞 Contato</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  placeholder="joao@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobilePhone">Celular</Label>
                <Input
                  id="mobilePhone"
                  value={form.mobilePhone}
                  onChange={(e) => updateForm('mobilePhone', e.target.value)}
                  placeholder="11987654321"
                />
                <p className="text-xs text-gray-500">Formato: DDD + Número</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone Fixo</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  placeholder="1133334444"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="additionalEmails">Emails Adicionais</Label>
                <Input
                  id="additionalEmails"
                  value={form.additionalEmails}
                  onChange={(e) => updateForm('additionalEmails', e.target.value)}
                  placeholder="email1@exemplo.com, email2@exemplo.com"
                />
                <p className="text-xs text-gray-500">Separe múltiplos emails por vírgula</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ENDEREÇO */}
          <div>
            <h3 className="font-semibold text-lg mb-4">📍 Endereço</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">CEP</Label>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => updateForm('postalCode', e.target.value)}
                  placeholder="01310-100"
                />
                <p className="text-xs text-gray-500">Se informar CEP, não precisa preencher cidade/estado/endereço</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressNumber">Número</Label>
                <Input
                  id="addressNumber"
                  value={form.addressNumber}
                  onChange={(e) => updateForm('addressNumber', e.target.value)}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Logradouro</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  placeholder="Av Paulista"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={form.complement}
                  onChange={(e) => updateForm('complement', e.target.value)}
                  placeholder="Andar 10, Sala 105"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Bairro</Label>
                <Input
                  id="province"
                  value={form.province}
                  onChange={(e) => updateForm('province', e.target.value)}
                  placeholder="Bela Vista"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => updateForm('city', e.target.value)}
                  placeholder="São Paulo"
                />
                <p className="text-xs text-gray-500">Opcional se informar CEP</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* DADOS FISCAIS */}
          <div>
            <h3 className="font-semibold text-lg mb-4">🏢 Dados Fiscais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
                <Input
                  id="cpfCnpj"
                  value={form.cpfCnpj}
                  onChange={(e) => updateForm('cpfCnpj', e.target.value)}
                  placeholder="12345678909"
                />
                <p className="text-xs text-gray-500">CPF: 11 dígitos / CNPJ: 14 dígitos (só números)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="municipalInscription">Inscrição Municipal</Label>
                <Input
                  id="municipalInscription"
                  value={form.municipalInscription}
                  onChange={(e) => updateForm('municipalInscription', e.target.value)}
                  placeholder="12345678"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="stateInscription">Inscrição Estadual</Label>
                <Input
                  id="stateInscription"
                  value={form.stateInscription}
                  onChange={(e) => updateForm('stateInscription', e.target.value)}
                  placeholder="123456789012"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* OUTROS DADOS */}
          <div>
            <h3 className="font-semibold text-lg mb-4">⚙️ Outros Dados</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="externalReference">Referência Externa (ID do seu sistema)</Label>
                <Input
                  id="externalReference"
                  value={form.externalReference}
                  onChange={(e) => updateForm('externalReference', e.target.value)}
                  placeholder="cliente_123"
                />
                <p className="text-xs text-gray-500">Use para vincular com ID do seu sistema</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupName">Nome do Grupo</Label>
                <Input
                  id="groupName"
                  value={form.groupName}
                  onChange={(e) => updateForm('groupName', e.target.value)}
                  placeholder="Clientes VIP"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <textarea
                  id="observations"
                  value={form.observations}
                  onChange={(e) => updateForm('observations', e.target.value)}
                  placeholder="Informações adicionais sobre o cliente..."
                  className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-md">
                <div className="space-y-0.5">
                  <Label htmlFor="notificationDisabled">Desabilitar Notificações</Label>
                  <p className="text-xs text-gray-500">Se ativo, cliente não receberá emails/SMS</p>
                </div>
                <Switch
                  id="notificationDisabled"
                  checked={form.notificationDisabled}
                  onCheckedChange={(checked) => updateForm('notificationDisabled', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          <Button onClick={testarCriarCliente} disabled={loading} className="w-full" size="lg">
            {loading ? 'Criando Cliente...' : 'Criar Cliente Completo'}
          </Button>
        </CardContent>
      </Card>

      {/* RESULTADO */}
      {erro && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">❌ Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 font-medium">{erro}</p>
          </CardContent>
        </Card>
      )}

      {resultado && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">✅ Cliente Criado com Sucesso!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ID do Cliente</p>
                <p className="font-mono font-bold">{resultado.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nome</p>
                <p className="font-bold">{resultado.name}</p>
              </div>
              {resultado.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p>{resultado.email}</p>
                </div>
              )}
              {resultado.cpfCnpj && (
                <div>
                  <p className="text-sm text-gray-600">CPF/CNPJ</p>
                  <p>{resultado.cpfCnpj}</p>
                </div>
              )}
            </div>

            <Separator />

            <details>
              <summary className="cursor-pointer font-medium text-blue-700 hover:text-blue-800">
                Ver JSON Completo da Resposta
              </summary>
              <pre className="mt-4 text-xs bg-white p-4 rounded overflow-auto max-h-96 border">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* DOCUMENTAÇÃO */}
      <Card>
        <CardHeader>
          <CardTitle>📚 Documentação dos Campos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>Campo Obrigatório:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><code>name</code> - Único campo obrigatório</li>
            </ul>
          </div>
          <div>
            <strong>Dica CEP:</strong>
            <p className="ml-4 mt-1 text-gray-600">
              Se informar o <code>postalCode</code>, o Asaas preenche automaticamente cidade, estado e endereço.
              Você só precisa informar <code>postalCode</code> e <code>addressNumber</code>.
            </p>
          </div>
          <div>
            <strong>CPF/CNPJ:</strong>
            <p className="ml-4 mt-1 text-gray-600">
              No sandbox, qualquer número no formato correto funciona (CPF: 11 dígitos, CNPJ: 14 dígitos)
            </p>
          </div>
          <div>
            <strong>Referência Externa:</strong>
            <p className="ml-4 mt-1 text-gray-600">
              Use <code>externalReference</code> para vincular o cliente Asaas com o ID do seu sistema
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
