
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession, decrypt } from '@/lib/auth'

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value
    const user = session ? await decrypt(session) : null

    // Define public paths
    const isPublicPath = request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname === '/favicon.ico'

    // If user is not logged in and tries to access protected route
    if (!user && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is logged in and tries to access login page
    if (user && request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/daily', request.url)) // Default redirect
    }

    // RBAC Checks (Optional for now, but good to have structure)
    if (user && request.nextUrl.pathname.startsWith('/admin')) {
        if (user.user.role !== 'ADMIN') {
            // Redirect to authorized area or show error?
            // For now, redirect to daily
            return NextResponse.redirect(new URL('/daily', request.url))
        }
    }

    return await updateSession(request)
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
