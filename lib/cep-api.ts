// ============================================
// API DE BUSCA DE CEP (ViaCEP)
// ============================================

export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // cidade
  uf: string; // estado
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

/**
 * Valida se o CEP está no formato correto (apenas números, 8 dígitos)
 */
export function validarFormatoCEP(cep: string): boolean {
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.length === 8;
}

/**
 * Formata o CEP para o padrão brasileiro (12345-678)
 */
export function formatarCEP(cep: string): string {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return cep;
  return cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/**
 * Remove formatação do CEP (retorna apenas números)
 */
export function limparCEP(cep: string): string {
  return cep.replace(/\D/g, '');
}

/**
 * Busca informações de endereço pelo CEP usando a API ViaCEP
 * @param cep - CEP com ou sem formatação
 * @returns Dados do endereço ou null se não encontrado
 * @throws Error se houver problema na requisição
 */
export async function buscarCEP(cep: string): Promise<CepData | null> {
  // Limpar e validar CEP
  const cepLimpo = limparCEP(cep);

  if (!validarFormatoCEP(cepLimpo)) {
    throw new Error('CEP inválido. Deve conter 8 dígitos.');
  }

  try {
    // Fazer requisição para ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar CEP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Verificar se o CEP foi encontrado
    if (data.erro) {
      return null;
    }

    return data as CepData;
  } catch (error) {
    if (error instanceof Error) {
      // Mensagens de erro mais amigáveis
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Não foi possível conectar ao serviço de busca de CEP. Verifique sua conexão com a internet.');
      }
      throw error;
    }
    throw new Error('Erro desconhecido ao buscar CEP');
  }
}

/**
 * Busca o CEP e retorna os dados formatados para o formulário
 */
export async function buscarEnderecoPorCEP(cep: string) {
  const dados = await buscarCEP(cep);

  if (!dados) {
    throw new Error('CEP não encontrado. Verifique o CEP digitado.');
  }

  // Montar endereço completo
  const enderecoPartes = [
    dados.logradouro,
    dados.bairro,
  ].filter(Boolean);

  return {
    cep: formatarCEP(dados.cep),
    endereco_completo: enderecoPartes.length > 0 ? enderecoPartes.join(' - ') : '',
    logradouro: dados.logradouro || '',
    bairro: dados.bairro || '',
    complemento: dados.complemento || '',
    cidade: dados.localidade || '',
    estado: dados.uf || '',
    ibge: dados.ibge || '',
    ddd: dados.ddd || '',
  };
}

/**
 * Exemplo de uso:
 *
 * const handleBuscarCEP = async (cep: string) => {
 *   try {
 *     const endereco = await buscarEnderecoPorCEP(cep);
 *     setFormData({
 *       ...formData,
 *       cep: endereco.cep,
 *       endereco_completo: endereco.endereco_completo,
 *       cidade: endereco.cidade,
 *       estado: endereco.estado,
 *     });
 *   } catch (error) {
 *     console.error('Erro ao buscar CEP:', error);
 *   }
 * };
 */
