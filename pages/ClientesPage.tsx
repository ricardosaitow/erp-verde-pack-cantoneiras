import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useClientes } from '../hooks/useClientes';
import type { Cliente, ClienteContato } from '../lib/database.types';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { CpfCnpjInput } from '@/components/ui/cpf-cnpj-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ClienteDetailModal } from '@/components/clientes/ClienteDetailModal';
import { ClientesFilter, applyFilters, type FilterState } from '@/components/clientes/ClientesFilter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, RefreshCw, Edit, Trash2, AlertTriangle, Users, Save, X, Building2, User, MapPin, CreditCard, FileText, Loader2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { buscarCNPJ, validarFormatoCNPJ } from '@/lib/cnpj-api';
import { buscarEnderecoPorCEP, validarFormatoCEP } from '@/lib/cep-api';
import { CepInput } from '@/components/ui/cep-input';
import { ContatosManager, type ContatoFormData } from '@/components/clientes/ContatosManager';

export default function ClientesPage() {
  const { clientes, loading, error, create, update, delete: deleteCliente, refresh, fetchContatos } = useClientes();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Cliente | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedClienteContatos, setSelectedClienteContatos] = useState<ClienteContato[]>([]);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tipoPessoa: 'todos',
    status: 'todos',
    cidade: '',
    estado: '',
  });

  // Aplicar filtros
  const clientesFiltrados = useMemo(() => {
    return applyFilters(clientes, filters);
  }, [clientes, filters]);

  // CNPJ API state
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cnpjError, setCnpjError] = useState<string>('');

  // CEP API state
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [cepStatus, setCepStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cepError, setCepError] = useState<string>('');

  // Contatos state
  const [contatos, setContatos] = useState<ContatoFormData[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    tipo_pessoa: 'juridica' as 'fisica' | 'juridica',
    razao_social: '',
    nome_fantasia: '',
    cnpj_cpf: '',
    inscricao_estadual: '',
    email: '',
    telefone: '',
    celular: '',
    endereco_completo: '',
    cep: '',
    cidade: '',
    estado: '',
    contato_principal: '',
    condicoes_pagamento: '',
    limite_credito: '',
    observacoes: '',
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      tipo_pessoa: 'juridica',
      razao_social: '',
      nome_fantasia: '',
      cnpj_cpf: '',
      inscricao_estadual: '',
      email: '',
      telefone: '',
      celular: '',
      endereco_completo: '',
      cep: '',
      cidade: '',
      estado: '',
      contato_principal: '',
      condicoes_pagamento: '',
      limite_credito: '',
      observacoes: '',
      ativo: true,
    });
    setContatos([]);
    setEditingItem(null);
    setLoadingCNPJ(false);
    setCnpjStatus('idle');
    setCnpjError('');
    setLoadingCEP(false);
    setCepStatus('idle');
    setCepError('');
  };

  // Buscar dados do CNPJ automaticamente
  const handleCNPJChange = async (value: string) => {
    setFormData({ ...formData, cnpj_cpf: value });
    setCnpjStatus('idle');
    setCnpjError('');

    // Apenas buscar se for pessoa jurídica e CNPJ completo (14 dígitos)
    if (formData.tipo_pessoa === 'juridica' && value.length === 14) {
      setLoadingCNPJ(true);

      try {
        const dados = await buscarCNPJ(value);

        if (dados) {
          // Montar endereço completo
          const enderecoPartes = [
            dados.logradouro,
            dados.numero,
            dados.complemento,
            dados.bairro
          ].filter(Boolean);

          const endereco = enderecoPartes.length > 0
            ? enderecoPartes.join(', ')
            : '';

          setFormData(prev => ({
            ...prev,
            razao_social: dados.razao_social || prev.razao_social,
            nome_fantasia: dados.nome_fantasia || prev.nome_fantasia,
            inscricao_estadual: dados.inscricao_estadual || prev.inscricao_estadual,
            endereco_completo: endereco || prev.endereco_completo,
            cep: dados.cep || prev.cep,
            cidade: dados.municipio || prev.cidade,
            estado: dados.uf || prev.estado,
          }));

          setCnpjStatus('success');
        }
      } catch (err: any) {
        console.error('Erro ao buscar CNPJ:', err);
        setCnpjStatus('error');
        setCnpjError(err.message || 'Erro ao buscar CNPJ');
      } finally {
        setLoadingCNPJ(false);
      }
    }
  };

  // Auto-buscar endereço quando CEP completar 8 dígitos
  const handleCEPChange = async (value: string) => {
    setFormData({ ...formData, cep: value });
    setCepStatus('idle');
    setCepError('');

    // Apenas buscar se CEP completo (8 dígitos)
    if (value.length === 8) {
      setLoadingCEP(true);

      try {
        const endereco = await buscarEnderecoPorCEP(value);

        // Preencher apenas logradouro (sem número), deixando o usuário adicionar o número
        const enderecoSemNumero = endereco.logradouro || '';

        setFormData(prev => ({
          ...prev,
          cep: endereco.cep,
          endereco_completo: enderecoSemNumero, // Apenas logradouro
          cidade: endereco.cidade || prev.cidade,
          estado: endereco.estado || prev.estado,
        }));

        setCepStatus('success');
      } catch (err: any) {
        console.error('Erro ao buscar CEP:', err);
        setCepStatus('error');
        setCepError(err.message || 'Erro ao buscar dados do CEP');
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const handleEdit = async (cliente: Cliente) => {
    setEditingItem(cliente);
    setFormData({
      tipo_pessoa: cliente.tipo_pessoa,
      razao_social: cliente.razao_social,
      nome_fantasia: cliente.nome_fantasia || '',
      cnpj_cpf: cliente.cnpj_cpf || '',
      inscricao_estadual: cliente.inscricao_estadual || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      celular: cliente.celular || '',
      endereco_completo: cliente.endereco_completo || '',
      cep: cliente.cep || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      contato_principal: cliente.contato_principal || '',
      condicoes_pagamento: cliente.condicoes_pagamento || '',
      limite_credito: cliente.limite_credito?.toString() || '',
      observacoes: cliente.observacoes || '',
      ativo: cliente.ativo,
    });

    // Carregar contatos do cliente
    const contatosCliente = await fetchContatos(cliente.id);
    setContatos(contatosCliente.map(c => ({
      id: c.id,
      tipo_contato: c.tipo_contato,
      nome_responsavel: c.nome_responsavel,
      email: c.email || '',
      telefone: c.telefone || '',
      observacoes: c.observacoes || ''
    })));

    setShowModal(true);
  };

  const handleRowClick = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    const contatosCliente = await fetchContatos(cliente.id);
    setSelectedClienteContatos(contatosCliente);
    setShowDetailModal(true);
  };

  const handleDelete = (id: string) => {
    confirmAction({
      title: 'Tem certeza que deseja excluir este cliente?',
      description: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Confirmar Exclusão',
      onConfirm: async () => {
        const { error: err } = await deleteCliente(id);
        if (err) {
          toast.error('Erro ao excluir cliente: ' + err);
        } else {
          toast.success('Cliente excluído com sucesso!');
          // Fechar o modal de detalhes após exclusão bem-sucedida
          setShowDetailModal(false);
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar contatos para Pessoa Jurídica
    if (formData.tipo_pessoa === 'juridica') {
      const temComercial = contatos.some(c => c.tipo_contato === 'comercial' && c.nome_responsavel.trim());
      const temFinanceiro = contatos.some(c => c.tipo_contato === 'financeiro' && c.nome_responsavel.trim());

      if (!temComercial || !temFinanceiro) {
        toast.error('Pessoa Jurídica precisa ter pelo menos 1 contato Comercial e 1 contato Financeiro preenchidos');
        return;
      }

      // Validar se todos os contatos têm nome e email OU telefone
      const contatosInvalidos = contatos.filter(c =>
        !c.nome_responsavel.trim() || (!c.email.trim() && !c.telefone.trim())
      );

      if (contatosInvalidos.length > 0) {
        toast.error('Todos os contatos precisam ter Nome e (Email ou Telefone)');
        return;
      }
    }

    const clienteData: any = {
      ...formData,
      limite_credito: formData.limite_credito ? Number(formData.limite_credito) : null,
      nome_fantasia: formData.nome_fantasia || null,
      cnpj_cpf: formData.cnpj_cpf || null,
      inscricao_estadual: formData.inscricao_estadual || null,
      email: formData.email || null,
      telefone: formData.telefone || null,
      celular: formData.celular || null,
      endereco_completo: formData.endereco_completo || null,
      cep: formData.cep || null,
      cidade: formData.cidade || null,
      estado: formData.estado || null,
      contato_principal: formData.contato_principal || null,
      condicoes_pagamento: formData.condicoes_pagamento || null,
      observacoes: formData.observacoes || null,
    };

    // Preparar contatos para salvar (sem o campo 'id' que é usado apenas no frontend)
    const contatosParaSalvar = contatos.map(({ id, ...contato }) => contato);

    if (editingItem) {
      const { error: err } = await update(editingItem.id, clienteData, contatosParaSalvar);
      if (err) {
        toast.error('Erro ao atualizar cliente: ' + err);
        return;
      }
      toast.success('Cliente atualizado com sucesso!');
    } else {
      const { error: err } = await create(clienteData, contatosParaSalvar);
      if (err) {
        toast.error('Erro ao criar cliente: ' + err);
        return;
      }
      toast.success('Cliente criado com sucesso!');
    }

    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar clientes</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <Button onClick={() => refresh()} variant="outline" size="sm" className="mt-4">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Clientes"
        description={
          clientesFiltrados.length !== clientes.length
            ? `${clientesFiltrados.length} de ${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'}`
            : clientes.length > 0
            ? `${clientes.length} ${clientes.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}`
            : undefined
        }
      >
        <Button type="button" onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button type="button" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </PageHeader>

      {/* Filtros */}
      <div onClick={(e) => e.stopPropagation()}>
        <ClientesFilter onFilterChange={setFilters} clientesOriginais={clientes} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Razão Social</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nome Fantasia</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">CNPJ/CPF</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      icon={<Users size={48} />}
                      title="Nenhum cliente cadastrado"
                      description="Clique em 'Novo Cliente' para começar"
                      action={{ label: '+ Novo Cliente', onClick: () => { resetForm(); setShowModal(true); } }}
                    />
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      icon={<Users size={48} />}
                      title="Nenhum cliente encontrado"
                      description="Tente ajustar os filtros de busca"
                    />
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(cliente)}
                  >
                    <td className="px-6 py-4 text-sm font-medium">{cliente.razao_social}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{cliente.nome_fantasia || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{cliente.cnpj_cpf || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{cliente.cidade || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={cliente.ativo ? 'success' : 'destructive'}>
                        {cliente.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      <ClienteDetailModal
        cliente={selectedCliente}
        contatos={selectedClienteContatos}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Dialog Form */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Cliente</DialogTitle>
                <DialogDescription>
                  Preencha os dados do cliente abaixo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                {formData.tipo_pessoa === 'juridica' ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>Informações Básicas</span>
              </div>

              {/* Tipo de Pessoa - PRIMEIRO CAMPO */}
              <div className="space-y-2">
                <Label htmlFor="tipo_pessoa" className="text-sm font-medium">
                  Tipo de Pessoa <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipo_pessoa}
                  onValueChange={(value) => {
                    setFormData({ ...formData, tipo_pessoa: value as 'fisica' | 'juridica', cnpj_cpf: '' });
                    setCnpjStatus('idle');
                    setCnpjError('');
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                    <SelectItem value="fisica">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CNPJ/CPF - SEGUNDO CAMPO */}
              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf" className="text-sm font-medium">
                  {formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}
                </Label>
                <div className="relative">
                  <CpfCnpjInput
                    id="cnpj_cpf"
                    value={formData.cnpj_cpf}
                    onChange={handleCNPJChange}
                    tipoPessoa={formData.tipo_pessoa}
                    disabled={loadingCNPJ}
                    className="h-10"
                  />
                  {loadingCNPJ && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  )}
                  {cnpjStatus === 'success' && !loadingCNPJ && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                  {cnpjStatus === 'error' && !loadingCNPJ && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                </div>
                {cnpjStatus === 'success' && (
                  <p className="text-xs text-green-600">
                    Dados do CNPJ preenchidos automaticamente
                  </p>
                )}
                {cnpjStatus === 'error' && (
                  <p className="text-xs text-red-600">
                    {cnpjError}
                  </p>
                )}
              </div>

              {/* Razão Social */}
              <div className="space-y-2">
                <Label htmlFor="razao_social" className="text-sm font-medium">
                  {formData.tipo_pessoa === 'juridica' ? 'Razão Social' : 'Nome Completo'} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  required
                  className="h-10"
                />
              </div>

              {/* Inscrição Estadual (apenas para PJ) */}
              {formData.tipo_pessoa === 'juridica' && (
                <div className="space-y-2">
                  <Label htmlFor="inscricao_estadual" className="text-sm font-medium">Inscrição Estadual</Label>
                  <Input
                    id="inscricao_estadual"
                    value={formData.inscricao_estadual}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                    className="h-10"
                    placeholder="Ex: 123.456.789.012"
                  />
                </div>
              )}

              {/* Nome Fantasia (apenas para PJ) */}
              {formData.tipo_pessoa === 'juridica' && (
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia" className="text-sm font-medium">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    className="h-10"
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Contatos */}
            <ContatosManager
              contatos={contatos}
              onChange={setContatos}
              tipoPessoa={formData.tipo_pessoa}
            />

            <Separator />

            {/* Endereço */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Endereço</span>
              </div>

              {/* CEP com busca automática */}
              <div className="space-y-2">
                <Label htmlFor="cep" className="text-sm font-medium">CEP</Label>
                <div className="relative">
                  <CepInput
                    id="cep"
                    value={formData.cep}
                    onChange={handleCEPChange}
                    disabled={loadingCEP}
                    className="h-10"
                  />
                  {loadingCEP && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  )}
                  {cepStatus === 'success' && !loadingCEP && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                  {cepStatus === 'error' && !loadingCEP && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                </div>
                {cepStatus === 'success' && (
                  <p className="text-xs text-green-600">
                    Endereço preenchido automaticamente
                  </p>
                )}
                {cepStatus === 'error' && (
                  <p className="text-xs text-red-600">
                    {cepError}
                  </p>
                )}
              </div>

              {/* Campos de endereço separados */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="space-y-2 sm:col-span-6">
                  <Label htmlFor="logradouro" className="text-sm font-medium">Logradouro</Label>
                  <Input
                    id="logradouro"
                    value={formData.endereco_completo.split(',')[0] || ''}
                    onChange={(e) => {
                      const numero = formData.endereco_completo.split(',')[1]?.trim() || '';
                      const complemento = formData.endereco_completo.split(',').slice(2).join(',').trim() || '';
                      const novo = [e.target.value, numero, complemento].filter(Boolean).join(', ');
                      setFormData({ ...formData, endereco_completo: novo });
                    }}
                    className="h-10"
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor="numero" className="text-sm font-medium">Número</Label>
                  <Input
                    id="numero"
                    value={formData.endereco_completo.split(',')[1]?.trim() || ''}
                    onChange={(e) => {
                      const logradouro = formData.endereco_completo.split(',')[0] || '';
                      const complemento = formData.endereco_completo.split(',').slice(2).join(',').trim() || '';
                      const novo = [logradouro, e.target.value, complemento].filter(Boolean).join(', ');
                      setFormData({ ...formData, endereco_completo: novo });
                    }}
                    className="h-10"
                    placeholder="123"
                  />
                </div>

                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor="complemento" className="text-sm font-medium">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.endereco_completo.split(',').slice(2).join(',').trim() || ''}
                    onChange={(e) => {
                      const logradouro = formData.endereco_completo.split(',')[0] || '';
                      const numero = formData.endereco_completo.split(',')[1]?.trim() || '';
                      const novo = [logradouro, numero, e.target.value].filter(Boolean).join(', ');
                      setFormData({ ...formData, endereco_completo: novo });
                    }}
                    className="h-10"
                    placeholder="Apto, Sala, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade" className="text-sm font-medium">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-sm font-medium">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    maxLength={2}
                    placeholder="UF"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Informações Comerciais */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Informações Comerciais</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="limite_credito" className="text-sm font-medium">Limite de Crédito</Label>
                  <CurrencyInput
                    id="limite_credito"
                    value={Number(formData.limite_credito) || 0}
                    onChange={(value) => setFormData({ ...formData, limite_credito: value.toString() })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condicoes_pagamento" className="text-sm font-medium">Condições de Pagamento</Label>
                  <Input
                    id="condicoes_pagamento"
                    value={formData.condicoes_pagamento}
                    onChange={(e) => setFormData({ ...formData, condicoes_pagamento: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Observações e Status */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Observações e Status</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-sm font-medium">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked as boolean })}
                />
                <Label htmlFor="ativo" className="cursor-pointer text-sm font-medium">
                  Cliente Ativo
                </Label>
              </div>
            </div>
          </form>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" onClick={handleSubmit} className="gap-2">
              <Save className="h-4 w-4" />
              {editingItem ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
