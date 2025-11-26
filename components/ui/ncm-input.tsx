import React from 'react';
import { Input } from './input';
import { formatarNCM } from '@/lib/produto-sync';
import { ExternalLink } from 'lucide-react';

interface NCMInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function NCMInput({
  value,
  onChange,
  id,
  placeholder = '0000.00.00',
  disabled = false,
  required = false,
  className,
}: NCMInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir apenas números
    const numeros = e.target.value.replace(/\D/g, '');

    // Limitar a 8 dígitos
    const limitado = numeros.slice(0, 8);

    onChange(limitado);
  };

  return (
    <div className="space-y-2">
      <Input
        id={id}
        type="text"
        value={formatarNCM(value)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={className}
        maxLength={10} // 8 dígitos + 2 pontos
      />
      {/* Link para consulta NCM */}
      <a
        href="https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/nomenclatura-comum-do-mercosul-ncm"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Consultar tabela NCM
      </a>
    </div>
  );
}
