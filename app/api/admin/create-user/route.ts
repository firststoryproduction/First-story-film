import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'

// Create a direct admin client for this route
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

export async function POST(request: Request) {
    try {
        // 0. Verify Session and Admin Role
        const supabase = await createServerClient()
        const { data: { user: requester } } = await supabase.auth.getUser()

        if (!requester) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: requesterProfile } = await supabase
            .from('users')
            .select('role')
            .eq('id', requester.id)
            .single()

        const profile = requesterProfile as { role: string } | null

        if (profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { email, password, name, role, mobile } = body

        // Ensure role is valid for database check constraint
        const dbRole = (role === 'ADMIN' || role === 'MANAGER') ? role : 'USER'

        // 1. Create User in Supabase Auth
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

        if (authError) throw authError

        // 2. Insert into public.users (Linked by ID)
        // NOTE: Our Trigger MIGHT handle this, depending on if we kept it.
        // Since we are explicitly handling it here for reliability:

        // Check if user already exists in public (Trigger might have fired)
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', authData.user.id)
            .single()

        if (!existingUser) {
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
                // Rollback auth user if profile creation fails? 
                // Ideally yes, but for now let's just throw error
                console.error('Profile creation error:', profileError)
                throw new Error('Failed to create user profile')
            }
        }

        return NextResponse.json({ id: authData.user.id })
    } catch (error: any) {
        console.error('Create user error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
