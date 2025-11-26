import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, User, Mail, Phone, Star } from 'lucide-react';

export interface ContatoFormData {
  id?: string;
  tipo_contato: 'comercial' | 'financeiro' | 'tecnico' | 'operacional' | 'diretoria' | 'outro';
  nome_responsavel: string;
  email: string;
  telefone: string;
  observacoes?: string;
  contato_principal_asaas?: boolean;
}

interface ContatosManagerProps {
  contatos: ContatoFormData[];
  onChange: (contatos: ContatoFormData[]) => void;
  tipoPessoa: 'fisica' | 'juridica';
}

const TIPOS_CONTATO_LABELS = {
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  tecnico: 'Técnico',
  operacional: 'Operacional',
  diretoria: 'Diretoria',
  outro: 'Outro'
};

export function ContatosManager({ contatos, onChange, tipoPessoa }: ContatosManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Inicializar contatos obrigatórios para PJ
  React.useEffect(() => {
    if (tipoPessoa === 'juridica' && contatos.length === 0) {
      // Criar automaticamente os 2 contatos obrigatórios
      onChange([
        {
          tipo_contato: 'comercial',
          nome_responsavel: '',
          email: '',
          telefone: '',
          observacoes: ''
        },
        {
          tipo_contato: 'financeiro',
          nome_responsavel: '',
          email: '',
          telefone: '',
          observacoes: ''
        }
      ]);
    }
  }, [tipoPessoa]);

  const adicionarContato = () => {
    // Para adicionar contatos extras (além dos obrigatórios)
    const novoContato: ContatoFormData = {
      tipo_contato: 'outro',
      nome_responsavel: '',
      email: '',
      telefone: '',
      observacoes: ''
    };

    onChange([...contatos, novoContato]);
    setEditingIndex(contatos.length);
  };

  const removerContato = (index: number) => {
    const contato = contatos[index];

    // Para PJ, não permitir remover contatos obrigatórios (comercial e financeiro)
    if (tipoPessoa === 'juridica' && (contato.tipo_contato === 'comercial' || contato.tipo_contato === 'financeiro')) {
      toast.error('Contatos Comercial e Financeiro são obrigatórios para Pessoa Jurídica');
      return;
    }

    const novosContatos = contatos.filter((_, i) => i !== index);
    onChange(novosContatos);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const atualizarContato = (index: number, campo: keyof ContatoFormData, valor: string | boolean) => {
    const contato = contatos[index];

    // Para PJ, não permitir alterar o tipo dos contatos obrigatórios
    if (tipoPessoa === 'juridica' && campo === 'tipo_contato') {
      if (contato.tipo_contato === 'comercial' || contato.tipo_contato === 'financeiro') {
        toast.error('Não é possível alterar o tipo dos contatos obrigatórios (Comercial e Financeiro)');
        return;
      }
    }

    const novosContatos = [...contatos];
    novosContatos[index] = { ...novosContatos[index], [campo]: valor };
    onChange(novosContatos);
  };

  const marcarContatoPrincipal = (index: number) => {
    const novosContatos = contatos.map((contato, i) => ({
      ...contato,
      contato_principal_asaas: i === index
    }));
    onChange(novosContatos);
  };

  const validarContatos = (): { valido: boolean; erros: string[] } => {
    const erros: string[] = [];

    // Validar campos obrigatórios
    contatos.forEach((contato, index) => {
      if (!contato.nome_responsavel.trim()) {
        erros.push(`Contato ${index + 1}: Nome é obrigatório`);
      }
      if (!contato.email.trim() && !contato.telefone.trim()) {
        erros.push(`Contato ${index + 1}: Email ou Telefone é obrigatório`);
      }
    });

    // Para PJ: validar contatos obrigatórios
    if (tipoPessoa === 'juridica') {
      const temComercial = contatos.some(c => c.tipo_contato === 'comercial' && c.nome_responsavel.trim());
      const temFinanceiro = contatos.some(c => c.tipo_contato === 'financeiro' && c.nome_responsavel.trim());

      if (!temComercial) {
        erros.push('Pessoa Jurídica precisa ter pelo menos 1 contato Comercial');
      }
      if (!temFinanceiro) {
        erros.push('Pessoa Jurídica precisa ter pelo menos 1 contato Financeiro');
      }
    }

    return { valido: erros.length === 0, erros };
  };

  const getBadgeVariant = (tipo: ContatoFormData['tipo_contato']) => {
    switch (tipo) {
      case 'comercial':
        return 'default';
      case 'financeiro':
        return 'secondary';
      case 'tecnico':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">
          Contatos {tipoPessoa === 'juridica' && <span className="text-destructive">*</span>}
        </h3>
      </div>

      {contatos.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum contato adicionado. Clique em "Adicionar Contato" para começar.
        </Card>
      ) : (
        <div className="space-y-3">
          {contatos.map((contato, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Contato {index + 1}</span>
                    <Badge variant={getBadgeVariant(contato.tipo_contato)}>
                      {TIPOS_CONTATO_LABELS[contato.tipo_contato]}
                    </Badge>
                    {tipoPessoa === 'juridica' && (contato.tipo_contato === 'comercial' || contato.tipo_contato === 'financeiro') && (
                      <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                    )}
                  </div>
                  {/* Só mostrar botão de remover se não for contato obrigatório */}
                  {!(tipoPessoa === 'juridica' && (contato.tipo_contato === 'comercial' || contato.tipo_contato === 'financeiro')) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerContato(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* Checkbox Contato Principal Asaas - Apenas para Comercial e Financeiro */}
                {tipoPessoa === 'juridica' && (contato.tipo_contato === 'comercial' || contato.tipo_contato === 'financeiro') && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                    <Checkbox
                      id={`contato-principal-${index}`}
                      checked={contato.contato_principal_asaas || false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          marcarContatoPrincipal(index);
                        }
                      }}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`contato-principal-${index}`}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1"
                      >
                        <Star className="h-3 w-3 text-blue-600" />
                        Contato Principal no Asaas
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dados deste contato serão usados como email, celular e telefone principal no Asaas. O email do outro contato irá para "Emails Adicionais".
                      </p>
                    </div>
                  </div>
                )}

                {/* Campos do formulário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tipo de Contato */}
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Tipo de Contato <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={contato.tipo_contato}
                      onValueChange={(value) => atualizarContato(index, 'tipo_contato', value)}
                      disabled={tipoPessoa === 'juridica' && (contato.tipo_contato === 'comercial' || contato.tipo_contato === 'financeiro')}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="operacional">Operacional</SelectItem>
                        <SelectItem value="diretoria">Diretoria</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nome Responsável */}
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Nome Responsável <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={contato.nome_responsavel}
                      onChange={(e) => atualizarContato(index, 'nome_responsavel', e.target.value)}
                      placeholder="Nome completo"
                      className="h-9"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={contato.email}
                      onChange={(e) => atualizarContato(index, 'email', e.target.value)}
                      placeholder="email@exemplo.com"
                      className="h-9"
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Telefone
                    </Label>
                    <PhoneInput
                      value={contato.telefone}
                      onChange={(value) => atualizarContato(index, 'telefone', value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Botão Adicionar Contato - Sempre abaixo dos contatos */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={adicionarContato}
        className="gap-2 w-full"
      >
        <Plus className="h-4 w-4" />
        Adicionar Contato
      </Button>
    </div>
  );
}
