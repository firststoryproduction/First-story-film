import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

export async function DELETE(request: Request) {
    try {
        console.log('API: [DELETE_USER] Starting request...')
        const supabase = await createServerClient()
        
        // 1. Check Authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            console.warn('API: [DELETE_USER] Unauthorized')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Check Admin Role
        const { data: profileData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profileData || (profileData as any).role !== 'ADMIN') {
            console.warn('API: [DELETE_USER] Forbidden - Not an admin')
            return NextResponse.json({ error: 'Access Denied: Admin privileges required' }, { status: 403 })
        }

        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        console.log('API: [DELETE_USER] Deleting user ID:', id)

        // 3. Direct Admin Client for deletion
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

        // 4. Delete from Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

        if (authError) {
            console.error('API: [DELETE_USER] Auth Error:', authError)
            
            // If user is not found in Auth, they might still exist in public.users (ghost record)
            if (authError.message.toLowerCase().includes('user not found')) {
                const { error: dbError } = await supabaseAdmin
                    .from('users')
                    .delete()
                    .eq('id', id)

                if (dbError) {
                    if (dbError.message.toLowerCase().includes('foreign key')) {
                        return NextResponse.json({ 
                            error: 'Cannot delete user: This user has active production jobs. Please reassign their jobs first.' 
                        }, { status: 400 })
                    }
                    throw dbError
                }
                return NextResponse.json({ message: 'Database-only user record cleaned up successfully' })
            }

            if (authError.message.toLowerCase().includes('foreign key')) {
                return NextResponse.json({ 
                    error: 'Cannot delete user: This user is referenced in existing jobs.' 
                }, { status: 400 })
            }
            throw authError
        }

        console.log('API: [DELETE_USER] Success!')
        return NextResponse.json({ message: 'User deleted successfully' })
    } catch (error: any) {
        console.error('API: [DELETE_USER] Internal Error:', error)
        return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 })
    }
}
