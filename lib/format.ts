/**
 * Formata número removendo decimais desnecessários (.00)
 * Exemplos:
 * - 10.00 -> "10"
 * - 10.50 -> "10,50"
 * - 10.123 -> "10,123"
 */
export function formatNumber(value: number, maxDecimals: number = 2): string {
  // Se o número é inteiro, retorna sem decimais
  if (Number.isInteger(value)) {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  // Caso contrário, formata com decimais necessários
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });
}

/**
 * Formata valores monetários em R$
 * Sempre mostra 2 casas decimais para consistência
 */
export function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Formata quantidade com unidade
 * Remove ,00 se for valor inteiro
 */
export function formatQuantity(value: number, unit: string, maxDecimals: number = 2): string {
  return `${formatNumber(value, maxDecimals)} ${unit}`;
}

/**
 * Formata CEP no padrão 00000-000
 */
export function formatCEP(cep: string | null | undefined): string {
  if (!cep) return '-';
  const numbers = cep.replace(/\D/g, '');
  if (numbers.length !== 8) return cep;
  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
}

/**
 * Formata telefone no padrão (00) 0000-0000 ou (00) 00000-0000
 */
export function formatTelefone(telefone: string | null | undefined): string {
  if (!telefone) return '-';
  const numbers = telefone.replace(/\D/g, '');

  if (numbers.length === 10) {
    // Telefone fixo: (00) 0000-0000
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  } else if (numbers.length === 11) {
    // Celular: (00) 00000-0000
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }

  return telefone;
}

/**
 * Formata CPF no padrão 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return cpf;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

/**
 * Formata CNPJ no padrão 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string): string {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return cnpj;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
}

/**
 * Formata CPF ou CNPJ automaticamente
 */
export function formatCpfCnpj(value: string | null | undefined): string {
  if (!value) return '-';
  const numbers = value.replace(/\D/g, '');

  if (numbers.length === 11) {
    return formatCPF(numbers);
  } else if (numbers.length === 14) {
    return formatCNPJ(numbers);
  }

  return value;
}

/**
 * Formata data no padrão DD/MM/YYYY
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}
