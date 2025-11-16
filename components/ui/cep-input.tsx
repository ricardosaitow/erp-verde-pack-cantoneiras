import React, { forwardRef, useState } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

export interface CepInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Input para CEP com máscara automática (12345-678)
 * - Aceita apenas números
 * - Formata automaticamente enquanto digita
 * - Máximo de 8 dígitos
 */
export const CepInput = forwardRef<HTMLInputElement, CepInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value);

    const formatCep = (input: string): string => {
      // Remove tudo que não é número
      const numbers = input.replace(/\D/g, '');

      // Limita a 8 dígitos
      const limited = numbers.slice(0, 8);

      // Aplica a máscara 12345-678
      if (limited.length <= 5) {
        return limited;
      }

      return `${limited.slice(0, 5)}-${limited.slice(5)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formatted = formatCep(inputValue);

      setDisplayValue(formatted);

      // Retorna apenas os números para o componente pai
      const numbersOnly = formatted.replace(/\D/g, '');
      onChange(numbersOnly);
    };

    // Sincronizar valor externo com displayValue
    React.useEffect(() => {
      if (value !== displayValue.replace(/\D/g, '')) {
        setDisplayValue(formatCep(value));
      }
    }, [value]);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder="00000-000"
        maxLength={9}
        className={cn(className)}
      />
    );
  }
);

CepInput.displayName = 'CepInput';
