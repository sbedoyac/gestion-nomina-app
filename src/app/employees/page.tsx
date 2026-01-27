import { getEmployees } from "@/app/actions"
import { EmployeesClient } from "./client"

export default async function EmployeesPage() {
    const employees = await getEmployees()
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Colaboradores</h3>
                <p className="text-sm text-muted-foreground">
                    Gestione el personal disponible para la operación.
                </p>
            </div>
            <EmployeesClient initialEmployees={employees} />
        </div>
    )
}
