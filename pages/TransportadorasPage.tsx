import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/toast-utils';
import { useTransportadoras, type Transportadora } from '@/hooks/useTransportadoras';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { CpfCnpjInput } from '@/components/ui/cpf-cnpj-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { TransportadoraDetailModal } from '@/components/transportadoras/TransportadoraDetailModal';
import { TransportadorasFilter, applyFilters, type FilterState } from '@/components/transportadoras/TransportadorasFilter';
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
import { DataPagination } from '@/components/ui/data-pagination';
import { Plus, RefreshCw, Save, X, Truck, Loader2, CheckCircle2, Cloud, AlertTriangle } from 'lucide-react';
import { buscarEnderecoPorCEP } from '@/lib/cep-api';
import { CepInput } from '@/components/ui/cep-input';
import { formatCpfCnpj, formatTelefone } from '@/lib/format';

export default function TransportadorasPage() {
  const { transportadoras, loading, error, refetch, create, update, inativar, ativar, sincronizarBulk } = useTransportadoras();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Transportadora | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransportadora, setSelectedTransportadora] = useState<Transportadora | null>(null);

  // Filter state (padrão: mostrar todos)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'todos',
    cidade: '',
    estado: '',
  });

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  // Bulk sync state
  const [showBulkSyncModal, setShowBulkSyncModal] = useState(false);
  const [bulkSyncResult, setBulkSyncResult] = useState<{ sincronizados: number; erros: number; total: number } | null>(null);

  // CEP API state
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [cepStatus, setCepStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cepError, setCepError] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cpfCnpj: '',
    email: '',
    phone: '',
    mobilePhone: '',
    postalCode: '',
    address: '',
    addressNumber: '',
    complement: '',
    province: '',
    cityName: '',
    stateAbbrev: '',
    country: 'Brasil',
    externalReference: '',
    observations: '',
  });

  // Aplicar filtros
  const transportadorasFiltradas = useMemo(() => {
    return applyFilters(transportadoras, filters);
  }, [transportadoras, filters]);

  // Calcular paginação
  const totalPaginas = Math.ceil(transportadorasFiltradas.length / itensPorPagina);
  const transportadorasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return transportadorasFiltradas.slice(inicio, fim);
  }, [transportadorasFiltradas, paginaAtual, itensPorPagina]);

  // Resetar para página 1 quando filtros mudarem
  useMemo(() => {
    setPaginaAtual(1);
  }, [transportadorasFiltradas.length]);

  const resetForm = () => {
    setFormData({
      name: '',
      cpfCnpj: '',
      email: '',
      phone: '',
      mobilePhone: '',
      postalCode: '',
      address: '',
      addressNumber: '',
      complement: '',
      province: '',
      cityName: '',
      stateAbbrev: '',
      country: 'Brasil',
      externalReference: '',
      observations: '',
    });
    setEditingItem(null);
    setLoadingCEP(false);
    setCepStatus('idle');
    setCepError('');
  };

  // Auto-buscar endereço quando CEP completar 8 dígitos
  const handleCEPChange = async (value: string) => {
    setFormData({ ...formData, postalCode: value });
    setCepStatus('idle');
    setCepError('');

    if (value.length === 8) {
      setLoadingCEP(true);

      try {
        const endereco = await buscarEnderecoPorCEP(value);

        setFormData(prev => ({
          ...prev,
          postalCode: endereco.cep,
          address: endereco.logradouro || '',
          province: endereco.bairro || '',
          cityName: endereco.cidade || prev.cityName,
          stateAbbrev: endereco.estado || prev.stateAbbrev,
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

  const handleEdit = async (transportadora: Transportadora) => {
    setEditingItem(transportadora);
    setFormData({
      name: transportadora.name,
      cpfCnpj: transportadora.cpfCnpj || '',
      email: transportadora.email || '',
      phone: transportadora.phone || '',
      mobilePhone: transportadora.mobilePhone || '',
      postalCode: transportadora.address?.postalCode || '',
      address: transportadora.address?.address || '',
      addressNumber: transportadora.address?.addressNumber || '',
      complement: transportadora.address?.complement || '',
      province: transportadora.address?.province || '',
      cityName: transportadora.address?.cityName || '',
      stateAbbrev: transportadora.address?.stateAbbrev || '',
      country: transportadora.address?.country || 'Brasil',
      externalReference: transportadora.externalReference || '',
      observations: transportadora.observations || '',
    });
    setShowModal(true);
  };

  const handleRowClick = async (transportadora: Transportadora) => {
    setSelectedTransportadora(transportadora);
    setShowDetailModal(true);
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    const action = isActive ? 'inativar' : 'ativar';
    const actionPast = isActive ? 'inativada' : 'ativada';

    confirmAction({
      title: `Tem certeza que deseja ${action} esta transportadora?`,
      description: isActive
        ? 'A transportadora será marcada como inativa no Base ERP. Você pode reativá-la depois.'
        : 'A transportadora será reativada e voltará a aparecer nas listagens.',
      confirmLabel: `Confirmar ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      onConfirm: async () => {
        const { error: err } = isActive
          ? await inativar(id)
          : await ativar(id);

        if (err) {
          toast.error(`Erro ao ${action} transportadora: ` + err);
        } else {
          setShowDetailModal(false);
          await refetch();
        }
      }
    });
  };

  const handleBulkSync = async () => {
    setBulkSyncResult(null);
    try {
      const resultado = await sincronizarBulk();
      setBulkSyncResult(resultado);
    } catch (err) {
      console.error('Erro na sincronização bulk:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const transportadoraData = {
      name: formData.name,
      cpfCnpj: formData.cpfCnpj || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      mobilePhone: formData.mobilePhone || undefined,
      postalCode: formData.postalCode || undefined,
      address: formData.address || undefined,
      addressNumber: formData.addressNumber || undefined,
      complement: formData.complement || undefined,
      province: formData.province || undefined,
      cityName: formData.cityName || undefined,
      stateAbbrev: formData.stateAbbrev || undefined,
      country: formData.country || 'Brasil',
      externalReference: formData.externalReference || undefined,
      observations: formData.observations || undefined,
    };

    if (editingItem) {
      await update(editingItem.id, transportadoraData);
    } else {
      await create(transportadoraData);
    }

    setShowModal(false);
    resetForm();
  };

  if (loading && transportadoras.length === 0) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar transportadoras</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
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
        title="Transportadoras"
        description={
          transportadorasFiltradas.length !== transportadoras.length
            ? `${transportadorasFiltradas.length} de ${transportadoras.length} ${transportadoras.length === 1 ? 'transportadora' : 'transportadoras'}`
            : transportadoras.length > 0
            ? `${transportadoras.length} ${transportadoras.length === 1 ? 'transportadora cadastrada' : 'transportadoras cadastradas'}`
            : undefined
        }
      >
        <Button type="button" onClick={() => refetch()} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        <Button type="button" onClick={() => setShowBulkSyncModal(true)} variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
          <Cloud className="h-4 w-4 mr-2" />
          Sincronizar
        </Button>
        <Button type="button" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Transportadora
        </Button>
      </PageHeader>

      {/* Filtros */}
      <div onClick={(e) => e.stopPropagation()}>
        <TransportadorasFilter onFilterChange={setFilters} transportadorasOriginais={transportadoras} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Transportadora</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">CNPJ/CPF</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cidade/UF</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transportadoras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      icon={<Truck size={48} />}
                      title="Nenhuma transportadora cadastrada"
                      description="Clique em 'Nova Transportadora' para começar"
                      action={{ label: '+ Nova Transportadora', onClick: () => { resetForm(); setShowModal(true); } }}
                    />
                  </td>
                </tr>
              ) : transportadorasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      icon={<Truck size={48} />}
                      title="Nenhuma transportadora encontrada"
                      description="Tente ajustar os filtros de busca"
                    />
                  </td>
                </tr>
              ) : (
                transportadorasPaginadas.map((transportadora) => (
                  <tr
                    key={transportadora.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(transportadora)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">{transportadora.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">ID: {transportadora.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {transportadora.cpfCnpj ? formatCpfCnpj(transportadora.cpfCnpj) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {transportadora.email && (
                          <div className="truncate max-w-[200px]">{transportadora.email}</div>
                        )}
                        {(transportadora.mobilePhone || transportadora.phone) && (
                          <div className="text-muted-foreground">
                            {formatTelefone(transportadora.mobilePhone || transportadora.phone || '')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {transportadora.address?.cityName ? (
                        <>
                          {transportadora.address.cityName}
                          {transportadora.address.stateAbbrev && ` / ${transportadora.address.stateAbbrev}`}
                        </>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={transportadora.deleted ? 'destructive' : 'success'}>
                        {transportadora.deleted ? 'Inativo' : 'Ativo'}
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
          totalItems={transportadorasFiltradas.length}
          itemsPerPage={itensPorPagina}
          onPageChange={setPaginaAtual}
          onItemsPerPageChange={(value) => {
            setItensPorPagina(value);
            setPaginaAtual(1);
          }}
        />
      </Card>

      {/* Detail Modal */}
      <TransportadoraDetailModal
        transportadora={selectedTransportadora}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEdit}
        onToggleActive={(id) => handleToggleActive(id, selectedTransportadora?.deleted === false)}
      />

      {/* Dialog Form */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Truck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Transportadora</DialogTitle>
                <DialogDescription>
                  Preencha os dados da transportadora abaixo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Nome da transportadora"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CNPJ/CPF</Label>
                  <CpfCnpjInput
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(value) => setFormData({ ...formData, cpfCnpj: value })}
                    tipoPessoa="juridica"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="externalReference">Referência Externa</Label>
                  <Input
                    id="externalReference"
                    value={formData.externalReference}
                    onChange={(e) => setFormData({ ...formData, externalReference: e.target.value })}
                    placeholder="Código ou referência externa"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <PhoneInput
                    id="phone"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobilePhone">Celular</Label>
                  <PhoneInput
                    id="mobilePhone"
                    value={formData.mobilePhone}
                    onChange={(value) => setFormData({ ...formData, mobilePhone: value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Endereço</h3>

              <div className="space-y-2">
                <Label htmlFor="postalCode">CEP</Label>
                <div className="relative">
                  <CepInput
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={handleCEPChange}
                    disabled={loadingCEP}
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
                </div>
                {cepStatus === 'success' && (
                  <p className="text-xs text-green-600">Endereço preenchido automaticamente</p>
                )}
                {cepStatus === 'error' && (
                  <p className="text-xs text-red-600">{cepError}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="space-y-2 sm:col-span-6">
                  <Label htmlFor="address">Logradouro</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor="addressNumber">Número</Label>
                  <Input
                    id="addressNumber"
                    value={formData.addressNumber}
                    onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                    placeholder="123"
                  />
                </div>

                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Sala, Galpão, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="province">Bairro</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cityName">Cidade</Label>
                  <Input
                    id="cityName"
                    value={formData.cityName}
                    onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stateAbbrev">Estado</Label>
                  <Input
                    id="stateAbbrev"
                    value={formData.stateAbbrev}
                    onChange={(e) => setFormData({ ...formData, stateAbbrev: e.target.value })}
                    maxLength={2}
                    placeholder="UF"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Observações */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  rows={3}
                  placeholder="Informações adicionais sobre a transportadora"
                />
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

      {/* Bulk Sync Modal */}
      <Dialog open={showBulkSyncModal} onOpenChange={setShowBulkSyncModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Cloud className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle>Sincronizar Transportadoras</DialogTitle>
                <DialogDescription>
                  Atualiza a lista de transportadoras do Base ERP
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
                  <li>Busca todas as transportadoras do Base ERP</li>
                  <li>Atualiza a lista local</li>
                  <li>Exibe resumo ao final</li>
                </ul>
              </AlertDescription>
            </Alert>

            {bulkSyncResult && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900">Sincronização Concluída</AlertTitle>
                <AlertDescription className="text-green-700 text-sm">
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Total de transportadoras:</span>
                      <strong>{bulkSyncResult.total}</strong>
                    </div>
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
              disabled={loading}
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={handleBulkSync}
              disabled={loading}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
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
