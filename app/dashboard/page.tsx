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
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'

export default function DashboardPage() {
    const [session, setSession] = useState<any>(null)
    const [userRole, setUserRole] = useState<string>('USER')
    const [userName, setUserName] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalJobs: 0,
        inProgress: 0,
        completed: 0,
        totalUsers: 0
    })

    useEffect(() => {
        let mounted = true
        const timeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('Dashboard: Loading timeout')
                setLoading(false)
            }
        }, 5000)

        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (!mounted) return
                setSession(session)

                if (session?.user?.id) {
                    // 1. Fetch profile first to determine roles
                    const { data: profileList } = await (supabase as any)
                        .from('users')
                        .select('role, name')
                        .eq('id', session.user.id)
                        .limit(1)

                    let profileData = null
                    if (profileList && profileList.length > 0) {
                        profileData = profileList[0] as { role: string; name: string }
                        setUserRole(profileData.role)
                        setUserName(profileData.name)
                    } else {
                        setUserName(session.user.email?.split('@')[0] || 'Member')
                    }

                    // 2. Prepare queries based on role
                    let jobsQuery = (supabase as any).from('jobs').select('status', { count: 'exact' })

                    const isSystemAdmin = profileData && profileData.role === 'ADMIN'
                    let usersQuery = isSystemAdmin
                        ? (supabase as any).from('users').select('id', { count: 'exact', head: true })
                        : null

                    // If not admin/manager, filter jobs by staff_id
                    const isSystemStaff = profileData && profileData.role === 'USER'
                    if (isSystemStaff) {
                        jobsQuery = jobsQuery.eq('staff_id', session.user.id)
                    } else if (!profileData) {
                        jobsQuery = jobsQuery.eq('staff_id', session.user.id)
                    }

                    // 3. Fetch stats in parallel
                    const [jobsResponse, usersResponse] = await Promise.all([
                        jobsQuery,
                        usersQuery || Promise.resolve({ count: 0 })
                    ])

                    const { data: jobs, count: totalJobs } = jobsResponse
                    const { count: totalUsers } = usersResponse

                    const safeJobs = (jobs || []) as { status: string }[]

                    if (mounted) {
                        setStats({
                            totalJobs: totalJobs || 0,
                            inProgress: safeJobs.filter(j => j.status === 'IN_PROGRESS').length,
                            completed: safeJobs.filter(j => j.status === 'COMPLETED').length,
                            totalUsers: totalUsers || 0
                        })
                    }
                }
            } catch (err) {
                console.error('Dashboard: Unexpected error in init:', err)
            } finally {
                if (mounted) {
                    setLoading(false)
                    clearTimeout(timeout)
                }
            }
        }
        init()
        return () => {
            mounted = false
            clearTimeout(timeout)
        }
    }, [])

    if (!session && !loading) return null

    const isAdmin = userRole === 'ADMIN'

    return (
        <main className="lg:ml-72 min-h-screen p-6 lg:p-10 relative">
            {loading && !session && (
                <div className="absolute inset-0 bg-[#f1f5f9] z-50 flex items-center justify-center py-20">
                    <Spinner />
                </div>
            )}
            <div className="max-w-6xl mx-auto">
                {/* Welcome Header */}
                <div className="mb-8">
                    <div className="h-1 w-16 bg-indigo-600 rounded-full mb-4" />
                    <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 font-heading tracking-tight mb-2 leading-tight">
                        Welcome back, <span className="text-indigo-600">{userName || 'Studio Member'}!</span>
                    </h2>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="card-aesthetic p-6 overflow-hidden group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Jobs</p>
                                <p className="text-3xl font-bold font-heading text-slate-900">{stats.totalJobs}</p>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                <ClipboardList size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="card-aesthetic p-6 group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">In-Progress</p>
                                <p className="text-3xl font-bold font-heading text-slate-900">{stats.inProgress}</p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                                <Clock size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="card-aesthetic p-6 group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Completed</p>
                                <p className="text-3xl font-bold font-heading text-slate-900">{stats.completed}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                <CheckCircle2 size={22} />
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="card-aesthetic p-6 group hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Users</p>
                                    <p className="text-3xl font-bold font-heading text-slate-900">{stats.totalUsers}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                    <Users size={22} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions Center */}
                <div className="card-aesthetic p-10">
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
