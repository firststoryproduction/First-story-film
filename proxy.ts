import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    
    console.log('[MIDDLEWARE] 🚀 Request received', {
        pathname,
        method: request.method,
        hasCookies: request.cookies.size > 0,
        cookieNames: Array.from(request.cookies.getAll().map(c => c.name)),
        timestamp: new Date().toISOString()
    })

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // CRITICAL FIX: Only check session for protected routes to reduce overhead
    // Refresh session to ensure tokens are up to date
    // This prevents "Invalid Refresh Token" errors by keeping sessions fresh
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('[MIDDLEWARE] 📊 Session check', {
        pathname,
        hasSession: !!session,
        userId: session?.user?.id,
        error: sessionError?.message,
        timestamp: new Date().toISOString()
    })
    
    // If there's a session error related to refresh tokens, clear it
    if (sessionError && (sessionError.message?.toLowerCase().includes('refresh token') || 
                         sessionError.message?.toLowerCase().includes('not found'))) {
        console.log('[MIDDLEWARE] 🧹 Clearing invalid session cookies', {
            error: sessionError.message,
            timestamp: new Date().toISOString()
        })
        // Clear invalid session cookies
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')
    }

    // Protected routes logic
    const isDashboard = pathname.startsWith('/dashboard')
    const isLogin = pathname.startsWith('/login')
    const isApiAdmin = pathname.startsWith('/api/admin')

    if (isDashboard && !session) {
        console.log('[MIDDLEWARE] 🔒 Dashboard access denied - redirecting to login', {
            pathname,
            timestamp: new Date().toISOString()
        })
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isLogin && session) {
        console.log('[MIDDLEWARE] 🔄 Already logged in - redirecting to dashboard', {
            userId: session.user.id,
            timestamp: new Date().toISOString()
        })
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Role-based protection for API routes (Optional: can also be done inside routes)
    if (isApiAdmin && !session) {
        console.log('[MIDDLEWARE] 🔒 API admin access denied', {
            pathname,
            timestamp: new Date().toISOString()
        })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[MIDDLEWARE] ✅ Request allowed', {
        pathname,
        hasSession: !!session,
        timestamp: new Date().toISOString()
    })

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
