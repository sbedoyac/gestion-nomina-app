'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function MainNav({
    className,
    ...props
}: React.HTMLAttributes<HTMLElement>) {
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
        </nav>
    )
}
