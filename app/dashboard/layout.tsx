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
        if (session?.user?.id === userId && userRole !== null) return;

        try {
            const { data: profileList, error } = await supabase
                .from('users')
                .select('role, name')
                .eq('id', userId)
                .limit(1)

            if (error) {
                console.error('Layout: Profile fetch error:', error)
                if (userRole === null) setUserRole('USER')
                return
            }

            if (profileList && profileList.length > 0) {
                const profile = profileList[0] as { role?: string; name?: string }
                setUserRole(profile.role || 'USER')
                setUserName(profile.name || '')
            } else {
                if (userRole === null) setUserRole('USER')
            }
        } catch (err) {
            console.error('Layout: Unexpected profile error:', err)
            if (userRole === null) setUserRole('USER')
        }
    }

    useEffect(() => {
        let mounted = true

        const init = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession()

                if (mounted) {
                    if (currentSession?.user) {
                        setSession(currentSession)
                        await fetchProfile(currentSession.user.id)
                    }
                }
            } catch (error) {
                console.error('Layout: Init error:', error)
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        init()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mounted) return

            // Only act if the session actually changed or it's a signed-in event
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || newSession?.user?.id !== session?.user?.id) {
                setSession(newSession)
                if (newSession?.user) {
                    await fetchProfile(newSession.user.id)
                }
            } else if (event === 'SIGNED_OUT') {
                setSession(null)
                setUserRole(null)
                router.push('/login')
            }

            // Never set loading back to true here
            setLoading(false)
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, []) // Removed dependency to avoid redundant trigger on session object identity change


    if (loading || (session && userRole === null)) {
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
                                    await supabase.auth.signOut()
                                    router.push('/login?message=Signed out successfully')
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

