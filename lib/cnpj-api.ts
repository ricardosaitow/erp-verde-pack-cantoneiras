export interface CNPJData {
  razao_social: string
  nome_fantasia: string
  cnpj: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  inscricao_estadual?: string
}

/**
 * Remove espaços extras e deixa apenas 1 espaço entre palavras
 */
function normalizarEspacos(texto: string): string {
  if (!texto) return '';
  return texto.trim().replace(/\s+/g, ' ');
}

export interface InscricaoEstadual {
  inscricao_estadual?: string
  ativo?: boolean
  estado?: {
    sigla?: string
  }
}

export interface CNPJApiResponse {
  razao_social?: string
  estabelecimento?: {
    nome_fantasia?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: {
      nome?: string
    }
    estado?: {
      sigla?: string
    }
    cep?: string
    inscricoes_estaduais?: InscricaoEstadual[]
  }
}

/**
 * Busca informações de CNPJ na API pública https://publica.cnpj.ws
 * @param cnpj - CNPJ com apenas números (14 dígitos)
 * @returns Dados da empresa ou null se não encontrado
 */
export async function buscarCNPJ(cnpj: string): Promise<CNPJData | null> {
  try {
    // Remover caracteres não numéricos
    const cnpjLimpo = cnpj.replace(/\D/g, '')

    // Validar tamanho
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve conter 14 dígitos')
    }

    // Fazer requisição
    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjLimpo}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('CNPJ não encontrado')
      }
      if (response.status === 400) {
        throw new Error('CNPJ inválido ou não encontrado')
      }
      throw new Error('Erro ao consultar CNPJ. Tente novamente.')
    }

    const data: CNPJApiResponse = await response.json()

    // Montar endereço completo com normalização de espaços
    const enderecoPartes = [
      normalizarEspacos(data.estabelecimento?.logradouro || ''),
      normalizarEspacos(data.estabelecimento?.numero || ''),
      normalizarEspacos(data.estabelecimento?.complemento || ''),
      normalizarEspacos(data.estabelecimento?.bairro || '')
    ].filter(Boolean)

    const endereco_completo = enderecoPartes.length > 0
      ? enderecoPartes.join(', ')
      : ''

    // Buscar inscrição estadual ativa do estado do estabelecimento
    const ufEstabelecimento = data.estabelecimento?.estado?.sigla
    let inscricaoEstadual = ''

    if (ufEstabelecimento && data.estabelecimento?.inscricoes_estaduais) {
      // Procurar inscrição estadual ativa do mesmo estado
      const inscricaoAtiva = data.estabelecimento.inscricoes_estaduais.find(
        ie => ie.estado?.sigla === ufEstabelecimento && ie.ativo
      )

      if (inscricaoAtiva) {
        inscricaoEstadual = inscricaoAtiva.inscricao_estadual || ''
      } else {
        // Se não encontrou ativa, pega a primeira do estado
        const inscricaoEstado = data.estabelecimento.inscricoes_estaduais.find(
          ie => ie.estado?.sigla === ufEstabelecimento
        )
        inscricaoEstadual = inscricaoEstado?.inscricao_estadual || ''
      }
    }

    // Retornar dados formatados (SEM email e telefone - serão gerenciados por contatos)
    // Todos os campos de texto são normalizados para remover espaços extras
    return {
      razao_social: normalizarEspacos(data.razao_social || ''),
      nome_fantasia: normalizarEspacos(data.estabelecimento?.nome_fantasia || ''),
      cnpj: cnpjLimpo,
      logradouro: normalizarEspacos(data.estabelecimento?.logradouro || ''),
      numero: normalizarEspacos(data.estabelecimento?.numero || ''),
      complemento: normalizarEspacos(data.estabelecimento?.complemento || ''),
      bairro: normalizarEspacos(data.estabelecimento?.bairro || ''),
      municipio: normalizarEspacos(data.estabelecimento?.cidade?.nome || ''),
      uf: data.estabelecimento?.estado?.sigla || '',
      cep: data.estabelecimento?.cep || '',
      inscricao_estadual: inscricaoEstadual
    }

  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error)
    throw error
  }
}

/**
 * Valida se um CNPJ é válido (apenas formato)
 */
export function validarFormatoCNPJ(cnpj: string): boolean {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  return cnpjLimpo.length === 14
}

/**
 * Valida se um CPF é válido (apenas formato)
 */
export function validarFormatoCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, '')
  return cpfLimpo.length === 11
}
