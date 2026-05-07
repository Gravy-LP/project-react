import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase Config Error:', {
    urlFound: !!supabaseUrl,
    keyFound: !!supabaseAnonKey
  });
  // We throw a non-blocking warning in dev, but keep the strict check for production
  if (import.meta.env.PROD) {
    throw new Error(
      'Missing Supabase Environment Variables. ' +
      'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Netlify.'
    );
  }
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);
