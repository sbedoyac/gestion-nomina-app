'use server'

import { prisma } from '@/lib/prisma'
import { calculatePayroll, Role } from '@/lib/payroll-engine'
import { revalidatePath } from 'next/cache'
import { verifyPassword, login, logout, getSession, hashPassword } from '@/lib/auth'
import { redirect } from 'next/navigation'


// --- Authentication ---

export async function loginAction(formData: FormData) {
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    if (!username || !password) {
        return { success: false, error: 'Credenciales incompletas' }
    }

    const user = await prisma.user.findUnique({
        where: { username }
    })

    if (!user) {
        return { success: false, error: 'Usuario no encontrado' }
    }

    const valid = await verifyPassword(password, user.password)
    if (!valid) {
        return { success: false, error: 'Contraseña incorrecta' }
    }

    // Login successful
    const { password: _, ...userWithoutPassword } = user
    await login(userWithoutPassword)
    redirect('/daily')
}

export async function logoutAction() {
    await logout()
    redirect('/login')
}

export async function getCurrentSession() {
    return await getSession()
}

// --- Employees ---

export async function getEmployees() {
    const session = await getSession()
    if (!session) return [] // Or throw error

    const user = session.user
    const where: any = {}

    if (user.role === 'COORDINADOR' && user.area && user.area !== 'Ambos') {
        where.area = { in: [user.area, 'Ambos'] }
    }
    // Admin and Gestion Humana see all, Coordinator Ambos sees all

    return await prisma.employee.findMany({
        where,
        orderBy: { nombre: 'asc' },
    })
}

export async function createEmployee(data: { nombre: string; cedula: string; cargoBase: string; area: string }) {
    try {
        const emp = await prisma.employee.create({
            data: { ...data, activo: true },
        })
        revalidatePath('/employees')
        return { success: true, data: emp }
    } catch (error) {
        return { success: false, error: 'Error creating employee' }
    }
}

export async function updateEmployee(id: string, data: { nombre: string; cedula: string; cargoBase: string; area: string }) {
    await prisma.employee.update({
        where: { id },
        data,
    })
    revalidatePath('/employees')
    return { success: true }
}

export async function deleteEmployee(id: string) {
    try {
        await prisma.employee.delete({ where: { id } })
        revalidatePath('/employees')
        return { success: true }
    } catch (error: any) {
        if (error.code === 'P2003' || error.message.includes('constraint')) {
            return { success: false, error: 'FK_CONSTRAINT' }
        }
        return { success: false, error: error.message }
    }
}

export async function toggleEmployeeStatus(id: string, activo: boolean) {
    await prisma.employee.update({
        where: { id },
        data: { activo },
    })
    revalidatePath('/employees')
    return { success: true }
}

// --- Daily Operations ---

export async function getWorkDayByDate(date: Date) {
    // Ensure we search by start of day or exact date match depending on how we store it.
    // Ideally, 'date' passed here should be normalized to UTC midnight or ISO string YYYY-MM-DD.
    // For simplicity, let's assume strict equality if we handle timezones correctly or ignore time.
    // Better: search by range or normalized string.
    // Quick fix: Prisma stores DateTime. Let's rely on finding by unique date if exactly matched,
    // or use findFirst with range.
    // Since user input determines date, let's stick to "Start of Day" timestamp logic.

    // Actually, easiest is to just store normalized JS Date (set hours to 0,0,0,0).
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)

    const session = await getSession()
    const user = session?.user

    const day = await prisma.workDay.findUnique({
        where: { fecha: start },
        include: {
            assignments: true,
            production: true,
            payments: true
        }
    })

    if (!day) return null

    // RBAC Filtering for Daily View
    if (user && user.role === 'COORDINADOR' && user.area && user.area !== 'Ambos') {
        const area = user.area

        // Filter Production: Only show production for this area
        day.production = day.production.filter(p => p.productType === area)

        // Filter Assignments: Only show assignments for employees in this area (or assigned to this area's production?)
        // Actually, assignments have 'productType' (implied by role? No, productType added to DayAssignment?)
        // Schema: DayAssignment has productType default 'Cerdo'.
        // So filter by productType.
        day.assignments = day.assignments.filter(a => a.productType === area)

        // Filter Payments: Also by productType
        day.payments = day.payments.filter(p => p.productType === area)
    }

    return day;
}

export async function ensureWorkDay(date: Date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)

    let day = await prisma.workDay.findUnique({
        where: { fecha: start },
    })

    if (!day) {
        day = await prisma.workDay.create({
            data: { fecha: start },
        })
    }
    return day
}

export async function saveAssignments(workDayId: string, assignments: { employeeId: string; role: string; participated?: number }[], productType: string) {
    // Transaction: Delete existing for this day AND productType, then create new

    await prisma.dayAssignment.deleteMany({
        where: { workDayId, productType },
    })

    await prisma.dayAssignment.createMany({
        data: assignments.map(a => ({
            workDayId,
            employeeId: a.employeeId,
            cargoDia: a.role,
            productType,
            cerdosParticipados: a.participated
        })),
    })

    revalidatePath('/daily')
    return { success: true }
}

export async function saveProduction(workDayId: string, data: { pigs: number; deboneVal: number; pickerVal: number; includeCoord: boolean; productType: string }) {
    const existing = await prisma.productionDay.findUnique({
        where: {
            workDayId_productType: {
                workDayId,
                productType: data.productType
            }
        }
    })

    if (existing) {
        await prisma.productionDay.update({
            where: {
                workDayId_productType: {
                    workDayId,
                    productType: data.productType
                }
            },
            data: {
                cerdosDespostados: data.pigs,
                valorDesposte: data.deboneVal,
                valorRecogedor: data.pickerVal,
                incluirCoordinador: data.includeCoord,
                // productType is part of key, not updated usually, but in data it is same.
            },
        })
    } else {
        await prisma.productionDay.create({
            data: {
                workDayId,
                cerdosDespostados: data.pigs,
                valorDesposte: data.deboneVal,
                valorRecogedor: data.pickerVal,
                incluirCoordinador: data.includeCoord,
                productType: data.productType,
            },
        })
    }
    revalidatePath('/daily')
    return { success: true }
}


export async function calculatePaymentsAction(workDayId: string) {
    const session = await getSession()
    const user = session?.user

    const day = await prisma.workDay.findUnique({
        where: { id: workDayId },
        include: {
            assignments: true,
            production: true,
        }
    })

    if (!day || day.production.length === 0 || day.assignments.length === 0) {
        return { success: false, error: 'Datos incompletos o inexistentes' }
    }

    let results: any[] = []

    // Determine target areas (RBAC)
    let targetAreas = ['Cerdo', 'Res']
    if (user && user.role === 'COORDINADOR' && user.area && user.area !== 'Ambos') {
        targetAreas = [user.area]
    }

    for (const prod of day.production) {
        if (!targetAreas.includes(prod.productType)) continue;

        const assignments = day.assignments.filter(a => a.productType === prod.productType)

        if (assignments.length === 0 && prod.cerdosDespostados > 0) {
            // If production exists but no assignments? Maybe user forgot to assign.
            // But we should continue.
            continue
        }

        const payroll = calculatePayroll({
            pigsProcessed: prod.cerdosDespostados,
            deboneValuePerPig: prod.valorDesposte,
            pickerValuePerPig: prod.valorRecogedor,
            includeCoordinator: prod.incluirCoordinador,
            assignments: assignments.map(a => {
                // Map UI Role (Despostador Experto/General/Aprendiz) to Engine Role (Despostador/Aprendiz)
                let engineRole: Role = 'Despostador'; // Default fallback

                const r = a.cargoDia || '';
                if (r.includes('Coordinador')) engineRole = 'Coordinador';
                else if (r.includes('Aprendiz')) engineRole = 'Aprendiz'; // Despostador Aprendiz -> Aprendiz
                else if (r.includes('Recogedor')) engineRole = 'Recogedor'; // Recogedor Experto/General/Aprendiz -> Recogedor (Wait, Recogedor Aprendiz should be Recogedor or Aprendiz? Usually Recogedor uses pickerVal, so Recogedor role is key)
                else if (r.includes('Despostador')) engineRole = 'Despostador'; // Despostador Experto/General -> Despostador
                else if (r.includes('Polivalente')) engineRole = 'Polivalente';

                // Specific fix for "Recogedor Aprendiz" if they should be paid as Recogedor but maybe different share?
                // Engine handles: Recogedor -> share 1.0 (relative to picker pool). 
                // If "Recogedor Aprendiz" needs lower share in picker pool, engine change needed.
                // But for now, assuming all Recogedores share equally from Picker Pool.

                return {
                    employeeId: a.employeeId,
                    role: engineRole,
                    pigsParticipated: a.cerdosParticipados
                }
            })
        })

        // Save payments for this productType
        await prisma.payment.deleteMany({
            where: { workDayId, productType: prod.productType },
        })

        await prisma.payment.createMany({
            data: payroll.map(r => ({
                workDayId,
                employeeId: r.employeeId,
                cargoDia: r.role,
                productType: prod.productType,
                pagoCalculado: r.amount,
                detalle: JSON.stringify(r.details)
            }))
        })

        results = [...results, ...payroll]
    }

    revalidatePath('/daily')
    return { success: true, results }
}

// --- Admin ---

export async function getUsers() {
    return await prisma.user.findMany({
        orderBy: { username: 'asc' },
        select: { id: true, username: true, role: true, area: true, createdAt: true } // Exclude password
    })
}

export async function createUser(data: any) {
    const password = await hashPassword(data.password, 12)
    try {
        await prisma.user.create({
            data: {
                username: data.username,
                password,
                role: data.role,
                area: data.area
            }
        })
        revalidatePath('/admin')
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') return { success: false, error: 'Usuario ya existe' }
        return { success: false, error: 'Error al crear usuario' }
    }
}

export async function updateUserPassword(id: string, newPassword: string) {
    const password = await hashPassword(newPassword, 12)
    await prisma.user.update({
        where: { id },
        data: { password }
    })
    revalidatePath('/admin')
    return { success: true }
}

export async function deleteUser(id: string) {
    await prisma.user.delete({ where: { id } })
    revalidatePath('/admin')
    return { success: true }
}

// --- Reports ---

export async function getReports(startDate: Date, endDate: Date) {
    // Prisma query for range
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);

    return await prisma.workDay.findMany({
        where: {
            fecha: {
                gte: start,
                lte: end
            }
        },
        include: {
            production: true,
            assignments: true,
            payments: true
        },
        orderBy: { fecha: 'desc' }

    })
}

export async function getConsolidatedPayroll(startDate: Date, endDate: Date) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);

    // Fetch payments within range, including Employee data
    const payments = await prisma.payment.findMany({
        where: {
            workDay: {
                fecha: { gte: start, lte: end }
            }
        },
        include: {
            employee: true
        }
    });

    // Aggregate
    const aggMap = new Map<string, { employee: any, total: number }>();

    payments.forEach(p => {
        if (!aggMap.has(p.employeeId)) {
            aggMap.set(p.employeeId, { employee: p.employee, total: 0 });
        }
        aggMap.get(p.employeeId)!.total += p.pagoCalculado;
    });

    const list = Array.from(aggMap.values());

    // Sort by Role Priority then Name
    const rolePriority: Record<string, number> = {
        'Despostador': 1,
        'Polivalente': 2,
        'Aprendiz': 3,
        'Recogedor': 4,
        'Coordinador': 5 // User didn't specify where Coord goes, but usually top? 
        // User said: "Despostadores, Polivalentes, Aprendices, Recogedores".
        // I'll put Coordinator at top (0) or bottom? Let's put at top (0).
    };

    // Explicit request: "primero los despostadores". So Despostador=1.
    // What about Coordinator? Probably first or with Despostadores. 
    // I'll default Coordinator to 0 (top-most) or 1?
    // Let's assume Coordinator is not the main focus of the "grouping" request or sits with Despostadores.
    // I'll put Coordinator at 0.

    list.sort((a, b) => {
        const roleA = a.employee.cargoBase || '';
        const roleB = b.employee.cargoBase || '';

        const prioA = rolePriority[roleA] ?? 99;
        const prioB = rolePriority[roleB] ?? 99;

        if (prioA !== prioB) return prioA - prioB;
        return a.employee.nombre.localeCompare(b.employee.nombre);
    });

    return list;
}
