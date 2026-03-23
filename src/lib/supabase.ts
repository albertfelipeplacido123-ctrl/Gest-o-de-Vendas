import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key missing. Please check your .env file.');
}

console.log('Inicializando Supabase client...', { 
  urlPresent: !!supabaseUrl, 
  keyPresent: !!supabaseAnonKey,
  urlStart: supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'none'
});

if (typeof createClient !== 'function') {
  console.error('createClient não é uma função! Verifique a instalação do @supabase/supabase-js');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
