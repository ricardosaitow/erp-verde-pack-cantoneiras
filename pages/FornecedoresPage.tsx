import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useFornecedores } from '../hooks/useFornecedores';
import type { Fornecedor } from '../lib/database.types';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FornecedorDetailModal } from '@/components/fornecedores/FornecedorDetailModal';
import { FornecedoresFilter, applyFilters, type FilterState } from '@/components/fornecedores/FornecedoresFilter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, RefreshCw, Edit, Trash2, AlertTriangle, Building2, Save, X, MapPin, Phone, FileText, Truck, Loader2, CheckCircle2, XCircle, User, Search } from 'lucide-react';
import { buscarCNPJ, validarFormatoCNPJ } from '@/lib/cnpj-api';
import { buscarEnderecoPorCEP, validarFormatoCEP } from '@/lib/cep-api';
import { CpfCnpjInput } from '@/components/ui/cpf-cnpj-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { CepInput } from '@/components/ui/cep-input';

export default function FornecedoresPage() {
  const { fornecedores, loading, error, create, update, delete: deleteFornecedor, refresh } = useFornecedores();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Fornecedor | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tipoPessoa: 'todos',
    status: 'todos',
    cidade: '',
    estado: '',
  });

  // Aplicar filtros
  const fornecedoresFiltrados = useMemo(() => {
    return applyFilters(fornecedores, filters);
  }, [fornecedores, filters]);

  // CNPJ API state
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cnpjError, setCnpjError] = useState<string>('');

  // CEP API state
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [cepStatus, setCepStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cepError, setCepError] = useState<string>('');

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
    prazo_entrega: '',
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
      prazo_entrega: '',
      observacoes: '',
      ativo: true,
    });
    setEditingItem(null);
    setLoadingCNPJ(false);
    setCnpjStatus('idle');
    setCnpjError('');
    setLoadingCEP(false);
    setCepStatus('idle');
    setCepError('');
  };

  const handleBuscarCNPJ = async () => {
    const cnpj = formData.cnpj_cpf.replace(/\D/g, '');

    if (!validarFormatoCNPJ(cnpj)) {
      setCnpjStatus('error');
      setCnpjError('CNPJ inválido. Digite um CNPJ válido com 14 dígitos.');
      return;
    }

    setLoadingCNPJ(true);
    setCnpjStatus('idle');
    setCnpjError('');

    try {
      const dados = await buscarCNPJ(cnpj);

      setFormData({
        ...formData,
        razao_social: dados.razao_social || formData.razao_social,
        nome_fantasia: dados.nome_fantasia || formData.nome_fantasia,
        endereco_completo: dados.logradouro
          ? `${dados.logradouro}${dados.numero ? ', ' + dados.numero : ''}${dados.complemento ? ', ' + dados.complemento : ''} - ${dados.bairro}`
          : formData.endereco_completo,
        cep: dados.cep || formData.cep,
        cidade: dados.municipio || formData.cidade,
        estado: dados.uf || formData.estado,
      });

      setCnpjStatus('success');
      toast.success('Dados do CNPJ carregados com sucesso!');
    } catch (error) {
      setCnpjStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar CNPJ';
      setCnpjError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingCNPJ(false);
    }
  };

  // Auto-buscar CNPJ quando completar 14 dígitos
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
        setCnpjError(err.message || 'Erro ao buscar dados do CNPJ');
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

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingItem(fornecedor);
    setFormData({
      tipo_pessoa: fornecedor.tipo_pessoa,
      razao_social: fornecedor.razao_social,
      nome_fantasia: fornecedor.nome_fantasia || '',
      cnpj_cpf: fornecedor.cnpj_cpf || '',
      inscricao_estadual: fornecedor.inscricao_estadual || '',
      email: fornecedor.email || '',
      telefone: fornecedor.telefone || '',
      celular: fornecedor.celular || '',
      endereco_completo: fornecedor.endereco_completo || '',
      cep: fornecedor.cep || '',
      cidade: fornecedor.cidade || '',
      estado: fornecedor.estado || '',
      contato_principal: fornecedor.contato_principal || '',
      condicoes_pagamento: fornecedor.condicoes_pagamento || '',
      prazo_entrega: fornecedor.prazo_entrega || '',
      observacoes: fornecedor.observacoes || '',
      ativo: fornecedor.ativo ?? true,
    });
    setShowModal(true);
  };

  const handleRowClick = (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    setShowDetailModal(true);
  };

  const handleDelete = (id: string) => {
    confirmAction({
      title: 'Tem certeza que deseja excluir este fornecedor?',
      description: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Confirmar Exclusão',
      onConfirm: async () => {
        const { error: err } = await deleteFornecedor(id);
        if (err) {
          toast.error('Erro ao excluir fornecedor: ' + err);
        } else {
          toast.success('Fornecedor excluído com sucesso!');
          setShowDetailModal(false);
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fornecedorData: any = {
      tipo_pessoa: formData.tipo_pessoa,
      razao_social: formData.razao_social,
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
      prazo_entrega: formData.prazo_entrega || null,
      observacoes: formData.observacoes || null,
      ativo: formData.ativo,
    };

    if (editingItem) {
      const { error: err } = await update(editingItem.id, fornecedorData);
      if (err) {
        toast.error('Erro ao atualizar fornecedor: ' + err);
        return;
      }
      toast.success('Fornecedor atualizado com sucesso!');
    } else {
      const { error: err } = await create(fornecedorData);
      if (err) {
        toast.error('Erro ao criar fornecedor: ' + err);
        return;
      }
      toast.success('Fornecedor criado com sucesso!');
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
          <AlertTitle>Erro ao carregar fornecedores</AlertTitle>
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
        title="Fornecedores"
        description={
          fornecedoresFiltrados.length !== fornecedores.length
            ? `${fornecedoresFiltrados.length} de ${fornecedores.length} ${fornecedores.length === 1 ? 'fornecedor' : 'fornecedores'}`
            : fornecedores.length > 0
            ? `${fornecedores.length} ${fornecedores.length === 1 ? 'fornecedor cadastrado' : 'fornecedores cadastrados'}`
            : undefined
        }
      >
        <Button type="button" onClick={() => refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button type="button" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </PageHeader>

      {/* Filtros */}
      <div onClick={(e) => e.stopPropagation()}>
        <FornecedoresFilter onFilterChange={setFilters} fornecedoresOriginais={fornecedores} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Razão Social</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nome Fantasia</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">CNPJ</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fornecedores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      icon={<Building2 size={48} />}
                      title="Nenhum fornecedor cadastrado"
                      description="Clique em 'Novo Fornecedor' para começar"
                      action={{ label: '+ Novo Fornecedor', onClick: () => { resetForm(); setShowModal(true); } }}
                    />
                  </td>
                </tr>
              ) : fornecedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      icon={<Building2 size={48} />}
                      title="Nenhum fornecedor encontrado"
                      description="Tente ajustar os filtros de busca"
                    />
                  </td>
                </tr>
              ) : (
                fornecedoresFiltrados.map((fornecedor) => (
                  <tr
                    key={fornecedor.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(fornecedor)}
                  >
                    <td className="px-6 py-4 text-sm font-medium">{fornecedor.razao_social}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{fornecedor.nome_fantasia || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{fornecedor.cnpj_cpf || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{fornecedor.cidade || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={fornecedor.ativo ? 'success' : 'destructive'}>
                        {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Fornecedor</DialogTitle>
                <DialogDescription>
                  Preencha os dados do fornecedor abaixo
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

            {/* Contato */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Contato</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contato_principal" className="text-sm font-medium">Responsável / Contato Principal</Label>
                <Input
                  id="contato_principal"
                  value={formData.contato_principal}
                  onChange={(e) => setFormData({ ...formData, contato_principal: e.target.value })}
                  className="h-10"
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-sm font-medium">Telefone</Label>
                  <PhoneInput
                    id="telefone"
                    value={formData.telefone}
                    onChange={(value) => setFormData({ ...formData, telefone: value })}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="celular" className="text-sm font-medium">Celular</Label>
                <PhoneInput
                  id="celular"
                  value={formData.celular}
                  onChange={(value) => setFormData({ ...formData, celular: value })}
                  className="h-10"
                />
              </div>
            </div>

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

            {/* Condições Comerciais */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Condições Comerciais</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prazo_entrega" className="text-sm font-medium">Prazo de Entrega</Label>
                  <Input
                    id="prazo_entrega"
                    value={formData.prazo_entrega}
                    onChange={(e) => setFormData({ ...formData, prazo_entrega: e.target.value })}
                    placeholder="Ex: 7 dias úteis"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condicoes_pagamento" className="text-sm font-medium">Condições de Pagamento</Label>
                  <Input
                    id="condicoes_pagamento"
                    value={formData.condicoes_pagamento}
                    onChange={(e) => setFormData({ ...formData, condicoes_pagamento: e.target.value })}
                    placeholder="Ex: 30/60 dias"
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
                  Fornecedor Ativo
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

      {/* Detail Modal */}
      <FornecedorDetailModal
        fornecedor={selectedFornecedor}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
