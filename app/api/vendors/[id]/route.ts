import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase Admin
const getSupabaseAdmin = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

// Verify user authentication and authorization
async function verifyAuth(request: Request) {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    
    if (!token) {
        return { error: 'Unauthorized', status: 401 }
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
        return { error: 'Invalid Session', status: 401 }
    }

    // Check user role
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileError || !['ADMIN', 'MANAGER'].includes(profile?.role)) {
        return { error: 'Forbidden: Admin access required', status: 403 }
    }

    return { user, profile, supabaseAdmin }
}

// GET: Fetch single vendor by ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await verifyAuth(request)
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        const { supabaseAdmin } = authResult
        const { id } = await params
        const { data, error } = await supabaseAdmin
            .from('vendors')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
            }
            throw error
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Vendor GET API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT: Update vendor
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await verifyAuth(request)
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        const { supabaseAdmin } = authResult
        const { id } = await params
        const body = await request.json()

        // Validate mobile if provided
        if (body.mobile) {
            const mobileRegex = /^[0-9]{10}$/
            if (!mobileRegex.test(body.mobile)) {
                return NextResponse.json(
                    { error: 'Invalid mobile number format. Must be 10 digits.' },
                    { status: 400 }
                )
            }
        }

        // Validate email if provided
        if (body.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(body.email)) {
                return NextResponse.json(
                    { error: 'Invalid email format' },
                    { status: 400 }
                )
            }
        }

        const updateData: any = {}
        if (body.studio_name !== undefined) updateData.studio_name = body.studio_name
        if (body.contact_person !== undefined) updateData.contact_person = body.contact_person
        if (body.mobile !== undefined) updateData.mobile = body.mobile
        if (body.email !== undefined) updateData.email = body.email || null
        if (body.location !== undefined) updateData.location = body.location || null
        if (body.notes !== undefined) updateData.notes = body.notes || null

        const { data, error } = await supabaseAdmin
            .from('vendors')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
            }
            throw error
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Vendor PUT API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE: Delete vendor
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await verifyAuth(request)
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        const { supabaseAdmin } = authResult
        const { id } = await params
        const { error } = await supabaseAdmin
            .from('vendors')
            .delete()
            .eq('id', id)

        if (error) {
            // Check if it's a foreign key constraint error
            if (error.code === '23503') {
                return NextResponse.json(
                    { error: 'Cannot delete vendor. It is being used by existing jobs.' },
                    { status: 409 }
                )
            }
            throw error
        }

        return NextResponse.json({ message: 'Vendor deleted successfully' })
    } catch (error: any) {
        console.error('Vendor DELETE API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
