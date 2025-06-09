import {createClient} from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export var supabase

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL or Anon Key not set.")
} else {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
            storageKey: 'treer_supabase_auth_token',
            flowType: 'pkce'
        }
    })
    
    if (import.meta.env.MODE === 'development') {
        console.log('Supabase client initialized with session persistence enabled')
    }
}


