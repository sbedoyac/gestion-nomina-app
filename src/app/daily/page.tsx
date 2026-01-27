
import { getSession } from '@/lib/auth'
import { getEmployees } from '@/app/actions'
import { DailyOperationsClient } from './client'

export default async function DailyPage() {
    const session = await getSession()
    const user = session?.user

    const employees = await getEmployees()
    const activeEmployees = employees.filter(e => e.activo)

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Operación Diaria</h3>
                <p className="text-sm text-muted-foreground">
                    Registro de asistencia, producción y cálculo de nómina diaria.
                </p>
            </div>
            <DailyOperationsClient activeEmployees={activeEmployees} currentUser={user} />
        </div>
    )
}
