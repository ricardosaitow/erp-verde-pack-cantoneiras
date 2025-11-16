import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Input com máscara automática para telefone brasileiro
 * Aceita celular (11) 99999-9999 ou fixo (11) 9999-9999
 */
const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onChange, ...props }, ref) => {
    const formatPhone = (val: string): string => {
      // Remove tudo que não é número
      const numbers = val.replace(/\D/g, '');

      // Limita a 11 dígitos
      const limited = numbers.slice(0, 11);

      // Aplica a máscara
      if (limited.length <= 2) {
        return limited;
      } else if (limited.length <= 6) {
        return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
      } else if (limited.length <= 10) {
        // Telefone fixo: (11) 9999-9999
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
      } else {
        // Celular: (11) 99999-9999
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      onChange?.(formatted);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder="(00) 00000-0000"
        className={cn(className)}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
