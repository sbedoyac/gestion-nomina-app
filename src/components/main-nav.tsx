'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/app/actions'

export function MainNav({
    className,
    currentUser,
    ...props
}: React.HTMLAttributes<HTMLElement> & { currentUser?: any }) {
    const pathname = usePathname()

    const routes = [
        {
            href: '/employees',
            label: 'Colaboradores',
            active: pathname === '/employees',
        },
        {
            href: '/daily',
            label: 'Operación Diaria',
            active: pathname === '/daily',
        },
        {
            href: '/reports',
            label: 'Reportes',
            active: pathname === '/reports',
        },
    ]

    return (
        <nav
            className={cn("flex items-center space-x-4 lg:space-x-6", className)}
            {...props}
        >
            <Link href="/" className="text-xl font-bold tracking-tight text-primary mr-4">
                Nómina Desposte
            </Link>
            {routes.map((route) => (
                <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                        "text-sm font-medium transition-colors hover:text-primary",
                        route.active
                            ? "text-black dark:text-white"
                            : "text-muted-foreground"
                    )}
                >
                    {route.label}
                </Link>
            ))}
            {currentUser?.role === 'ADMIN' && (
                <Link
                    href="/admin"
                    className={cn(
                        "text-sm font-medium transition-colors hover:text-primary",
                        pathname === '/admin'
                            ? "text-black dark:text-white"
                            : "text-muted-foreground"
                    )}
                >
                    Administración
                </Link>
            )}

            <div className="ml-auto flex items-center space-x-4">
                {currentUser && (
                    <span className="text-sm text-muted-foreground">
                        Hola, {currentUser.username}
                    </span>
                )}
                {currentUser && (
                    <button
                        onClick={() => logoutAction()}
                        className="text-sm font-medium text-red-500 hover:text-red-700"
                    >
                        Cerrar Sesión
                    </button>
                )}
            </div>
        </nav>
    )
}
