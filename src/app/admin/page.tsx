
'use client'

import { useState, useEffect } from 'react'
import { getUsers, createUser, deleteUser, updateUserPassword } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash, RefreshCcw } from 'lucide-react'

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        role: 'COORDINADOR',
        area: 'Cerdo'
    })
    const [resetPwd, setResetPwd] = useState({ userId: '', password: '' })
    const [isResetOpen, setIsResetOpen] = useState(false)

    async function loadUsers() {
        setLoading(true)
        const data = await getUsers()
        setUsers(data)
        setLoading(false)
    }

    useEffect(() => {
        loadUsers()
    }, [])

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const res = await createUser(newUser)
        if (res.success) {
            setNewUser({ username: '', password: '', role: 'COORDINADOR', area: 'Cerdo' })
            loadUsers()
        } else {
            alert(res.error)
        }
        setLoading(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Seguro que desea eliminar este usuario?')) return
        setLoading(true)
        await deleteUser(id)
        loadUsers()
    }

    async function handleResetPassword() {
        if (!resetPwd.password) return
        setLoading(true)
        await updateUserPassword(resetPwd.userId, resetPwd.password)
        setIsResetOpen(false)
        setResetPwd({ userId: '', password: '' })
        alert('Contraseña actualizada')
        setLoading(false)
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <h1 className="text-3xl font-bold">Administración de Usuarios</h1>

            {/* Create User Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Crear Nuevo Usuario</CardTitle>
                    <CardDescription>Registre nuevos usuarios y asigne sus permisos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Usuario</Label>
                            <Input
                                value={newUser.username}
                                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Contraseña</Label>
                            <Input
                                type="password"
                                value={newUser.password}
                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Rol</Label>
                            <Select
                                value={newUser.role}
                                onValueChange={val => setNewUser({ ...newUser, role: val })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Administrador</SelectItem>
                                    <SelectItem value="COORDINADOR">Coordinador</SelectItem>
                                    <SelectItem value="GESTION_HUMANA">Gestión Humana</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Área (Solo Coordinadores)</Label>
                            <Select
                                value={newUser.area}
                                onValueChange={val => setNewUser({ ...newUser, area: val })}
                                disabled={newUser.role !== 'COORDINADOR'}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cerdo">Cerdo</SelectItem>
                                    <SelectItem value="Res">Res</SelectItem>
                                    <SelectItem value="Ambos">Ambos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" disabled={loading}>Crear Usuario</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Users List */}
            <Card>
                <CardHeader>
                    <CardTitle>Usuarios Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Área</TableHead>
                                <TableHead>Creado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell>{user.area || '-'}</TableCell>
                                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right space-x-2">

                                        <Dialog open={isResetOpen && resetPwd.userId === user.id} onOpenChange={(open) => {
                                            setIsResetOpen(open)
                                            if (!open) setResetPwd({ userId: '', password: '' })
                                            else setResetPwd({ userId: user.id, password: '' })
                                        }}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="icon">
                                                    <RefreshCcw className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Cambiar Contraseña para {user.username}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Nueva Contraseña</Label>
                                                        <Input
                                                            type="password"
                                                            value={resetPwd.password}
                                                            onChange={e => setResetPwd({ ...resetPwd, password: e.target.value })}
                                                        />
                                                    </div>
                                                    <Button onClick={handleResetPassword} disabled={loading || !resetPwd.password}>
                                                        Guardar
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => handleDelete(user.id)}
                                            disabled={loading || user.username === 'admin'}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
