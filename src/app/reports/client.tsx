'use client'

import { WorkDay, ProductionDay, Payment } from '@prisma/client'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { useState } from 'react'
import { getConsolidatedPayroll } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ExtendedWorkDay = WorkDay & {
    production: ProductionDay[];
    payments: Payment[];
}

interface ReportsClientProps {
    initialDays: ExtendedWorkDay[]
}

export function ReportsClient({ initialDays }: ReportsClientProps) {
    // Consolidated State
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [consolidatedData, setConsolidatedData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const handleGenerate = async () => {
        if (!startDate || !endDate) return
        setLoading(true)
        try {
            const data = await getConsolidatedPayroll(new Date(startDate), new Date(endDate))
            setConsolidatedData(data)
        } catch (e) {
            console.error(e)
            alert("Error generando reporte")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="history">
                <TabsList>
                    <TabsTrigger value="history">Historial Diario</TabsTrigger>
                    <TabsTrigger value="consolidated">Reporte Consolidado</TabsTrigger>
                </TabsList>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial Reciente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-center">Cerdos</TableHead>
                                        <TableHead className="text-right">Bolsa Desposte</TableHead>
                                        <TableHead className="text-right">Bolsa Recogedor</TableHead>
                                        <TableHead className="text-right">Total Pagado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialDays.map(day => {
                                        const pigs = day.production.reduce((acc, p) => acc + p.cerdosDespostados, 0)
                                        const poolD = day.production.reduce((acc, p) => acc + (p.cerdosDespostados * p.valorDesposte), 0)
                                        const poolR = day.production.reduce((acc, p) => acc + (p.cerdosDespostados * p.valorRecogedor), 0)
                                        const totalPaid = day.payments.reduce((acc, p) => acc + p.pagoCalculado, 0)

                                        return (
                                            <TableRow key={day.id}>
                                                <TableCell className="font-medium">
                                                    {format(new Date(day.fecha), 'PPP', { locale: es })}
                                                </TableCell>
                                                <TableCell className="text-center">{pigs}</TableCell>
                                                <TableCell className="text-right">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(poolD)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(poolR)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPaid)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="consolidated">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reporte de Nómina por Período</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-end gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fecha Inicio</label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fecha Fin</label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleGenerate} disabled={loading}>
                                    {loading ? 'Generando...' : 'Generar Reporte'}
                                </Button>
                            </div>

                            {consolidatedData.length > 0 && (
                                <div className="border rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cargo (Base)</TableHead>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Cédula</TableHead>
                                                <TableHead className="text-right">Total a Pagar</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {consolidatedData.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium text-muted-foreground">
                                                        {item.employee.cargoBase}
                                                    </TableCell>
                                                    <TableCell>{item.employee.nombre}</TableCell>
                                                    <TableCell>{item.employee.cedula}</TableCell>
                                                    <TableCell className="text-right font-bold text-lg">
                                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.total)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
