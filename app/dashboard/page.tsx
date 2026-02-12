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
        let renderCount = 0
        renderCount++

        console.log('[PAGE] 🚀 useEffect triggered', {
            renderCount,
            loading,
            hasSession: !!session,
            userRole,
            timestamp: new Date().toISOString()
        })

        // CRITICAL FIX: Page should wait for layout to provide session
        // Don't use aggressive timeout - layout handles session management
        const timeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[PAGE] ⏰ Loading timeout (but layout may still be loading)', {
                    renderCount,
                    timestamp: new Date().toISOString()
                })
                // Don't force loading false - layout controls session state
                // Just log the warning
            }
        }, 10000) // Longer timeout since layout handles session

        const init = async () => {
            try {
                console.log('[PAGE] 🔄 Init started', {
                    renderCount,
                    timestamp: new Date().toISOString()
                })

                // CRITICAL FIX: Get session for stats, but don't treat null as error
                // Layout is the source of truth for session - if layout rendered this page,
                // session should exist. But getSession() might return null temporarily.
                const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
                
                console.log('[PAGE] 📊 Session check (for stats only)', {
                    hasSession: !!currentSession,
                    userId: currentSession?.user?.id,
                    error: sessionError?.message,
                    timestamp: new Date().toISOString()
                })

                if (!mounted) return
                
                // Set session for stats, but don't fail if null
                // Layout controls whether we should be here
                setSession(currentSession)

                if (currentSession?.user?.id) {
                    // CRITICAL FIX: Don't fetch profile again - layout already has it
                    // Instead, we'll get role from props or context, but for now
                    // we'll fetch it once more but only if we don't have it
                    // Actually, let's fetch it but log that layout should have it
                    console.log('[PAGE] 🔍 Fetching profile from users table for stats', {
                        userId: currentSession.user.id,
                        timestamp: new Date().toISOString()
                    })

                    // CRITICAL: Role MUST come from users table, NOT from auth
                    // Fetch from users table to get role for determining stats queries
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('role, name')
                        .eq('id', currentSession.user.id)
                        .single() // Use single() for better type safety

                    // Type assertion for partial select result
                    type ProfileResult = { role: string; name: string } | null
                    const typedProfile = profile as ProfileResult

                    console.log('[PAGE] 📊 Profile fetch response from users table', {
                        hasData: !!typedProfile,
                        role: typedProfile?.role, // From users.role column
                        name: typedProfile?.name,
                        error: profileError?.message,
                        timestamp: new Date().toISOString()
                    })

                    let profileData = null
                    if (typedProfile && !profileError) {
                        // CRITICAL: Role comes from users.role, validate it
                        const validRole = (typedProfile.role && ['ADMIN', 'MANAGER', 'USER'].includes(typedProfile.role))
                            ? typedProfile.role
                            : 'USER'
                        
                        profileData = { role: validRole, name: typedProfile.name || '' }
                        
                        // Only update if we don't already have it (to avoid flicker)
                        if (!userRole || userRole === 'USER') {
                            setUserRole(validRole) // From users table, not auth
                        }
                        if (!userName) {
                            setUserName(typedProfile.name || '')
                        }
                        console.log('[PAGE] ✅ Profile loaded from users table', {
                            role: validRole, // Confirmed: from users.role
                            name: typedProfile.name,
                            timestamp: new Date().toISOString()
                        })
                    } else {
                        if (!userName) {
                            setUserName(currentSession.user.email?.split('@')[0] || 'Member')
                        }
                        console.log('[PAGE] ⚠️ No profile found in users table, using email', {
                            error: profileError?.message,
                            timestamp: new Date().toISOString()
                        })
                        // Default to USER role if profile not found
                        if (!userRole || userRole === 'USER') {
                            profileData = { role: 'USER', name: '' }
                        }
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
                        jobsQuery = jobsQuery.eq('staff_id', currentSession.user.id)
                    } else if (!profileData) {
                        jobsQuery = jobsQuery.eq('staff_id', currentSession.user.id)
                    }

                    console.log('[PAGE] 📊 Fetching stats', {
                        isSystemAdmin,
                        isSystemStaff,
                        timestamp: new Date().toISOString()
                    })

                    // 3. Fetch stats in parallel
                    const [jobsResponse, usersResponse] = await Promise.all([
                        jobsQuery,
                        usersQuery || Promise.resolve({ count: 0 })
                    ])

                    const { data: jobs, count: totalJobs } = jobsResponse
                    const { count: totalUsers } = usersResponse

                    const safeJobs = (jobs || []) as { status: string }[]

                    console.log('[PAGE] 📊 Stats loaded', {
                        totalJobs: totalJobs || 0,
                        inProgress: safeJobs.filter(j => j.status === 'IN_PROGRESS').length,
                        completed: safeJobs.filter(j => j.status === 'COMPLETED').length,
                        totalUsers: totalUsers || 0,
                        timestamp: new Date().toISOString()
                    })

                    if (mounted) {
                        setStats({
                            totalJobs: totalJobs || 0,
                            inProgress: safeJobs.filter(j => j.status === 'IN_PROGRESS').length,
                            completed: safeJobs.filter(j => j.status === 'COMPLETED').length,
                            totalUsers: totalUsers || 0
                        })
                    }
                } else {
                    console.log('[PAGE] ⚠️ No session found for stats', {
                        timestamp: new Date().toISOString()
                    })
                    // CRITICAL FIX: Don't treat this as error
                    // Layout controls session - if we're here, layout allowed it
                    // Session might just not be available yet for stats
                    // Don't set loading false - let layout control that
                }
            } catch (err) {
                console.error('[PAGE] ❌ Unexpected error in init:', err)
                // CRITICAL FIX: Set loading to false on error
                if (mounted) {
                    setLoading(false)
                }
            } finally {
                if (mounted) {
                    console.log('[PAGE] 🏁 Init finally - setting loading to false', {
                        renderCount,
                        timestamp: new Date().toISOString()
                    })
                    setLoading(false)
                    clearTimeout(timeout)
                }
            }
        }
        init()
        return () => {
            console.log('[PAGE] 🧹 Cleanup', {
                timestamp: new Date().toISOString()
            })
            mounted = false
            clearTimeout(timeout)
        }
    }, [])

    // CRITICAL FIX: Page should trust layout's session management
    // If layout rendered this page, we should render content
    // Don't return null based on page's own session check
    const isLoading = loading
    
    console.log('[PAGE] 🎨 Render check', {
        loading,
        hasSession: !!session,
        userRole,
        userName,
        isLoading,
        timestamp: new Date().toISOString()
    })

    // CRITICAL FIX: Don't return null based on page's session state
    // Layout controls whether we should be here - if layout rendered us, render content
    // Only return null if we're explicitly in an error state
    // Layout will handle redirects if needed

    const isAdmin = userRole === 'ADMIN'

    return (
        <main className="lg:ml-72 min-h-screen p-6 lg:p-10 relative">
            {isLoading && (
                <div className="absolute inset-0 bg-[#f1f5f9] z-50 flex items-center justify-center py-20">
                    <Spinner />
                </div>
            )}
            <div className="max-w-6xl mx-auto">
                {/* Welcome Header */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-black mb-2">
                        Welcome back, <span className="text-indigo-600">{userName || 'Studio Member'}!</span>
                    </h2>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="card-aesthetic p-6 overflow-hidden group hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 mb-1">Total Jobs</p>
                                <p className="text-3xl font-normal font-heading text-black">{stats.totalJobs}</p>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                <ClipboardList size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="card-aesthetic p-6 group hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 mb-1">In-Progress</p>
                                <p className="text-3xl font-normal font-heading text-black">{stats.inProgress}</p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                                <Clock size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="card-aesthetic p-6 group hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 mb-1">Completed</p>
                                <p className="text-3xl font-normal font-heading text-black">{stats.completed}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                <CheckCircle2 size={22} />
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="card-aesthetic p-6 group hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 mb-1">Total Users</p>
                                    <p className="text-3xl font-normal font-heading text-black">{stats.totalUsers}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                    <Users size={22} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}
