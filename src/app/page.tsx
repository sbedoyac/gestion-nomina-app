import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Users, Calendar, FileText } from 'lucide-react'

export default function Home() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Link href="/employees">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Colaboradores
            </CardTitle>
            <CardDescription>Administrar personal</CardDescription>
          </CardHeader>
          <CardContent>
            Gestionar empleados, cargos y estados.
          </CardContent>
        </Card>
      </Link>

      <Link href="/daily">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Operación Diaria
            </CardTitle>
            <CardDescription>Registro y Cálculo</CardDescription>
          </CardHeader>
          <CardContent>
            Registrar asistencia, producción y liquidar día.
          </CardContent>
        </Card>
      </Link>

      <Link href="/reports">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Reportes
            </CardTitle>
            <CardDescription>Histórico y Consultas</CardDescription>
          </CardHeader>
          <CardContent>
            Ver pagos por fecha y por colaborador.
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
