import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a direct admin client for this route using service role
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
        const body = await request.json()
        const { id, password } = body

        if (!id || !password) {
            return NextResponse.json(
                { error: 'User ID and Password are required' },
                { status: 400 }
            )
        }

        // Update User in Supabase Auth using Admin Auth API
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            id,
            { password }
        )

        if (authError) throw authError

        return NextResponse.json({ success: true, message: 'Password updated successfully' })
    } catch (error: any) {
        console.error('Update password error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
