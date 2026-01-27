import { prisma } from '@/lib/prisma'
import { ReportsClient } from './client'

export default async function ReportsPage() {
    // Fetch last 30 days with full details
    const days = await prisma.workDay.findMany({
        orderBy: { fecha: 'desc' },
        take: 30,
        include: {
            production: true,
            payments: true
        }
    })

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Reportes</h3>
                <p className="text-sm text-muted-foreground">
                    Últimos 30 días de operación.
                </p>
            </div>
            <ReportsClient initialDays={days} />
        </div>
    )
}
