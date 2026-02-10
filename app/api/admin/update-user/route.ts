import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
    // Initialize Admin Client inside the handler
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
        console.log('API: [UPDATE_USER] Starting request...')
        // 1. Verify Session and Admin Role
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

        if (!requesterProfile || (requesterProfile as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { id, password, name, email, mobile, role } = body

        if (!id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        console.log('API: [UPDATE_USER] Updating user ID:', id)

        // 2. Update User in Supabase Auth if password/email provided
        const authUpdates: any = {}
        if (password) authUpdates.password = password
        if (email) authUpdates.email = email

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                id,
                authUpdates
            )
            if (authError) {
                console.error('API: [UPDATE_USER] Auth Update Error:', authError)
                return NextResponse.json({ error: authError.message }, { status: 400 })
            }
        }

        // 3. Update User in public.users table
        const publicUpdates: any = {}
        if (name !== undefined) publicUpdates.name = name
        if (email !== undefined) publicUpdates.email = email
        if (role !== undefined) publicUpdates.role = role
        if (mobile !== undefined) publicUpdates.mobile = mobile
        publicUpdates.updated_at = new Date().toISOString()

        const { error: publicError } = await supabaseAdmin
            .from('users')
            .update(publicUpdates)
            .eq('id', id)

        if (publicError) {
            console.error('API: [UPDATE_USER] Profile Update Error:', publicError)
            throw publicError
        }

        console.log('API: [UPDATE_USER] Success!')
        return NextResponse.json({ success: true, message: 'User updated successfully' })
    } catch (error: any) {
        console.error('API: [UPDATE_USER] Internal Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
