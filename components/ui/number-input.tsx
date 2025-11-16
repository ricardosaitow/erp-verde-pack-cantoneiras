import * as React from "react"
import { cn } from "@/lib/utils"

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value?: number | string;
  onChange?: (value: number) => void;
  allowDecimals?: boolean;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, allowDecimals = false, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('')

    React.useEffect(() => {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : (value || 0)
      setDisplayValue(formatNumber(numValue))
    }, [value, allowDecimals])

    const formatNumber = (num: number) => {
      if (allowDecimals) {
        return num.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      }
      // Para inteiros, apenas formata com separador de milhar
      return Math.floor(num).toLocaleString('pt-BR')
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value

      if (allowDecimals) {
        // Remove tudo exceto números
        inputValue = inputValue.replace(/\D/g, '')

        if (inputValue === '') {
          setDisplayValue('')
          onChange?.(0)
          return
        }

        // Para decimais, divide por 100 (considerando centavos)
        const numValue = parseInt(inputValue) / 100
        setDisplayValue(formatNumber(numValue))
        onChange?.(numValue)
      } else {
        // Remove tudo exceto números
        inputValue = inputValue.replace(/\D/g, '')

        if (inputValue === '') {
          setDisplayValue('')
          onChange?.(0)
          return
        }

        // Para inteiros, apenas converte
        const numValue = parseInt(inputValue)
        setDisplayValue(formatNumber(numValue))
        onChange?.(numValue)
      }
    }

    return (
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={displayValue}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    )
  }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }
