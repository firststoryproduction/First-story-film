import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

export async function DELETE(request: Request) {
    try {
        const supabase = await createServerClient()
        // 1. Check Authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Check Admin Role
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Access Denied: Admin privileges required' }, { status: 403 })
        }

        const { id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

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

        // 4. Cleanup dependencies BEFORE Auth deletion
        // Delete staff service configurations
        await supabaseAdmin
            .from('staff_service_configs')
            .delete()
            .eq('staff_id', id)

        // Set jobs to unassigned (null) for this user
        const { error: updateError } = await supabaseAdmin
            .from('jobs')
            .update({ staff_id: null })
            .eq('staff_id', id)

        if (updateError) {
            console.error('Cleanup Error (Jobs):', updateError)
            // If the database has a NOT NULL constraint, we can't set it to null.
            // We must either delete the jobs or reassign them.
            if (updateError.message.includes('null value in column "staff_id"')) {
                return NextResponse.json({ 
                    error: 'DATABASE CONSTRAINT: Cannot delete user because they have active jobs. To fix this, go to Supabase SQL Editor and run: ALTER TABLE jobs ALTER COLUMN staff_id DROP NOT NULL;' 
                }, { status: 400 })
            }
        }

        // 5. Delete from Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

        if (authError) {
            // If user is not found in Auth, they might still exist in public.users (ghost record)
            // In this case, we should attempt to delete from public.users directly.
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
                    error: 'Cannot delete user: This user is referenced in existing jobs. Please ensure all jobs are reassigned or deleted first.' 
                }, { status: 400 })
            }
            throw authError
        }

        return NextResponse.json({ message: 'User deleted successfully' })
    } catch (error: any) {
        console.error('API [DELETE_USER] Error:', error)
        return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 })
    }
}
