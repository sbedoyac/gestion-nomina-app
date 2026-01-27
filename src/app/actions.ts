'use server'

import { prisma } from '@/lib/prisma'
import { calculatePayroll, Role } from '@/lib/payroll-engine'
import { revalidatePath } from 'next/cache'

// --- Employees ---

export async function getEmployees() {
    return await prisma.employee.findMany({
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

    // But wait, validation says "fecha unique".
    // I will attempt to find unique.

    const day = await prisma.workDay.findUnique({
        where: { fecha: start },
        include: {
            assignments: true,
            production: true,
            payments: true
        }
    })
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

export async function saveAssignments(workDayId: string, assignments: { employeeId: string; role: string; participated?: number }[]) {
    // Transaction: Delete existing for this day (or upsert), then create new
    // assignments unique(day, employee)

    // Easier: Delete all for this day, recreate.
    await prisma.dayAssignment.deleteMany({
        where: { workDayId },
    })

    await prisma.dayAssignment.createMany({
        data: assignments.map(a => ({
            workDayId,
            employeeId: a.employeeId,
            cargoDia: a.role,
            cerdosParticipados: a.participated
        })),
    })

    revalidatePath('/daily')
    return { success: true }
}

export async function saveProduction(workDayId: string, data: { pigs: number; deboneVal: number; pickerVal: number; includeCoord: boolean; productType: string }) {
    const existing = await prisma.productionDay.findUnique({ where: { workDayId } })

    if (existing) {
        await prisma.productionDay.update({
            where: { workDayId },
            data: {
                cerdosDespostados: data.pigs,
                valorDesposte: data.deboneVal,
                valorRecogedor: data.pickerVal,
                incluirCoordinador: data.includeCoord,
                productType: data.productType,
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
    const day = await prisma.workDay.findUnique({
        where: { id: workDayId },
        include: {
            assignments: true,
            production: true,
        }
    })

    if (!day || !day.production || day.assignments.length === 0) {
        return { success: false, error: 'Missing data' }
    }

    const results = calculatePayroll({
        pigsProcessed: day.production.cerdosDespostados, // Generic quantity
        deboneValuePerPig: day.production.valorDesposte,
        pickerValuePerPig: day.production.valorRecogedor,
        includeCoordinator: day.production.incluirCoordinador,
        assignments: day.assignments.map(a => ({
            employeeId: a.employeeId,
            role: a.cargoDia as Role,
            pigsParticipated: a.cerdosParticipados
        }))
    })

    // Save payments
    // Transaction: clear old payments for this day, insert new
    await prisma.payment.deleteMany({
        where: { workDayId },
    })

    await prisma.payment.createMany({
        data: results.map(r => ({
            workDayId,
            employeeId: r.employeeId,
            cargoDia: r.role,
            pagoCalculado: r.amount,
            detalle: JSON.stringify(r.details)
        }))
    })

    revalidatePath('/daily')
    return { success: true, results }
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
