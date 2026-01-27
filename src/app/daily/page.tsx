import { prisma } from '@/lib/prisma'
import { DailyOperationsClient } from './client'

export default async function DailyPage() {
    const activeEmployees = await prisma.employee.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' }
    })

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Operación Diaria</h3>
                <p className="text-sm text-muted-foreground">
                    Registro de asistencia, producción y cálculo de nómina diaria.
                </p>
            </div>
            <DailyOperationsClient activeEmployees={activeEmployees} />
        </div>
    )
}
