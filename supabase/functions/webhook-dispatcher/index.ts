// ============================================
// EDGE FUNCTION: Webhook Dispatcher
// ============================================
// Distribui eventos do sistema para webhooks externos
// (n8n, Zapier, Make, etc.)
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  metadata?: {
    source?: string;
    user_id?: string;
    trace_id?: string;
  };
}

serve(async (req) => {
  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    const webhookSecret = req.headers.get('X-Webhook-Secret')
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET')

    // Aceitar tanto Bearer token quanto webhook secret
    if (expectedSecret && !authHeader && webhookSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload: WebhookPayload = await req.json()
    console.log('Dispatcher recebeu evento:', payload.event)

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar webhooks configurados para este evento
    const { data: webhookConfigs, error: configError } = await supabaseClient
      .from('webhook_configs')
      .select('*')
      .eq('active', true)
      .contains('events', [payload.event])

    if (configError) {
      console.error('Erro ao buscar configs de webhook:', configError)
      throw configError
    }

    if (!webhookConfigs || webhookConfigs.length === 0) {
      console.log(`Nenhum webhook configurado para evento: ${payload.event}`)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum webhook configurado para este evento',
          webhooks_sent: 0
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Disparar webhooks em paralelo
    const deliveryPromises = webhookConfigs.map(config =>
      deliverWebhook(supabaseClient, config, payload)
    )

    const results = await Promise.allSettled(deliveryPromises)

    // Contar sucessos e falhas
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    console.log(`Webhooks enviados: ${successful} sucesso, ${failed} falhas`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhooks processados',
        webhooks_sent: successful,
        webhooks_failed: failed,
        total: results.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro no dispatcher:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function deliverWebhook(
  supabase: any,
  config: any,
  payload: WebhookPayload
): Promise<{ success: boolean; attempts: number }> {
  const maxAttempts = config.retry_config?.max_attempts || 3
  const backoffSeconds = config.retry_config?.backoff_seconds || 5

  let lastError: Error | null = null
  let responseStatus: number | undefined
  let responseBody: any = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Tentativa ${attempt}/${maxAttempts} para ${config.name} (${config.url})`)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'VerdePack-ERP-Webhook/1.0',
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        'X-Webhook-Attempt': String(attempt),
        ...(config.headers || {}),
      }

      if (config.secret) {
        headers['X-Webhook-Secret'] = config.secret
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 segundos timeout
      })

      responseStatus = response.status

      try {
        responseBody = await response.json()
      } catch {
        responseBody = await response.text()
      }

      if (response.ok) {
        // Sucesso! Registrar log
        await supabase.from('webhook_logs').insert({
          webhook_config_id: config.id,
          event: payload.event,
          payload,
          response_status: responseStatus,
          response_body: responseBody,
          attempts: attempt,
          success: true,
          created_at: new Date().toISOString(),
        })

        console.log(`Webhook enviado com sucesso para ${config.name}`)
        return { success: true, attempts: attempt }
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

      // Se não for erro temporário (5xx), não tentar novamente
      if (response.status < 500) {
        break
      }

    } catch (error) {
      console.error(`Erro na tentativa ${attempt}:`, error)
      lastError = error as Error
    }

    // Aguardar antes da próxima tentativa (backoff exponencial)
    if (attempt < maxAttempts) {
      const waitTime = backoffSeconds * Math.pow(2, attempt - 1) * 1000
      console.log(`Aguardando ${waitTime}ms antes da próxima tentativa...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  // Falhou após todas as tentativas
  await supabase.from('webhook_logs').insert({
    webhook_config_id: config.id,
    event: payload.event,
    payload,
    response_status: responseStatus,
    response_body: responseBody,
    error: lastError?.message,
    attempts: maxAttempts,
    success: false,
    created_at: new Date().toISOString(),
  })

  console.error(`Webhook falhou para ${config.name} após ${maxAttempts} tentativas`)
  return { success: false, attempts: maxAttempts }
}
