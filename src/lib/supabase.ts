import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validação básica para evitar o erro "Invalid supabaseUrl" durante o build ou inicialização sem config
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn(
      'Supabase não configurado: Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no seu arquivo .env.local'
    );
  }
}

// Inicializamos com valores dummy se as chaves faltarem para não quebrar a importação do módulo,
// mas as chamadas de API falharão graciosamente ou avisarão o usuário.
export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
