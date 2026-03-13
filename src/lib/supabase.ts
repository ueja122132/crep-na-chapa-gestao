import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Connection:', { url: supabaseUrl ? 'Defined' : 'UNDEFINED', key: supabaseAnonKey ? 'Defined' : 'UNDEFINED' });

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
