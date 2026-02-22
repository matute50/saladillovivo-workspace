import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Inicialización segura: si faltan las variables, el cliente se creará con valores vacíos 
// pero no detendrá el proceso de build. Las funciones que lo usen lanzarán error en runtime
// si intentan realizar una petición sin credenciales, lo cual es correcto.
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);