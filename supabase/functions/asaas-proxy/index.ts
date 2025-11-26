// ============================================
// EDGE FUNCTION: Asaas Proxy
// ============================================
// Proxy para API do Asaas
// Evita problemas de CORS e protege a API Key
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3'
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação (opcional - pode adicionar validação de token)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const body = await req.json()
    const { endpoint, method = 'GET', data } = body

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Proxy request: ${method} ${endpoint}`)
    console.log('📦 Dados completos recebidos pelo proxy:', JSON.stringify(data, null, 2))

    // Fazer requisição para API do Asaas
    const asaasResponse = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    const responseData = await asaasResponse.json()

    console.log('Asaas API Response:', {
      status: asaasResponse.status,
      data: responseData
    })

    // Se houver erro na API do Asaas
    if (!asaasResponse.ok) {
      console.error('Asaas API Error:', responseData)
      return new Response(
        JSON.stringify({
          error: responseData.errors?.[0]?.description || 'Erro na API do Asaas',
          errors: responseData.errors,
          data: null
        }),
        {
          status: asaasResponse.status,
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
