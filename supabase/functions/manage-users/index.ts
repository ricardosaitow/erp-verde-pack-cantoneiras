// Supabase Edge Function para gerenciar usuários
// Deploy: supabase functions deploy manage-users

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client for user management operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Note: We trust the JWT token provided by the client
    // Supabase validates it automatically

    const { method } = req
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // LIST USERS
    if (method === 'GET' && action === 'list') {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
      if (error) throw error

      return new Response(
        JSON.stringify({ users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE USER
    if (method === 'POST' && action === 'create') {
      const body = await req.json()
      const { email, password, user_metadata } = body

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata,
      })

      if (error) throw error

      return new Response(
        JSON.stringify({ user: data.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // UPDATE USER
    if (method === 'PUT' && action === 'update') {
      const body = await req.json()
      const { userId, updates } = body

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates)
      if (error) throw error

      return new Response(
        JSON.stringify({ user: data.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE USER
    if (method === 'DELETE' && action === 'delete') {
      const body = await req.json()
      const { userId } = body

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
