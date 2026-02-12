'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Building2,
    ClipboardList,
    LogOut,
    Menu,
    X,
    Sparkles
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {

    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState<string | null>(null) // Start as null to avoid "USER" flicker
    const [userName, setUserName] = useState<string>('')
    const pathname = usePathname()
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [showLogout, setShowLogout] = useState(false)

    const fetchProfile = async (userId: string) => {
        // Prevent redundant fetches if we already have the profile for this user
        if (session?.user?.id === userId && userRole !== null) {
            console.log('[LAYOUT] ⏭️ Skipping profile fetch - already have role', {
                userId,
                currentRole: userRole,
                timestamp: new Date().toISOString()
            })
            return
        }

        console.log('[LAYOUT] 🔍 Fetching profile', {
            userId,
            currentRole: userRole,
            timestamp: new Date().toISOString()
        })

        try {
            // CRITICAL: Role MUST come from users table, NOT from auth
            // The users table has the role field (ADMIN, MANAGER, USER)
            // Auth only provides authentication, not authorization roles
            const { data: profile, error } = await supabase
                .from('users')
                .select('role, name')
                .eq('id', userId)
                .single() // Use single() for better type safety and error handling

            // Type assertion for partial select result
            type ProfileResult = { role: string; name: string } | null
            const typedProfile = profile as ProfileResult

            console.log('[LAYOUT] 📊 Profile fetch response from users table', {
                userId,
                hasData: !!typedProfile,
                role: typedProfile?.role,
                name: typedProfile?.name,
                error: error?.message,
                errorCode: error?.code,
                timestamp: new Date().toISOString()
            })

            if (error) {
                console.error('[LAYOUT] ❌ Profile fetch error from users table:', {
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    userId,
                    timestamp: new Date().toISOString()
                })
                
                // CRITICAL: Always set a role, even on error, to prevent stuck loader
                // If user doesn't exist in users table, that's a data issue
                // But we'll default to USER role to prevent blocking
                console.log('[LAYOUT] ⚠️ Setting default role USER due to error (user may not exist in users table)')
                setUserRole('USER')
                setUserName('') // Clear name on error
                return
            }

            if (typedProfile) {
                // CRITICAL: Role comes from users.role, NOT from auth
                const newRole = (typedProfile.role && ['ADMIN', 'MANAGER', 'USER'].includes(typedProfile.role)) 
                    ? typedProfile.role 
                    : 'USER' // Fallback to USER if invalid role
                
                console.log('[LAYOUT] ✅ Profile loaded from users table - SETTING ROLE', {
                    userId,
                    role: newRole, // From users.role column
                    name: typedProfile.name,
                    previousRole: userRole,
                    timestamp: new Date().toISOString()
                })
                
                // CRITICAL: Always set role, even if it's the same
                // This ensures state is updated and components re-render
                setUserRole(newRole)
                setUserName(typedProfile.name || '')
                
                console.log('[LAYOUT] ✅ Role and name state updated', {
                    userId,
                    newRole,
                    newName: typedProfile.name || '',
                    timestamp: new Date().toISOString()
                })
            } else {
                console.log('[LAYOUT] ⚠️ No profile found in users table, using default USER role', {
                    userId,
                    timestamp: new Date().toISOString()
                })
                // CRITICAL: Always set role, even if profile is null
                setUserRole('USER')
                setUserName('')
            }
        } catch (err) {
            console.error('[LAYOUT] ❌ Unexpected profile error:', err)
            if (userRole === null) {
                console.log('[LAYOUT] ⚠️ Setting default role USER due to exception')
                setUserRole('USER')
            }
        }
    }

    useEffect(() => {
        let mounted = true
        let renderCount = 0
        renderCount++
        let sessionInitialized = false // Track if session was set by onAuthStateChange

        console.log('[LAYOUT] 🚀 useEffect triggered', {
            renderCount,
            loading,
            hasSession: !!session,
            userRole,
            timestamp: new Date().toISOString()
        })

        // CRITICAL FIX: Only use timeout as absolute last resort
        // Don't force false states if onAuthStateChange is handling it
        const timeout = setTimeout(() => {
            if (mounted && loading && !sessionInitialized) {
                console.warn('[LAYOUT] ⏰ Loading timeout - no session initialized yet', {
                    renderCount,
                    hasSession: !!session,
                    timestamp: new Date().toISOString()
                });
                // Only set loading false if we truly have no session
                // Don't override if onAuthStateChange is working
                if (!session) {
                    setLoading(false);
                    if (userRole === null) {
                        console.log('[LAYOUT] ⚠️ Setting default role USER due to timeout (no session)')
                        setUserRole('USER');
                    }
                }
            }
        }, 15000); // Increased timeout since onAuthStateChange should handle it

        const init = async () => {
            try {
                console.log('[LAYOUT] 🔄 Init started (for page refresh scenario)', {
                    renderCount,
                    hasExistingSession: !!session,
                    timestamp: new Date().toISOString()
                })

                // CRITICAL FIX: Only run init if we don't already have a session
                // init() handles both: new logins (redirect from login page) and page refreshes
                if (session?.user) {
                    console.log('[LAYOUT] ⏭️ Skipping init - session already exists', {
                        userId: session.user.id,
                        timestamp: new Date().toISOString()
                    })
                    if (mounted) {
                        setLoading(false)
                        clearTimeout(timeout)
                    }
                    return
                }

                // Check session: works for both new logins and page refreshes
                const { data, error } = await supabase.auth.getSession()
                        
                console.log('[LAYOUT] 📊 Session check (page refresh)', {
                    hasSession: !!data?.session,
                    userId: data?.session?.user?.id,
                    error: error?.message,
                    timestamp: new Date().toISOString()
                })

                if (mounted) {
                    if (data?.session?.user) {
                        console.log('[LAYOUT] ✅ Session found (page refresh), setting session and fetching profile', {
                            userId: data.session.user.id,
                            timestamp: new Date().toISOString()
                        })
                        sessionInitialized = true
                        setSession(data.session)
                        await fetchProfile(data.session.user.id)
                        console.log('[LAYOUT] ✅ Init complete (page refresh)', {
                            userId: data.session.user.id,
                            userRole,
                            timestamp: new Date().toISOString()
                        })
                        setLoading(false)
                        clearTimeout(timeout)
                    } else {
                        // Not logged in - redirect to login
                        console.log('[LAYOUT] ⚠️ No session found (page refresh), redirecting to login', {
                            timestamp: new Date().toISOString()
                        })
                        setLoading(false)
                        clearTimeout(timeout)
                        router.push('/login')
                        return
                    }
                }
            } catch (error) {
                console.error('[LAYOUT] ❌ Init error:', error)
                if (mounted) {
                    setLoading(false)
                    clearTimeout(timeout)
                    // On error, redirect to login for safety
                    router.push('/login')
                }
            }
        }

        // Run init if we don't have a session yet
        // init() handles: new logins (after redirect from login page) and page refreshes
        // When user logs in and redirects to /dashboard, session state is null initially,
        // so init() runs, gets session from cookies, and fetches profile
        if (!session) {
            init()
        } else {
            console.log('[LAYOUT] ⏭️ Skipping init - session already exists', {
                userId: session.user.id,
                timestamp: new Date().toISOString()
            })
            setLoading(false)
            clearTimeout(timeout)
        }

        // REMOVED: onAuthStateChange subscription
        // Why removed:
        // 1. User wants manual refresh only, no automatic updates
        // 2. No WebSocket/real-time subscriptions needed
        // 3. Session is checked on page load via init() function
        // 4. Login flow works: login page redirects → layout init() gets session → profile fetched
        // 5. Logout is handled by logout button which redirects to /login
        //
        // Session management is now:
        // - On page load: init() checks session and fetches profile
        // - On login: redirect to /dashboard → init() runs → session found → profile fetched
        // - On logout: logout button → signOut() → redirect to /login
        // - No automatic subscriptions or event listeners

        return () => {
            console.log('[LAYOUT] 🧹 Cleanup', {
                timestamp: new Date().toISOString()
            })
            mounted = false
            clearTimeout(timeout)
            // No subscriptions to clean up - removed onAuthStateChange
        }
        // CRITICAL FIX: Add session to dependencies to avoid stale closure
        // But use a ref or functional updates in callbacks to prevent infinite loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Keep empty - we use functional updates in callbacks


    if (loading) {
        return <Spinner fullScreen />
    }

    if (!session) return null

    const isAdmin = userRole === 'ADMIN'
    const isManager = userRole === 'MANAGER'

    const adminNavItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/admin/services', icon: Briefcase, label: 'Services' },
        { href: '/dashboard/admin/staff', icon: Users, label: 'Users' },
        { href: '/dashboard/admin/vendors', icon: Building2, label: 'Vendors' },
        { href: '/dashboard/admin/jobs', icon: ClipboardList, label: 'Jobs' },
    ]

    const managerNavItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/admin/vendors', icon: Building2, label: 'Vendors' },
        { href: '/dashboard/admin/jobs', icon: ClipboardList, label: 'Jobs' },
    ]

    const staffNavItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/staff/my-jobs', icon: ClipboardList, label: 'My Jobs' },
    ]

    const navItems = isAdmin ? adminNavItems : isManager ? managerNavItems : staffNavItems

    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-body selection:bg-indigo-500/20">
            {/* Mobile Navigation Trigger */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-6 left-6 z-50 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl"
            >
                {sidebarOpen ? <X size={20} className="text-slate-600" /> : <Menu size={20} className="text-slate-600" />}
            </button>

            {/* Premium Light Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 p-8 z-40 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
            >
                {/* Branding */}
                <div className="mb-12">
                    <div className="flex items-center space-x-3 group cursor-pointer">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <h1 className="text-xl font-bold font-heading tracking-tighter text-slate-900">
                            FIRST STORY <span className="text-indigo-600">FILMS</span>
                        </h1>
                    </div>
                </div>



                {/* Navigation Menu */}
                <nav className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4 ml-4">Main Menu</p>
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`nav-aesthetic ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={18} />
                                <span className="text-sm tracking-tight">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="flex-1" />

                {/* Profile / Logout Widget */}
                {/* Profile / Logout Widget */}
                <div className="mb-6 mx-2 relative">
                    {/* Logout Menu */}
                    {showLogout && (
                        <div className="absolute bottom-full left-0 w-full mb-3 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in slide-in-from-bottom-2 zoom-in-95 z-50">
                            <button
                                onClick={async () => {
                                    try {
                                        // Log logout button press and token for all users and conditions
                                        console.log('🔴 Confirm Logout button pressed')
                                        console.log('👤 User Info:', {
                                            userId: session?.user?.id,
                                            email: session?.user?.email,
                                            role: userRole,
                                            userName: userName
                                        })
                                        console.log('🔑 Access Token:', session?.access_token || 'No token found')
                                        console.log('📋 Full Session:', session)

                                        // 1) Proper Supabase logout (GLOBAL) – wait for it to finish
                                        console.log('🚪 Attempting to sign out (global)...')
                                        const { error: signOutError } = await supabase.auth.signOut({
                                            scope: 'global',
                                        })

                                        if (signOutError) {
                                            console.error('❌ Sign out error:', signOutError)
                                        } else {
                                            console.log('✅ Sign out successful (global)')
                                        }

                                        // 2) Clear all client-side session state in the app
                                        setSession(null)
                                        setUserRole(null)
                                        setShowLogout(false)
                                        setSidebarOpen(false)

                                        // 3) Redirect to login page AFTER logout is done
                                        console.log('🔄 Redirecting to login page...')
                                        window.location.href = '/login?message=Signed out successfully'
                                    } catch (error) {
                                        console.error('❌ Logout error:', error)
                                        // If anything fails, still try to clear state and redirect
                                        setSession(null)
                                        setUserRole(null)
                                        setShowLogout(false)
                                        setSidebarOpen(false)
                                        console.log('🔄 Force redirecting to login page after error...')
                                        window.location.href = '/login?message=Signed out successfully'
                                    }
                                }}
                                className="w-full p-4 flex items-center justify-between text-rose-600 hover:bg-rose-50 rounded-xl transition-colors group/logout"
                            >
                                <span className="text-xs font-black uppercase tracking-widest">Confirm Logout</span>
                                <LogOut size={16} className="group-hover/logout:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {/* Profile Toggle */}
                    <button
                        onClick={() => setShowLogout(!showLogout)}
                        className={`w-full p-2.5 border rounded-2xl flex items-center space-x-3 transition-all duration-300 text-left ${showLogout ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-md'
                            }`}
                    >
                        <div className="relative">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-xs">
                                {userName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="font-bold text-[10px] text-slate-900 truncate uppercase tracking-tight leading-none mb-1">
                                {userName || 'User'}
                            </p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{userRole}</p>
                        </div>
                        <div className={`text-slate-300 transition-transform duration-300 ${showLogout ? 'rotate-180 text-indigo-500' : ''}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    </button>
                </div>
            </aside>

            {/* Main Aesthetic Light Workspace Wrapper */}
            <div className="min-h-screen">
                {children}
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)} />
            )}
        </div>
    )
}

