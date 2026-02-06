'use client'


import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Building2,
    ClipboardList,
    LogOut,
    Menu,
    X,
    TrendingUp,
    Clock,
    CheckCircle2,
    Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
    const [session, setSession] = useState<any>(null)
    const [userRole, setUserRole] = useState<string>('USER')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalJobs: 0,
        inProgress: 0,
        completed: 0,
        totalUsers: 0
    })

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)

            if (session?.user?.id) {
                console.log('Fetching role for user:', session.user.id)
                const { data, error } = await (supabase as any)
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()

                if (error) {
                    console.error('Error fetching role in DashboardPage:', error)
                } else if (data) {
                    const roleData = data as { role: string }
                    console.log('Role found in DashboardPage:', roleData.role)
                    setUserRole(roleData.role)
                }

                // Fetch Real Stats
                let jobsQuery = (supabase as any).from('jobs').select('status', { count: 'exact' })
                let usersQuery = (supabase as any).from('users').select('id', { count: 'exact', head: true })

                // If not admin/manager, filter jobs by staff_id
                const roleData = data as { role: string } | null
                const isSystemStaff = roleData && roleData.role === 'USER'
                if (isSystemStaff) {
                    jobsQuery = jobsQuery.eq('staff_id', session.user.id)
                }

                const [
                    { data: jobs, count: totalJobs },
                    { count: totalUsers }
                ] = await Promise.all([jobsQuery, usersQuery])

                const safeJobs = (jobs || []) as { status: string }[]

                setStats({
                    totalJobs: totalJobs || 0,
                    inProgress: safeJobs.filter(j => j.status === 'IN_PROGRESS').length,
                    completed: safeJobs.filter(j => j.status === 'COMPLETED').length,
                    totalUsers: totalUsers || 0
                })
            }
            setLoading(false)
        }
        init()
    }, [])

    if (loading) return null
    if (!session) return null

    const isAdmin = userRole === 'ADMIN'

    return (
        <main className="lg:ml-72 min-h-screen p-8 lg:p-14">
            <div className="max-w-6xl mx-auto">
                {/* Welcome Header */}
                <div className="mb-16 animate-slide-up">
                    <div className="h-1 w-20 bg-indigo-600 rounded-full mb-8" />
                    <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 font-heading tracking-tight mb-4 leading-tight">
                        Welcome back, <span className="text-indigo-600">{session.user.name}!</span>
                    </h2>
                    <p className="text-slate-500 text-lg max-w-2xl font-medium">
                        {isAdmin
                            ? 'Manage your team, jobs, and track commissions'
                            : 'View and manage your assigned jobs'}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 animate-slide-up [animation-delay:200ms]">
                    <div className="card-aesthetic overflow-hidden group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Jobs</p>
                                <p className="text-4xl font-bold font-heading text-slate-900">{stats.totalJobs}</p>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                <ClipboardList size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="card-aesthetic group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">In Progress</p>
                                <p className="text-4xl font-bold font-heading text-slate-900">{stats.inProgress}</p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                                <Clock size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="card-aesthetic group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Completed</p>
                                <p className="text-4xl font-bold font-heading text-slate-900">{stats.completed}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                <CheckCircle2 size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="card-aesthetic group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Users</p>
                                <p className="text-4xl font-bold font-heading text-slate-900">{stats.totalUsers}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <Users size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Center */}
                <div className="card-aesthetic p-10 animate-slide-up [animation-delay:400ms]">
                    <div className="flex items-center space-x-3 mb-8">
                        <TrendingUp className="text-indigo-600" size={24} />
                        <h3 className="text-2xl font-bold font-heading text-slate-900 uppercase tracking-tight">
                            Quick Actions
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {isAdmin ? (
                            <>
                                <Link href="/dashboard/admin/jobs/new" className="btn-aesthetic text-center">
                                    Create New Job
                                </Link>
                                <Link href="/dashboard/admin/staff/new" className="btn-aesthetic-secondary text-center">
                                    Add New User
                                </Link>
                                <Link href="/dashboard/admin/services" className="btn-aesthetic-secondary text-center">
                                    Manage Services
                                </Link>
                            </>
                        ) : (
                            <Link href="/dashboard/staff/my-jobs" className="btn-aesthetic text-center">
                                View My Jobs
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}
