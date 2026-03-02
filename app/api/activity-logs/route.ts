import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-logger'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

async function verifyAdmin(request: Request) {
  const token = request.headers.get('Authorization')?.split(' ')[1]
  if (!token) return { error: 'Unauthorized', status: 401 }
  const supabaseAdmin = getSupabaseAdmin()
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return { error: 'Invalid Session', status: 401 }
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'ADMIN') return { error: 'Forbidden – Admin only', status: 403 }
  return { user, profile, supabaseAdmin }
}

// ── GET /api/activity-logs ─────────────────────────────────────────────────
// Query params: date_from, date_to, user_id, action_type, module_name,
//               status, search, page, limit
export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { supabaseAdmin } = auth

    const { searchParams } = new URL(request.url)
    const dateFrom   = searchParams.get('date_from')
    const dateTo     = searchParams.get('date_to')
    const userId     = searchParams.get('user_id')
    const actionType = searchParams.get('action_type')
    const moduleName = searchParams.get('module_name')
    const status     = searchParams.get('status')
    const search     = searchParams.get('search')
    const page       = parseInt(searchParams.get('page')  || '1')
    const limit      = parseInt(searchParams.get('limit') || '25')
    const offset     = (page - 1) * limit

    let q = supabaseAdmin
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (dateFrom)   q = q.gte('created_at', dateFrom)
    if (dateTo)     q = q.lte('created_at', dateTo + 'T23:59:59')
    if (userId)     q = q.eq('user_id', userId)
    if (actionType) q = q.eq('action_type', actionType)
    if (moduleName) q = q.eq('module_name', moduleName)
    if (status)     q = q.eq('status', status)
    if (search)     q = q.ilike('description', `%${search}%`)

    q = q.range(offset, offset + limit - 1)

    const { data, count, error } = await q
    if (error) throw error

    return NextResponse.json({ data: data || [], count: count || 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── DELETE /api/activity-logs ──────────────────────────────────────────────
// Body: { date_from, date_to }  — delete all logs in that range
export async function DELETE(request: Request) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user, profile, supabaseAdmin } = auth

    const body = await request.json()
    const { date_from, date_to } = body

    if (!date_from || !date_to)
      return NextResponse.json({ error: 'date_from and date_to are required' }, { status: 400 })

    const { error, count } = await supabaseAdmin
      .from('activity_logs')
      .delete({ count: 'exact' })
      .gte('created_at', date_from)
      .lte('created_at', date_to + 'T23:59:59')

    if (error) throw error

    // Log the deletion action itself
    await logActivity({
      userId:      user.id,
      userName:    profile.name || 'Admin',
      actionType:  'DELETE',
      moduleName:  'Activity Logs',
      description: `Deleted ${count ?? 'N/A'} activity log entries from ${date_from} to ${date_to}`,
      status:      'Success',
    })

    return NextResponse.json({ message: `Deleted ${count ?? 0} log entries.`, count })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
