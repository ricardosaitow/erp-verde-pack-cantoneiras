import * as React from 'react'

import { cn } from '@/lib/utils'

export interface CpfCnpjInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  tipoPessoa: 'fisica' | 'juridica'
}

const CpfCnpjInput = React.forwardRef<HTMLInputElement, CpfCnpjInputProps>(
  ({ className, value = '', onChange, tipoPessoa, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('')

    // Formatar CPF: 000.000.000-00
    const formatCPF = (value: string) => {
      const numbers = value.replace(/\D/g, '')
      if (numbers.length <= 3) return numbers
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
      if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
    }

    // Formatar CNPJ: 00.000.000/0000-00
    const formatCNPJ = (value: string) => {
      const numbers = value.replace(/\D/g, '')
      if (numbers.length <= 2) return numbers
      if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
      if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
      if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`
    }

    // Atualizar display quando value externo mudar
    React.useEffect(() => {
      if (value) {
        const formatted = tipoPessoa === 'fisica' ? formatCPF(value) : formatCNPJ(value)
        setDisplayValue(formatted)
      } else {
        setDisplayValue('')
      }
    }, [value, tipoPessoa])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numbers = inputValue.replace(/\D/g, '')

      // Limitar tamanho
      const maxLength = tipoPessoa === 'fisica' ? 11 : 14
      const limitedNumbers = numbers.slice(0, maxLength)

      // Formatar
      const formatted = tipoPessoa === 'fisica'
        ? formatCPF(limitedNumbers)
        : formatCNPJ(limitedNumbers)

      setDisplayValue(formatted)

      // Retornar apenas números
      if (onChange) {
        onChange(limitedNumbers)
      }
    }

    const placeholderText = tipoPessoa === 'fisica'
      ? '000.000.000-00'
      : '00.000.000/0000-00'

    return (
      <input
        type="text"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholderText}
        {...props}
      />
    )
  }
)

CpfCnpjInput.displayName = 'CpfCnpjInput'

export { CpfCnpjInput }
