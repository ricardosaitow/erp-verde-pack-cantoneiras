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
