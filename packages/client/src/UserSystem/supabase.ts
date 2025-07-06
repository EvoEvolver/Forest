import {createClient} from '@supabase/supabase-js'

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function setupSupabaseClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase URL or Anon Key not set.")
    } else {
        let supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: window.localStorage,
                storageKey: 'treer_supabase_auth_token',
                flowType: 'pkce'
            }
        })
        return supabase
    }
    return null
}
