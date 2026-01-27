'use client'

import { useState } from 'react'
import { Employee } from '@prisma/client'
import { createEmployee, updateEmployee, toggleEmployeeStatus, deleteEmployee } from '@/app/actions'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, User, Trash } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface EmployeesClientProps {
    initialEmployees: Employee[]
    currentUser: any
}

export function EmployeesClient({ initialEmployees, currentUser }: EmployeesClientProps) {
    // We use router.refresh() to update data from server, 
    // but we can also maintain local state for immediate feedback if we wanted.
    // For MVP, router.refresh + simple state is fine. 
    // Actually, initialEmployees is passed from server. To see updates, we need to refresh.

    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        nombre: '',
        cedula: '',
        cargoBase: 'Despostador',
        area: currentUser?.area && currentUser?.area !== 'Ambos' ? currentUser.area : 'Cerdo'
    })

    const resetForm = () => {
        setFormData({ nombre: '', cedula: '', cargoBase: 'Despostador', area: 'Cerdo' })
        setEditingEmployee(null)
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) resetForm()
    }

    const handleEdit = (emp: Employee) => {
        setEditingEmployee(emp)
        setFormData({
            nombre: emp.nombre,
            cedula: emp.cedula,
            cargoBase: emp.cargoBase,
            area: (emp as any).area || 'Cerdo'
        })
        setOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (editingEmployee) {
                await updateEmployee(editingEmployee.id, formData)
            } else {
                await createEmployee(formData)
            }
            setOpen(false)
            resetForm()
            router.refresh()
        } catch (error) {
            console.error(error)
            alert("Error al guardar")
        } finally {
            setLoading(false)
        }
    }

    const handleToggleActive = async (id: string, current: boolean) => {
        await toggleEmployeeStatus(id, !current)
        router.refresh()
    }

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Dialog open={open} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Colaborador
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingEmployee ? 'Editar Colaborador' : 'Nuevo Colaborador'}</DialogTitle>
                            <DialogDescription>
                                Ingrese los datos básicos del empleado.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="nombre" className="text-right">
                                    Nombre
                                </Label>
                                <Input
                                    id="nombre"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cedula" className="text-right">
                                    Cédula
                                </Label>
                                <Input
                                    id="cedula"
                                    value={formData.cedula}
                                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cargo" className="text-right">
                                    Cargo Base
                                </Label>
                                <Select
                                    value={formData.cargoBase}
                                    onValueChange={(val) => setFormData({ ...formData, cargoBase: val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Seleccione cargo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Coordinador">Coordinador</SelectItem>
                                        <SelectItem value="Despostador">Despostador</SelectItem>
                                        <SelectItem value="Polivalente">Polivalente</SelectItem>
                                        <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                                        <SelectItem value="Recogedor">Recogedor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="area" className="text-right">
                                    Área
                                </Label>
                                <Select
                                    value={formData.area}
                                    onValueChange={(val) => setFormData({ ...formData, area: val })}
                                    disabled={currentUser?.role === 'COORDINADOR' && currentUser?.area !== 'Ambos'}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Seleccione área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cerdo">Cerdo</SelectItem>
                                        <SelectItem value="Res">Res</SelectItem>
                                        <SelectItem value="Ambos">Ambos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Cédula</TableHead>
                            <TableHead>Cargo Base</TableHead>
                            <TableHead>Área</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialEmployees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No hay colaboradores registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialEmployees.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.nombre}</TableCell>
                                    <TableCell>{emp.cedula}</TableCell>
                                    <TableCell>{emp.cargoBase}</TableCell>
                                    <TableCell>{(emp as any).area || 'Cerdo'}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center">
                                            <Switch
                                                checked={emp.activo}
                                                onCheckedChange={() => handleToggleActive(emp.id, emp.activo)}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={async () => {
                                            if (confirm('¿Seguro que desea eliminar este colaborador de la base de datos?')) {
                                                const res = await deleteEmployee(emp.id)
                                                if (res.success) {
                                                    router.refresh()
                                                } else if (res.error === 'FK_CONSTRAINT') {
                                                    if (confirm('No se puede eliminar porque tiene historial. ¿Desea desactivarlo (eliminación lógica) en su lugar?')) {
                                                        handleToggleActive(emp.id, true)
                                                    }
                                                } else {
                                                    alert('Error al eliminar: ' + res.error)
                                                }
                                            }
                                        }}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
