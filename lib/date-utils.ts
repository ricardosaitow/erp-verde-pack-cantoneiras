/**
 * Utilitários para tratamento de datas e timezone (UTC <-> America/Sao_Paulo)
 */

// Timezone do Brasil (São Paulo)
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data do timezone do Brasil para UTC (para enviar ao Supabase)
 * @param date - Data no timezone do Brasil
 * @returns Data em UTC como string ISO
 */
export function toUTC(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Converte uma data UTC (do Supabase) para o timezone do Brasil
 * @param utcDate - Data em UTC (string ISO ou Date)
 * @returns Date object no timezone do Brasil
 */
export function fromUTC(utcDate: Date | string | null | undefined): Date | null {
  if (!utcDate) return null;
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return d;
}

/**
 * Formata uma data UTC para exibição no formato brasileiro
 * @param utcDate - Data em UTC (do Supabase)
 * @param options - Opções de formatação
 * @returns String formatada no padrão brasileiro
 */
export function formatBrazilianDate(
  utcDate: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!utcDate) return '-';

  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(d);
}

/**
 * Formata uma data UTC para exibição com hora no formato brasileiro
 * @param utcDate - Data em UTC (do Supabase)
 * @param options - Opções de formatação
 * @returns String formatada no padrão brasileiro com hora
 */
export function formatBrazilianDateTime(
  utcDate: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!utcDate) return '-';

  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(d);
}

/**
 * Formata uma data UTC para exibição longa (ex: "15 de novembro de 2025, 14:30")
 * @param utcDate - Data em UTC (do Supabase)
 * @returns String formatada no padrão brasileiro longo
 */
export function formatBrazilianDateTimeLong(
  utcDate: Date | string | null | undefined
): string {
  if (!utcDate) return '-';

  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Obtém a data/hora atual no timezone do Brasil
 * @returns Date object com a data/hora atual no Brasil
 */
export function nowInBrazil(): Date {
  return new Date();
}

/**
 * Obtém a data/hora atual no timezone do Brasil como string UTC (para Supabase)
 * @returns String ISO em UTC
 */
export function nowInBrazilAsUTC(): string {
  return new Date().toISOString();
}

/**
 * Converte um input de datetime-local (HTML) para UTC
 * @param dateTimeLocal - String no formato "YYYY-MM-DDTHH:mm" (do input datetime-local)
 * @returns String ISO em UTC
 */
export function dateTimeLocalToUTC(dateTimeLocal: string): string {
  // Input datetime-local já vem no timezone local do navegador
  const d = new Date(dateTimeLocal);
  return d.toISOString();
}

/**
 * Converte uma data UTC para o formato datetime-local (HTML input)
 * @param utcDate - Data em UTC
 * @returns String no formato "YYYY-MM-DDTHH:mm" para input datetime-local
 */
export function utcToDateTimeLocal(utcDate: Date | string | null | undefined): string {
  if (!utcDate) return '';

  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  // Converter para o timezone do Brasil
  const brazilDate = new Date(d.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));

  // Formatar como YYYY-MM-DDTHH:mm
  const year = brazilDate.getFullYear();
  const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
  const day = String(brazilDate.getDate()).padStart(2, '0');
  const hours = String(brazilDate.getHours()).padStart(2, '0');
  const minutes = String(brazilDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Verifica se uma data está no passado (timezone Brasil)
 * @param date - Data para verificar
 * @returns true se a data está no passado
 */
export function isPast(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

/**
 * Verifica se uma data está no futuro (timezone Brasil)
 * @param date - Data para verificar
 * @returns true se a data está no futuro
 */
export function isFuture(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

/**
 * Calcula a diferença em dias entre duas datas
 * @param date1 - Primeira data
 * @param date2 - Segunda data (padrão: agora)
 * @returns Número de dias de diferença
 */
export function daysDifference(
  date1: Date | string,
  date2: Date | string = new Date()
): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
