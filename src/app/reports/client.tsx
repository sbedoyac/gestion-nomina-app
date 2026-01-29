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
import * as XLSX from 'xlsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    const [areaFilter, setAreaFilter] = useState('Todas')
    const [roleFilter, setRoleFilter] = useState('Todos')

    const filteredData = consolidatedData.filter(item => {
        const matchesArea = areaFilter === 'Todas' ||
            item.employee.area === areaFilter ||
            item.employee.area === 'Ambos'

        const matchesRole = roleFilter === 'Todos' ||
            item.employee.cargoBase === roleFilter

        return matchesArea && matchesRole
    })

    const handleExport = () => {
        const exportData = filteredData.map(item => ({
            Nombre: item.employee.nombre,
            Cedula: item.employee.cedula,
            Cargo: item.employee.cargoBase,
            Area: item.employee.area,
            TotalPagar: item.total
        }))

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Nomina")
        XLSX.writeFile(wb, `Nomina_${startDate}_${endDate}.xlsx`)
    }

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
                                        <TableHead className="text-center">Reses</TableHead>
                                        <TableHead className="text-right">Bolsa Desposte</TableHead>
                                        <TableHead className="text-right">Bolsa Recogedor</TableHead>
                                        <TableHead className="text-right">Total Pagado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialDays.map(day => {
                                        const porkProd = day.production.find(p => p.productType === 'Cerdo')
                                        const beefProd = day.production.find(p => p.productType === 'Res')

                                        const pigs = porkProd ? porkProd.cerdosDespostados : 0
                                        const cows = beefProd ? beefProd.cerdosDespostados : 0 // Using same field for quantity

                                        const poolD = day.production.reduce((acc, p) => acc + (p.cerdosDespostados * p.valorDesposte), 0)
                                        const poolR = day.production.reduce((acc, p) => acc + (p.cerdosDespostados * p.valorRecogedor), 0)
                                        const totalPaid = day.payments.reduce((acc, p) => acc + p.pagoCalculado, 0)

                                        return (
                                            <TableRow key={day.id}>
                                                <TableCell className="font-medium">
                                                    {format(new Date(day.fecha), 'PPP', { locale: es })}
                                                </TableCell>
                                                <TableCell className="text-center">{pigs}</TableCell>
                                                <TableCell className="text-center">{cows}</TableCell>
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
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-center flex-wrap">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Filtrar Área</label>
                                            <Select value={areaFilter} onValueChange={setAreaFilter}>
                                                <SelectTrigger className="w-[150px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Todas">Todas</SelectItem>
                                                    <SelectItem value="Cerdo">Cerdo</SelectItem>
                                                    <SelectItem value="Res">Res</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Filtrar Cargo</label>
                                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                                <SelectTrigger className="w-[150px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Todos">Todos</SelectItem>
                                                    <SelectItem value="Coordinador">Coordinador</SelectItem>
                                                    <SelectItem value="Despostador Experto">Despostador Experto</SelectItem>
                                                    <SelectItem value="Despostador General">Despostador General</SelectItem>
                                                    <SelectItem value="Despostador Aprendiz">Despostador Aprendiz</SelectItem>
                                                    <SelectItem value="Recogedor Experto">Recogedor Experto</SelectItem>
                                                    <SelectItem value="Recogedor General">Recogedor General</SelectItem>
                                                    <SelectItem value="Recogedor Aprendiz">Recogedor Aprendiz</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1"></div>
                                        <div className="pt-4">
                                            <Button variant="outline" onClick={handleExport}>
                                                Exportar a Excel
                                            </Button>
                                        </div>
                                    </div>

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
                                                {filteredData.map((item, idx) => (
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
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
