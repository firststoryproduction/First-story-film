import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        return NextResponse.json({ 
            status: 'ok', 
            service: 'First Story Films API',
            timestamp: new Date().toISOString(),
            auth_authorized: !!session,
            auth_error: error ? error.message : null
        })
    } catch (err: any) {
        return NextResponse.json({ 
            status: 'error', 
            message: err.message 
        }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        return NextResponse.json({ 
            status: 'ok', 
            method: 'POST',
            echo: body 
        })
    } catch (err: any) {
        return NextResponse.json({ 
            status: 'error', 
            message: 'Invalid JSON body' 
        }, { status: 400 })
    }
}
