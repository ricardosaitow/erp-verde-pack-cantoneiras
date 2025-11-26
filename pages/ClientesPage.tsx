import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { supabase } from '../lib/supabase';
import { useClientes } from '../hooks/useClientes';
import { useClienteIntegrado } from '../hooks/useClienteIntegrado';
import { useClienteAsaas } from '../hooks/useClienteAsaas';
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
import { Switch } from '@/components/ui/switch';
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
import { DataPagination } from '@/components/ui/data-pagination';
import { Plus, RefreshCw, Edit, Trash2, AlertTriangle, Users, Save, X, Building2, User, MapPin, CreditCard, FileText, Loader2, CheckCircle2, XCircle, Search, Cloud, DollarSign } from 'lucide-react';
import { buscarCNPJ, validarFormatoCNPJ } from '@/lib/cnpj-api';
import { buscarEnderecoPorCEP, validarFormatoCEP } from '@/lib/cep-api';
import { CepInput } from '@/components/ui/cep-input';
import { ContatosManager, type ContatoFormData } from '@/components/clientes/ContatosManager';

export default function ClientesPage() {
  const { clientes, loading, error, create, update, delete: deleteCliente, refresh, fetchContatos } = useClientes();
  const { criarClienteCompleto, atualizarClienteCompleto, inativarCliente, ativarCliente, loading: loadingIntegrado } = useClienteIntegrado();
  const { sincronizarClientesBulk, loading: loadingAsaas } = useClienteAsaas();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Cliente | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedClienteContatos, setSelectedClienteContatos] = useState<ClienteContato[]>([]);

  // Filter state (padrão: mostrar apenas ativos)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tipoPessoa: 'todos',
    status: 'ativo',  // Padrão: apenas clientes ativos
    cidade: '',
    estado: '',
  });

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  // Aplicar filtros
  const clientesFiltrados = useMemo(() => {
    return applyFilters(clientes, filters);
  }, [clientes, filters]);

  // Calcular paginação
  const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina);
  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return clientesFiltrados.slice(inicio, fim);
  }, [clientesFiltrados, paginaAtual, itensPorPagina]);

  // Resetar para página 1 quando filtros mudarem
  useMemo(() => {
    setPaginaAtual(1);
  }, [clientesFiltrados.length]);

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

  // Bulk sync state
  const [showBulkSyncModal, setShowBulkSyncModal] = useState(false);
  const [bulkSyncResult, setBulkSyncResult] = useState<{ sincronizados: number; erros: number; total: number } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    tipo_pessoa: 'juridica' as 'fisica' | 'juridica',
    razao_social: '',
    nome_fantasia: '',
    cnpj_cpf: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    email: '',
    telefone: '',
    celular: '',
    endereco_completo: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: '',
    contato_principal: '',
    condicoes_pagamento: '',
    limite_credito: '',
    observacoes: '',
    ativo: true,
    sincronizarBase: true,
    sincronizarAsaas: true,
    notificarAsaas: true,
  });

  const resetForm = () => {
    setFormData({
      tipo_pessoa: 'juridica',
      razao_social: '',
      nome_fantasia: '',
      cnpj_cpf: '',
      inscricao_estadual: '',
      inscricao_municipal: '',
      email: '',
      telefone: '',
      celular: '',
      endereco_completo: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cep: '',
      cidade: '',
      estado: '',
      contato_principal: '',
      condicoes_pagamento: '',
      limite_credito: '',
      observacoes: '',
      ativo: true,
      sincronizarBase: true,
      sincronizarAsaas: true,
      notificarAsaas: true,
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
      inscricao_municipal: cliente.inscricao_municipal || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      celular: cliente.celular || '',
      endereco_completo: cliente.endereco_completo || '',
      endereco: cliente.endereco || '',
      numero: cliente.numero || '',
      complemento: cliente.complemento || '',
      bairro: cliente.bairro || '',
      cep: cliente.cep || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      contato_principal: cliente.contato_principal || '',
      condicoes_pagamento: cliente.condicoes_pagamento || '',
      limite_credito: cliente.limite_credito?.toString() || '',
      observacoes: cliente.observacoes || '',
      ativo: cliente.ativo,
      sincronizarBase: true,
      sincronizarAsaas: true,
      notificarAsaas: true,
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

  const handleToggleActive = (id: string, isActive: boolean) => {
    const action = isActive ? 'inativar' : 'ativar';
    const actionPast = isActive ? 'inativado' : 'ativado';

    confirmAction({
      title: `Tem certeza que deseja ${action} este cliente?`,
      description: isActive
        ? 'O cliente será marcado como inativo no ERP, Asaas e Base ERP. Você pode reativá-lo depois.'
        : 'O cliente será reativado e voltará a aparecer nas listagens.',
      confirmLabel: `Confirmar ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      onConfirm: async () => {
        const { error: err } = isActive
          ? await inativarCliente(id)
          : await ativarCliente(id);

        if (err) {
          toast.error(`Erro ao ${action} cliente: ` + err);
        } else {
          // Fechar o modal de detalhes após ação bem-sucedida
          setShowDetailModal(false);
          // Recarregar lista
          await refresh();
        }
      }
    });
  };

  const handleBulkSync = async () => {
    setBulkSyncResult(null);
    try {
      const resultado = await sincronizarClientesBulk({
        somenteNaoSincronizados: true,
      });
      setBulkSyncResult(resultado);
    } catch (err) {
      console.error('Erro na sincronização bulk:', err);
    }
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
    const contatosParaSalvar = contatos.map(({ id, ...contato }) => ({
      ...contato,
      ativo: true
    }));

    if (editingItem) {
      // Atualizar cliente existente com integração Asaas
      try {
        await atualizarClienteCompleto(editingItem.id, {
          razao_social: formData.razao_social,
          nome_fantasia: formData.nome_fantasia || undefined,
          cnpj_cpf: formData.cnpj_cpf || undefined,
          email: formData.email || undefined,
          telefone: formData.telefone || undefined,
          celular: formData.celular || undefined,
          cep: formData.cep || undefined,
          endereco: formData.endereco || formData.endereco_completo.split(',')[0]?.trim() || undefined,
          numero: formData.numero || formData.endereco_completo.split(',')[1]?.trim() || undefined,
          complemento: formData.complemento || formData.endereco_completo.split(',').slice(2).join(',').trim() || undefined,
          bairro: formData.bairro || undefined,
          cidade: formData.cidade || undefined,
          estado: formData.estado || undefined,
          inscricao_estadual: formData.inscricao_estadual || undefined,
          inscricao_municipal: formData.inscricao_municipal || undefined,
          contato_principal: formData.contato_principal || undefined,
          condicoes_pagamento: formData.condicoes_pagamento || undefined,
          limite_credito: formData.limite_credito ? Number(formData.limite_credito) : undefined,
          observacoes: formData.observacoes || undefined,
          sincronizarBase: formData.sincronizarBase,
          sincronizarAsaas: formData.sincronizarAsaas,
        });

        // Atualizar contatos separadamente
        if (contatosParaSalvar.length > 0) {
          // Deletar contatos antigos
          await supabase
            .from('clientes_contatos')
            .delete()
            .eq('cliente_id', editingItem.id);

          // Inserir novos contatos
          const contatosComClienteId = contatosParaSalvar.map(contato => ({
            ...contato,
            cliente_id: editingItem.id,
          }));

          const { error: contatosError } = await supabase
            .from('clientes_contatos')
            .insert(contatosComClienteId);

          if (contatosError) {
            console.error('Erro ao atualizar contatos:', contatosError);
            toast.warning('Cliente atualizado, mas houve erro ao salvar contatos');
          }
        }

        await refresh();
      } catch (err: any) {
        toast.error('Erro ao atualizar cliente: ' + err.message);
        return;
      }
    } else {
      // Criar novo cliente com integração Asaas
      try {
        const clienteCriado = await criarClienteCompleto({
          tipo_pessoa: formData.tipo_pessoa,
          razao_social: formData.razao_social,
          nome_fantasia: formData.nome_fantasia || undefined,
          cnpj_cpf: formData.cnpj_cpf,
          email: formData.email || undefined,
          telefone: formData.telefone || undefined,
          celular: formData.celular || undefined,
          cep: formData.cep || undefined,
          endereco: formData.endereco || formData.endereco_completo.split(',')[0]?.trim() || undefined,
          numero: formData.numero || formData.endereco_completo.split(',')[1]?.trim() || undefined,
          complemento: formData.complemento || formData.endereco_completo.split(',').slice(2).join(',').trim() || undefined,
          bairro: formData.bairro || undefined,
          cidade: formData.cidade || undefined,
          estado: formData.estado || undefined,
          inscricao_estadual: formData.inscricao_estadual || undefined,
          inscricao_municipal: formData.inscricao_municipal || undefined,
          contato_principal: formData.contato_principal || undefined,
          condicoes_pagamento: formData.condicoes_pagamento || undefined,
          limite_credito: formData.limite_credito ? Number(formData.limite_credito) : undefined,
          group_name: undefined, // Será adicionado futuramente se necessário
          observacoes: formData.observacoes || undefined,
          contatos: contatos.map(c => ({
            tipo_contato: c.tipo_contato,
            nome_responsavel: c.nome_responsavel,
            email: c.email,
            telefone: c.telefone,
          })),
          sincronizarBase: formData.sincronizarBase,
          sincronizarAsaas: formData.sincronizarAsaas,
          notificarAsaas: formData.notificarAsaas,
        });

        // Criar contatos separadamente
        if (contatosParaSalvar.length > 0) {
          const contatosComClienteId = contatosParaSalvar.map(contato => ({
            ...contato,
            cliente_id: clienteCriado.cliente.id,
          }));

          const { error: contatosError } = await supabase
            .from('clientes_contatos')
            .insert(contatosComClienteId);

          if (contatosError) {
            console.error('Erro ao criar contatos:', contatosError);
            toast.warning('Cliente criado, mas houve erro ao salvar contatos');
          }
        }

        await refresh();
      } catch (err: any) {
        toast.error('Erro ao criar cliente: ' + err.message);
        return;
      }
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
        <Button type="button" onClick={() => setShowBulkSyncModal(true)} variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
          <Cloud className="h-4 w-4 mr-2" />
          Sincronizar com Asaas
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
                clientesPaginados.map((cliente) => (
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

        {/* Paginação */}
        <DataPagination
          currentPage={paginaAtual}
          totalPages={totalPaginas}
          totalItems={clientesFiltrados.length}
          itemsPerPage={itensPorPagina}
          onPageChange={setPaginaAtual}
          onItemsPerPageChange={(value) => {
            setItensPorPagina(value);
            setPaginaAtual(1);
          }}
        />
      </Card>

      {/* Detail Modal */}
      <ClienteDetailModal
        cliente={selectedCliente}
        contatos={selectedClienteContatos}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEdit}
        onToggleActive={(id) => handleToggleActive(id, selectedCliente?.ativo || false)}
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

              {/* Inscrições (apenas para PJ) */}
              {formData.tipo_pessoa === 'juridica' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="inscricao_municipal" className="text-sm font-medium">Inscrição Municipal</Label>
                    <Input
                      id="inscricao_municipal"
                      value={formData.inscricao_municipal}
                      onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                      className="h-10"
                      placeholder="Ex: 987.654.321"
                    />
                  </div>
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

            {/* Integrações - Apenas para novos clientes */}
            {!editingItem && (
              <>
                {/* Integração Base ERP */}
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-900 dark:text-green-100">
                    <Cloud className="h-4 w-4" />
                    <span>Integração com Base ERP (Fiscal)</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sincronizarBase" className="text-sm font-medium">
                          Sincronizar com Base ERP
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Cliente será criado automaticamente no Base ERP para emissão de NF-e
                        </p>
                      </div>
                      <Switch
                        id="sincronizarBase"
                        checked={formData.sincronizarBase}
                        onCheckedChange={(checked) => setFormData({ ...formData, sincronizarBase: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Integração Asaas */}
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                    <DollarSign className="h-4 w-4" />
                    <span>Integração com Asaas (Pagamentos)</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sincronizarAsaas" className="text-sm font-medium">
                          Sincronizar com Asaas
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Cliente será criado automaticamente no Asaas para receber cobranças
                        </p>
                      </div>
                      <Switch
                        id="sincronizarAsaas"
                        checked={formData.sincronizarAsaas}
                        onCheckedChange={(checked) => setFormData({ ...formData, sincronizarAsaas: checked })}
                      />
                    </div>

                    {formData.sincronizarAsaas && (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="notificarAsaas" className="text-sm font-medium">
                            Enviar Notificações
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Cliente receberá emails e SMS sobre cobranças
                          </p>
                        </div>
                        <Switch
                          id="notificarAsaas"
                          checked={formData.notificarAsaas}
                          onCheckedChange={(checked) => setFormData({ ...formData, notificarAsaas: checked })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

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
              disabled={loadingIntegrado}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={loadingIntegrado} className="gap-2">
              {loadingIntegrado ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editingItem ? 'Atualizando...' : 'Salvando...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editingItem ? 'Atualizar' : 'Salvar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Sync Modal */}
      <Dialog open={showBulkSyncModal} onOpenChange={setShowBulkSyncModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Cloud className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle>Sincronizar Clientes com Asaas</DialogTitle>
                <DialogDescription>
                  Sincroniza clientes existentes que ainda não estão no Asaas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Como funciona</AlertTitle>
              <AlertDescription className="text-blue-700 text-sm">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Busca clientes sem <code className="bg-blue-100 px-1 rounded">asaas_customer_id</code></li>
                  <li>Cria cada cliente no Asaas</li>
                  <li>Salva o ID retornado pelo Asaas no banco</li>
                  <li>Exibe resumo ao final</li>
                </ul>
              </AlertDescription>
            </Alert>

            {bulkSyncResult && (
              <Alert className={bulkSyncResult.erros === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                <CheckCircle2 className={`h-4 w-4 ${bulkSyncResult.erros === 0 ? 'text-green-600' : 'text-yellow-600'}`} />
                <AlertTitle className={bulkSyncResult.erros === 0 ? "text-green-900" : "text-yellow-900"}>
                  Sincronização Concluída
                </AlertTitle>
                <AlertDescription className={`${bulkSyncResult.erros === 0 ? 'text-green-700' : 'text-yellow-700'} text-sm`}>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Total de clientes:</span>
                      <strong>{bulkSyncResult.total}</strong>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>Sincronizados:</span>
                      <strong>{bulkSyncResult.sincronizados}</strong>
                    </div>
                    {bulkSyncResult.erros > 0 && (
                      <div className="flex justify-between text-red-700">
                        <span>Erros:</span>
                        <strong>{bulkSyncResult.erros}</strong>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowBulkSyncModal(false);
                setBulkSyncResult(null);
              }}
              disabled={loadingAsaas}
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={handleBulkSync}
              disabled={loadingAsaas}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {loadingAsaas ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4" />
                  Iniciar Sincronização
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
