// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================
// SUBSTITUA PELOS SEUS VALORES:

const SUPABASE_CONFIG = {
    url: 'https://llijnkltivaxxudrlqkm.supabase.co',  // Ex: https://xxxxxxxxxxxx.supabase.co
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsaWpua2x0aXZheHh1ZHJscWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTU5NjAsImV4cCI6MjA3ODY3MTk2MH0.1F_RaOL9bmKGPeMcxlPfAiCZxpgCzTPwhXbxkxVILcY'  // Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
};

// ============================================
// NÃO MEXA DAQUI PARA BAIXO
// ============================================

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

console.log('✅ Supabase inicializado com sucesso!');
