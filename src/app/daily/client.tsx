'use client'

import { useState, useEffect } from 'react'
import { Employee, WorkDay, DayAssignment, ProductionDay, Payment } from '@prisma/client'
import { getWorkDayByDate, saveAssignments, saveProduction, calculatePaymentsAction, ensureWorkDay } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Calculator, Save } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DailyOperationsClientProps {
    activeEmployees: Employee[]
    currentUser: any
}

type ExtendedWorkDay = WorkDay & {
    assignments: DayAssignment[];
    production: ProductionDay[];
    payments: Payment[];
}

export function DailyOperationsClient({ activeEmployees, currentUser }: DailyOperationsClientProps) {
    const [date, setDate] = useState<Date>()
    const [loading, setLoading] = useState(false)
    const [calculating, setCalculating] = useState(false)

    // Data state
    const [workDay, setWorkDay] = useState<ExtendedWorkDay | null>(null)

    // Production Form
    const [prodForm, setProdForm] = useState({
        pigs: 0,
        deboneVal: 2000,
        pickerVal: 180,
        includeCoord: false, // Mode B default (false)
        productType: 'Cerdo'
    })

    // Attendance State
    // Map employeeId -> { present: boolean, role: string; participated?: number }
    const [attendance, setAttendance] = useState<Record<string, { present: boolean; role: string; participated?: number }>>({})

    // Set date on mount to avoid hydration mismatch
    useEffect(() => {
        setDate(new Date())
    }, [])

    // Fetch data when date changes
    useEffect(() => {
        if (!date) return

        const loadDay = async () => {
            setLoading(true)
            try {
                const day = await getWorkDayByDate(date) as ExtendedWorkDay | null
                setWorkDay(day)

                // Initialize controls
                const initialAttendance: Record<string, { present: boolean; role: string; participated?: number }> = {}

                activeEmployees.forEach(emp => {
                    // If assignment exists, use it. Else default = true (if new day usually everyone works?) 
                    // or false? Let's default to false to be safe, or true if user prefers.
                    // Prompt says "Lista de colaboradores activos con checkbox 'Trabajó hoy'".
                    // Let's default to FALSE for unchecked, user checks who came.
                    // BUT if day exists, use existing data.

                    const existing = day?.assignments.find(a => a.employeeId === emp.id)

                    if (existing) {
                        initialAttendance[emp.id] = {
                            present: true,
                            role: existing.cargoDia,
                            participated: existing.cerdosParticipados ? existing.cerdosParticipados : undefined
                        }
                    } else {
                        // Default: Not present. If they check it, default role = emp.cargoBase
                        initialAttendance[emp.id] = { present: false, role: emp.cargoBase }
                    }
                })

                setAttendance(initialAttendance)

                const prod = day?.production.find(p => p.productType === prodForm.productType)

                if (prod) {
                    setProdForm(prev => ({
                        ...prev,
                        pigs: prod.cerdosDespostados,
                        deboneVal: prod.valorDesposte,
                        pickerVal: prod.valorRecogedor,
                        includeCoord: prod.incluirCoordinador,
                        productType: prod.productType
                    }))
                } else {
                    // Keep defaults or reset?
                    // If new day, keep defaults (2000, 180, false).
                    // But if switching from a day with data to a new day, verification:
                    // Should valid defaults be persistent? 
                    // I'll stick to hardcoded defaults for now or previous val?
                    // Hardcoded defaults are safer for MVP.
                    const initialType = currentUser?.area === 'Res' ? 'Res' : 'Cerdo'
                    const isBeef = initialType === 'Res'
                    setProdForm({
                        pigs: 0,
                        deboneVal: isBeef ? 11000 : 2000,
                        pickerVal: isBeef ? 1000 : 180,
                        includeCoord: false,
                        productType: initialType
                    })
                }

            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        loadDay()
    }, [date]) // Excluding activeEmployees to avoid loop if prop reference changes

    const handleAttendanceChange = (empId: string, present: boolean) => {
        setAttendance(prev => ({
            ...prev,
            [empId]: { ...prev[empId], present }
        }))
    }

    const handleRoleChange = (empId: string, role: string) => {
        setAttendance(prev => ({
            ...prev,
            [empId]: { ...prev[empId], role }
        }))
    }

    const handleParticipatedChange = (empId: string, val: number) => {
        setAttendance(prev => ({
            ...prev,
            [empId]: { ...prev[empId], participated: val }
        }))
    }

    const handleProductTypeChange = (type: string) => {
        const isBeef = type === 'Res'
        const existingProd = workDay?.production.find(p => p.productType === type)

        // 1. Update Production Form State
        if (existingProd) {
            setProdForm(prev => ({
                ...prev,
                productType: type,
                pigs: existingProd.cerdosDespostados,
                deboneVal: existingProd.valorDesposte,
                pickerVal: existingProd.valorRecogedor,
                includeCoord: existingProd.incluirCoordinador
            }))
        } else {
            setProdForm(prev => ({
                ...prev,
                productType: type,
                deboneVal: isBeef ? 11000 : 2000,
                pickerVal: isBeef ? 1000 : 180,
                pigs: 0
            }))
        }

        // 2. Refresh Attendance State for the new Product Type
        // If we don't do this, the previous selections persist and corrupt the new save.
        const newAttendance: Record<string, { present: boolean; role: string; participated?: number }> = {}

        activeEmployees.forEach(emp => {
            // Check if there is an existing assignment strictly for this product type
            // Note: workDay.assignments contains ALL assignments for the day (both types)
            const existingAssignment = workDay?.assignments.find(a =>
                a.employeeId === emp.id && a.productType === type
            )

            if (existingAssignment) {
                newAttendance[emp.id] = {
                    present: true,
                    role: existingAssignment.cargoDia,
                    participated: existingAssignment.cerdosParticipados ? existingAssignment.cerdosParticipados : undefined
                }
            } else {
                newAttendance[emp.id] = { present: false, role: emp.cargoBase }
            }
        })

        setAttendance(newAttendance)
    }

    const handleSaveAndCalculate = async () => {
        setCalculating(true)
        try {
            // 1. Ensure/Create Day? getWorkDayByDate handled reading.
            // But creating is handled by saving.
            // We assume date is the key.

            // Need a "ensureDay" logic or the save actions handle it?
            // saveProduction uses workDayId. If workDay assumes existence?
            // My actions require workDayId.
            // I should ensure the day exists first.
            // Wait, `getWorkDayByDate` returns null if not found.
            // I need a `ensureWorkDay` action.
            // I implemented `ensureWorkDay` in actions.ts!

            if (!date) {
                alert("Seleccione una fecha")
                setCalculating(false)
                return
            }

            const day = await ensureWorkDay(date)

            // 2. Save Production
            await saveProduction(day.id, {
                pigs: Number(prodForm.pigs) || 0,
                deboneVal: Number(prodForm.deboneVal) || 0,
                pickerVal: Number(prodForm.pickerVal) || 0,
                includeCoord: prodForm.includeCoord ?? false,
                productType: prodForm.productType
            })

            // 3. Save Assignments
            const assignments = Object.entries(attendance)
                .filter(([_, val]) => val.present)
                .map(([empId, val]) => ({
                    employeeId: empId,
                    role: val.role,
                    participated: val.participated ?? prodForm.pigs // Default to max if not set
                }))

            await saveAssignments(day.id, assignments, prodForm.productType)

            // 4. Calculate
            const res = await calculatePaymentsAction(day.id)

            if (res.success) {
                // Refresh local state
                const updatedDay = await getWorkDayByDate(date) as ExtendedWorkDay
                setWorkDay(updatedDay)
            } else {
                alert("Error al calcular: " + res.error)
            }

        } catch (err) {
            console.error(err)
            alert("Error inesperado")
        } finally {
            setCalculating(false)
        }
    }

    // Derived list for display
    const filteredEmployees = activeEmployees.filter(emp => {
        const area = (emp as any).area || 'Cerdo' // Default to Cerdo if undefined
        if (prodForm.productType === 'Cerdo') return area === 'Cerdo' || area === 'Ambos'
        if (prodForm.productType === 'Res') return area === 'Res' || area === 'Ambos'
        return true
    })

    const employeesList = filteredEmployees.map(emp => {
        const state = attendance[emp.id] || { present: false, role: emp.cargoBase }
        return { ...emp, ...state }
    })

    // Results Tab State
    const [resultsTab, setResultsTab] = useState('Cerdo')

    // Sync results tab with user role or form interaction if desired, 
    // but user wanted explicit control. Let's default to current form type or user area.
    useEffect(() => {
        if (currentUser?.area && currentUser.area !== 'Ambos') {
            setResultsTab(currentUser.area)
        } else {
            // If Admin/Ambos, default to whatever they are working on or just keep separate?
            // Let's sync with prodForm for convenience, but allow manual override?
            // User asked for option to filter.
        }
    }, [currentUser])

    // Filter payments for results view
    const filteredPayments = workDay?.payments.filter(p => p.productType === resultsTab) || []
    const totalPaid = filteredPayments.reduce((acc, p) => acc + p.pagoCalculado, 0) || 0

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Left Column: Controls */}
            <div className="space-y-6 lg:col-span-2">

                {/* 1. Date & Production */}
                <Card>
                    <CardHeader>
                        <CardTitle>Configuración del Día</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col space-y-2">
                            <Label>Fecha de Operación</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[240px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP", { locale: es }) : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(d) => d && setDate(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="pt-2">
                            <Label className="mb-2 block">Tipo de Operación</Label>
                            <Tabs value={prodForm.productType} onValueChange={handleProductTypeChange}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="Cerdo" disabled={currentUser?.role === 'COORDINADOR' && currentUser?.area === 'Res'}>Cerdo (Pork)</TabsTrigger>
                                    <TabsTrigger value="Res" disabled={currentUser?.role === 'COORDINADOR' && currentUser?.area === 'Cerdo'}>Res (Beef)</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cantidad ({prodForm.productType})</Label>
                                <Input
                                    type="number"
                                    value={prodForm.pigs ?? ''}
                                    onChange={e => setProdForm({ ...prodForm, pigs: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor x {prodForm.productType} (Desposte)</Label>
                                <Input
                                    type="number"
                                    value={prodForm.deboneVal ?? ''}
                                    onChange={e => setProdForm({ ...prodForm, deboneVal: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor x {prodForm.productType} (Recogedor)</Label>
                                <Input
                                    type="number"
                                    value={prodForm.pickerVal ?? ''}
                                    onChange={e => setProdForm({ ...prodForm, pickerVal: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-8">
                                <Switch
                                    id="coord-mode"
                                    checked={prodForm.includeCoord}
                                    onCheckedChange={(checked) => setProdForm({ ...prodForm, includeCoord: checked })}
                                />
                                <Label htmlFor="coord-mode">Incluir Coordinador en Bolsa</Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Attendance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Asistencia y Cargos</CardTitle>
                        <CardDescription>Seleccione quién trabajó hoy, su rol y participación.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Asist.</TableHead>
                                    <TableHead>Colaborador</TableHead>
                                    <TableHead>Cargo del Día</TableHead>
                                    <TableHead className="w-[100px]">Cant.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employeesList.map(emp => (
                                    <TableRow key={emp.id} className={emp.present ? "" : "opacity-50"}>
                                        <TableCell>
                                            <Checkbox
                                                checked={emp.present}
                                                onCheckedChange={(c) => handleAttendanceChange(emp.id, c as boolean)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{emp.nombre}</TableCell>
                                        <TableCell>
                                            <Select
                                                disabled={!emp.present}
                                                value={emp.role}
                                                onValueChange={(val) => handleRoleChange(emp.id, val)}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Coordinador">Coordinador</SelectItem>
                                                    <SelectItem value="Despostador Experto">Despostador Experto</SelectItem>
                                                    <SelectItem value="Despostador General">Despostador General</SelectItem>
                                                    <SelectItem value="Despostador Aprendiz">Despostador Aprendiz</SelectItem>
                                                    <SelectItem value="Recogedor Experto">Recogedor Experto</SelectItem>
                                                    <SelectItem value="Recogedor General">Recogedor General</SelectItem>
                                                    <SelectItem value="Recogedor Aprendiz">Recogedor Aprendiz</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                disabled={!emp.present}
                                                value={emp.participated ?? prodForm.pigs ?? ''}
                                                onChange={(e) => handleParticipatedChange(emp.id, Number(e.target.value))}
                                                className="w-20"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Button size="lg" className="w-full" onClick={handleSaveAndCalculate} disabled={calculating}>
                    {calculating ? (
                        <>Calculando...</>
                    ) : (
                        <><Calculator className="mr-2 h-4 w-4" /> Calcular y Guardar Pagos</>
                    )}
                </Button>
            </div>

            {/* Right Column: Results */}
            <div className="space-y-6">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Resultados del Día</CardTitle>
                        <div className="pt-2">
                            <Tabs value={resultsTab} onValueChange={setResultsTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="Cerdo" disabled={currentUser?.role === 'COORDINADOR' && currentUser?.area === 'Res'}>Cerdo</TabsTrigger>
                                    <TabsTrigger value="Res" disabled={currentUser?.role === 'COORDINADOR' && currentUser?.area === 'Cerdo'}>Res</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <CardDescription className="pt-4">
                            Total Pagado ({resultsTab}): <span className="font-bold text-foreground">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPaid)}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!workDay?.payments || workDay.payments.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No hay cálculos registrados.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="border rounded-md overflow-hidden">
                                    {filteredPayments.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">No hay pagos registrados para {resultsTab} hoy.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nombre</TableHead>
                                                    <TableHead className="text-right">Pago</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPayments.map(p => {
                                                    const emp = activeEmployees.find(e => e.id === p.employeeId)
                                                    return (
                                                        <TableRow key={p.id}>
                                                            <TableCell>
                                                                <div className="font-medium">{emp?.nombre || 'Desconocido'}</div>
                                                                <div className="text-xs text-muted-foreground">{p.cargoDia}</div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold">
                                                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.pagoCalculado)}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
