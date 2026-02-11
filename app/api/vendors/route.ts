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

// GET: Fetch vendors with pagination and search
export async function GET(request: Request) {
    try {
        const authResult = await verifyAuth(request)
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        const { supabaseAdmin } = authResult
        const { searchParams } = new URL(request.url)
        
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        
        const start = (page - 1) * limit
        const end = start + limit - 1

        let query = supabaseAdmin
            .from('vendors')
            .select('*', { count: 'exact' })

        if (search) {
            query = query.or(`studio_name.ilike.%${search}%,contact_person.ilike.%${search}%`)
        }

        const { data, error, count } = await query
            .order('studio_name')
            .range(start, end)

        if (error) throw error

        return NextResponse.json({
            data,
            count,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        })
    } catch (error: any) {
        console.error('Vendors GET API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: Create new vendor
export async function POST(request: Request) {
    try {
        const authResult = await verifyAuth(request)
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        const { supabaseAdmin } = authResult
        const body = await request.json()

        // Validate required fields
        if (!body.studio_name || !body.contact_person || !body.mobile) {
            return NextResponse.json(
                { error: 'Missing required fields: studio_name, contact_person, mobile' },
                { status: 400 }
            )
        }

        // Validate mobile format
        const mobileRegex = /^[0-9]{10}$/
        if (!mobileRegex.test(body.mobile)) {
            return NextResponse.json(
                { error: 'Invalid mobile number format. Must be 10 digits.' },
                { status: 400 }
            )
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

        const { data, error } = await supabaseAdmin
            .from('vendors')
            .insert([{
                studio_name: body.studio_name,
                contact_person: body.contact_person,
                mobile: body.mobile,
                email: body.email || null,
                location: body.location || null,
                notes: body.notes || null
            }])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error('Vendors POST API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
