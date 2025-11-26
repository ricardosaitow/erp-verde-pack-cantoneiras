// ============================================
// EDGE FUNCTION: Base Proxy
// ============================================
// Proxy para API do Base ERP
// Evita problemas de CORS e protege a API Key
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Ambiente de produção
const BASE_API_URL = 'https://api.baseerp.com.br'
const BASE_API_KEY = '$aeact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjBlM2YzZTkwLWM1OWQtNDhiYy1hYWQ2LTk3NjA2ODU1YTE0NTo6JGFlYWNoXzYwMmNmNDkxLTk2MjMtNDRiYi1iYzcxLWVkMmQ3OTRmMDc1Yw=='

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
}

// Função auxiliar para converter ArrayBuffer para base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const body = await req.json()
    const { endpoint, method = 'GET', data, responseType } = body

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Proxy request: ${method} ${endpoint}`)
    if (data) {
      console.log('📦 Dados completos recebidos pelo proxy:', JSON.stringify(data, null, 2))
    }

    // Detectar se é download de PDF ou XML
    const isPdfDownload = endpoint.endsWith('/pdf') || responseType === 'pdf'
    const isXmlDownload = endpoint.endsWith('/xml') || responseType === 'xml'
    const isBinaryDownload = isPdfDownload || isXmlDownload

    // Fazer requisição para API do Base ERP
    const fullUrl = `${BASE_API_URL}${endpoint}`

    console.log('🔗 URL completa:', fullUrl)
    console.log('🔑 API Key (primeiros 20 chars):', BASE_API_KEY.substring(0, 20) + '...')
    if (isBinaryDownload) {
      console.log('📄 Tipo de download:', isPdfDownload ? 'PDF' : 'XML')
    }

    // Headers para a requisição
    const requestHeaders: Record<string, string> = {
      'accept': isBinaryDownload ? (isPdfDownload ? 'application/pdf' : 'application/xml') : 'application/json',
      'access_token': BASE_API_KEY,
    }

    // Só adicionar Content-Type se houver body
    if (data) {
      requestHeaders['Content-Type'] = 'application/json'
    }

    console.log('📋 Headers enviados:', Object.keys(requestHeaders))

    const baseResponse = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
    })

    console.log('Base API Response Status:', baseResponse.status, baseResponse.statusText)

    // Se for download binário (PDF/XML)
    if (isBinaryDownload) {
      if (!baseResponse.ok) {
        const errorText = await baseResponse.text()
        console.error('Erro ao baixar arquivo:', errorText)
        return new Response(
          JSON.stringify({ error: `Erro ao baixar arquivo: ${baseResponse.status}` }),
          { status: baseResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Ler como ArrayBuffer e converter para base64
      const arrayBuffer = await baseResponse.arrayBuffer()
      const base64Data = arrayBufferToBase64(arrayBuffer)
      const contentType = isPdfDownload ? 'application/pdf' : 'application/xml'
      const fileName = isPdfDownload ? 'nfe.pdf' : 'nfe.xml'

      console.log(`✅ Arquivo baixado: ${arrayBuffer.byteLength} bytes`)

      return new Response(
        JSON.stringify({
          data: {
            base64: base64Data,
            contentType,
            fileName,
            size: arrayBuffer.byteLength
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Processar resposta JSON normal
    const responseText = await baseResponse.text()
    console.log('Base API Response Text:', responseText.substring(0, 500))

    // Tentar fazer parse do JSON
    let responseData
    try {
      responseData = responseText ? JSON.parse(responseText) : {}
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError)
      console.error('Resposta raw:', responseText)
      return new Response(
        JSON.stringify({ error: `Resposta inválida da API Base: ${responseText.substring(0, 200)}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Se houver erro na API do Base
    if (!baseResponse.ok) {
      console.error('Base API Error:', responseData)

      // Retornar o erro completo da API do Base
      return new Response(
        JSON.stringify(responseData),
        {
          status: baseResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Retornar sucesso no formato esperado: { data: ... }
    return new Response(
      JSON.stringify({ data: responseData }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
