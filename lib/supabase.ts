import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// 1. CLIENT-SIDE (BROWSER) CLIENT
// We MUST use createBrowserClient because it automatically manages Cookies.
// This allows the Proxy (Server) to "see" that we are logged in.
// We check for 'window' to prevent crashes if this file is imported on the server.
export const supabase = (typeof window !== 'undefined')
    ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
    : createClient<Database>(supabaseUrl, supabaseAnonKey)

// 2. SERVER-SIDE (ADMIN) CLIENT
// Used in API routes to create users/manage data with full permissions.
export const supabaseAdmin = (supabaseUrl && serviceRoleKey)
    ? createClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
    : {} as any
