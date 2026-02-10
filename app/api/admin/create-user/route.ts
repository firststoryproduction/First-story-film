import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
    // 0. Initialize Admin Client inside to prevent top-level crashes
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    try {
        console.log('API: [CREATE_USER] Starting request...')
        // 1. Verify Session and Admin Role
        const supabase = await createServerClient()
        const { data: { user: requester } } = await supabase.auth.getUser()

        if (!requester) {
            console.warn('API: [CREATE_USER] Unauthorized - No session')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: requesterProfile, error: requesterError } = await supabase
            .from('users')
            .select('role')
            .eq('id', requester.id)
            .single()

        if (requesterError || (requesterProfile as any)?.role !== 'ADMIN') {
            console.warn('API: [CREATE_USER] Forbidden - Not an admin:', requesterProfile)
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { email, password, name, role, mobile } = body

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        console.log('API: [CREATE_USER] Creating auth user for:', email)
        
        // Ensure role is valid for database check constraint
        const dbRole = (role === 'ADMIN' || role === 'MANAGER') ? role : 'USER'

        // 2. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name,
                role: dbRole,
                mobile
            }
        })

        if (authError) {
            console.error('API: [CREATE_USER] Auth Error:', authError)
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // 3. User might have been created and synced by trigger already
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', authData.user.id)
            .single()

        if (!existingUser) {
            console.log('API: [CREATE_USER] Syncing profile manually for:', authData.user.id)
            const { error: profileError } = await supabaseAdmin
                .from('users')
                .insert({
                    id: authData.user.id,
                    email,
                    name,
                    role: dbRole,
                    mobile
                })

            if (profileError) {
                console.error('API: [CREATE_USER] Profile creation error:', profileError)
                throw new Error('Failed to create user profile in database')
            }
        }

        console.log('API: [CREATE_USER] Success!')
        return NextResponse.json({ id: authData.user.id })
    } catch (error: any) {
        console.error('API: [CREATE_USER] Internal Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
