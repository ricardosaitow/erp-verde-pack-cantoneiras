import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar se as credenciais estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERRO: Faltam as credenciais do Supabase!');
  console.error('Configure o arquivo .env.local com:');
  console.error('VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=sua_chave_aqui');
}

// Criar cliente mesmo sem credenciais (para evitar crash)
// Mas as requisições falharão até que as credenciais sejam configuradas
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

if (supabaseUrl && supabaseAnonKey) {
  console.log('✅ Supabase inicializado com sucesso!');
} else {
  console.warn('⚠️ Supabase não configurado - configure as credenciais no .env.local');
}
