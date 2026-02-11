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
            const { data: profileList, error } = await supabase
                .from('users')
                .select('role, name')
                .eq('id', userId)
                .limit(1)

            console.log('[LAYOUT] 📊 Profile fetch response', {
                userId,
                hasData: !!profileList && profileList.length > 0,
                dataLength: profileList?.length || 0,
                error: error?.message,
                timestamp: new Date().toISOString()
            })

            if (error) {
                console.error('[LAYOUT] ❌ Profile fetch error:', error)
                if (userRole === null) {
                    console.log('[LAYOUT] ⚠️ Setting default role USER due to error')
                    setUserRole('USER')
                }
                return
            }

            if (profileList && profileList.length > 0) {
                const profile = profileList[0] as { role?: string; name?: string }
                const newRole = profile.role || 'USER'
                console.log('[LAYOUT] ✅ Profile loaded', {
                    userId,
                    role: newRole,
                    name: profile.name,
                    timestamp: new Date().toISOString()
                })
                setUserRole(newRole)
                setUserName(profile.name || '')
            } else {
                console.log('[LAYOUT] ⚠️ No profile found, using default USER role', {
                    userId,
                    timestamp: new Date().toISOString()
                })
                if (userRole === null) setUserRole('USER')
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

        console.log('[LAYOUT] 🚀 useEffect triggered', {
            renderCount,
            loading,
            hasSession: !!session,
            userRole,
            timestamp: new Date().toISOString()
        })

        // 10-second fail-safe timeout (increased for Vercel serverless)
        const timeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[LAYOUT] ⏰ Loading timeout - forcing render', {
                    renderCount,
                    timestamp: new Date().toISOString()
                });
                setLoading(false);
                if (userRole === null) {
                    console.log('[LAYOUT] ⚠️ Setting default role USER due to timeout')
                    setUserRole('USER');
                }
            }
        }, 10000);

        const init = async () => {
            try {
                console.log('[LAYOUT] 🔄 Init started', {
                    renderCount,
                    timestamp: new Date().toISOString()
                })

                // CRITICAL FIX: Reduce retries - middleware already validated session
                // If we're here, middleware passed, so session should be available
                let currentSession = null
                let retries = 2
                
                while (retries > 0 && !currentSession && mounted) {
                    try {
                        console.log('[LAYOUT] 🔍 Session check attempt', {
                            attempt: 3 - retries,
                            renderCount,
                            timestamp: new Date().toISOString()
                        })

                        const { data, error } = await supabase.auth.getSession()
                        
                        console.log('[LAYOUT] 📊 Session check response', {
                            attempt: 3 - retries,
                            hasSession: !!data?.session,
                            userId: data?.session?.user?.id,
                            error: error?.message,
                            timestamp: new Date().toISOString()
                        })
                        
                        if (error) {
                            console.error('[LAYOUT] ❌ Session error:', error)
                            // If it's a token error, wait a bit and retry
                            if (error.message?.toLowerCase().includes('token') && retries > 1) {
                                await new Promise(resolve => setTimeout(resolve, 300))
                                retries--
                                continue
                            }
                            // For other errors, break and redirect
                            break
                        }
                        
                        currentSession = data.session
                        
                        if (currentSession?.user) {
                            console.log('[LAYOUT] ✅ Session found', {
                                userId: currentSession.user.id,
                                email: currentSession.user.email,
                                timestamp: new Date().toISOString()
                            })
                            break
                        }
                        
                        retries--
                        if (retries > 0) {
                            // Wait before retry
                            await new Promise(resolve => setTimeout(resolve, 300))
                        }
                    } catch (err) {
                        console.error('[LAYOUT] ❌ Session retrieval error:', err)
                        retries--
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 300))
                        }
                    }
                }

                if (mounted) {
                    if (currentSession?.user) {
                        console.log('[LAYOUT] ✅ Setting session and fetching profile', {
                            userId: currentSession.user.id,
                            timestamp: new Date().toISOString()
                        })
                        setSession(currentSession)
                        await fetchProfile(currentSession.user.id)
                        console.log('[LAYOUT] ✅ Init complete', {
                            userId: currentSession.user.id,
                            userRole,
                            timestamp: new Date().toISOString()
                        })
                    } else {
                        // Not logged in - redirect to login
                        console.log('[LAYOUT] ⚠️ No session found, redirecting to login', {
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
                    // On error, redirect to login for safety
                    router.push('/login')
                }
            } finally {
                if (mounted) {
                    console.log('[LAYOUT] 🏁 Init finally - setting loading to false', {
                        renderCount,
                        timestamp: new Date().toISOString()
                    })
                    setLoading(false)
                    clearTimeout(timeout)
                }
            }
        }


        init()

        // CRITICAL: Refresh session when tab becomes visible again
        const handleVisibilityChange = async () => {
            if (!document.hidden && mounted) {
                console.log('🔄 Tab visible - refreshing session...', { timestamp: new Date().toISOString() });
                try {
                    // First check if we have a valid session with a refresh token
                    const { data: { session: currentSession } } = await supabase.auth.getSession()
                    
                    if (!currentSession) {
                        console.log('⚠️ No session found, redirecting to login')
                        router.push('/login')
                        return
                    }

                    // Check if session has a refresh token
                    if (!currentSession.refresh_token) {
                        console.log('⚠️ No refresh token found, redirecting to login')
                        router.push('/login')
                        return
                    }

                    // Just refresh the session token, don't try to fetch profile
                    // (Profile data doesn't change when you switch tabs)
                    const { data, error } = await supabase.auth.refreshSession()

                    if (error) {
                        console.error('Visibility: Session refresh error:', error)
                        
                        // If refresh token is invalid or not found, redirect to login
                        if (error.message?.toLowerCase().includes('refresh token') || 
                            error.message?.toLowerCase().includes('not found') ||
                            error.message?.toLowerCase().includes('invalid')) {
                            console.log('⚠️ Invalid refresh token, redirecting to login')
                            setSession(null)
                            setUserRole(null)
                            router.push('/login')
                            return
                        }
                        return
                    }

                    if (data?.session && mounted) {
                        // Update session state silently
                        setSession(data.session)
                        console.log('✅ Token refreshed successfully')
                    } else if (mounted) {
                        // No session returned, user needs to login again
                        console.log('⚠️ No session returned from refresh, redirecting to login')
                        setSession(null)
                        setUserRole(null)
                        router.push('/login')
                    }
                } catch (err) {
                    console.error('Visibility: Unexpected error:', err)
                    // On any unexpected error, redirect to login for safety
                    if (mounted) {
                        setSession(null)
                        setUserRole(null)
                        router.push('/login')
                    }
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mounted) return

            console.log('[LAYOUT] 🔔 Auth state change', {
                event,
                hasNewSession: !!newSession,
                newUserId: newSession?.user?.id,
                timestamp: new Date().toISOString()
            })

            // CRITICAL FIX: Use a ref-like pattern by checking current state
            // We'll get the current session from the closure, but it's okay since
            // this callback is only for auth events, not for reading stale state
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                console.log('[LAYOUT] ✅ Updating session from auth state change', {
                    event,
                    userId: newSession?.user?.id,
                    timestamp: new Date().toISOString()
                })
                setSession(newSession)
                if (newSession?.user) {
                    await fetchProfile(newSession.user.id)
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('[LAYOUT] 🚪 Signed out, clearing session', {
                    timestamp: new Date().toISOString()
                })
                setSession(null)
                setUserRole(null)
                router.push('/login')
            }

            setLoading(false)
        })

        return () => {
            console.log('[LAYOUT] 🧹 Cleanup', {
                timestamp: new Date().toISOString()
            })
            mounted = false
            subscription.unsubscribe()
            clearTimeout(timeout)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
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

