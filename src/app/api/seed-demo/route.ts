import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePayroll, Role } from '@/lib/payroll-engine'

export async function GET() {
    try {
        // 1. Create Employees
        const roles: { role: Role, count: number }[] = [
            { role: 'Despostador', count: 6 },
            { role: 'Polivalente', count: 7 },
            { role: 'Aprendiz', count: 2 },
            { role: 'Recogedor', count: 4 },
            { role: 'Coordinador', count: 1 },
        ]

        const assignments = []

        // Clean slates
        // await prisma.dayAssignment.deleteMany()
        // await prisma.payment.deleteMany()
        // await prisma.productionDay.deleteMany()
        // await prisma.workDay.deleteMany()
        // await prisma.employee.deleteMany()

        for (const group of roles) {
            for (let i = 1; i <= group.count; i++) {
                const name = `${group.role} ${i}`
                const cedula = `DEMO-${group.role.substring(0, 3).toUpperCase()}-${i}`

                const emp = await prisma.employee.upsert({
                    where: { cedula },
                    update: {},
                    create: {
                        nombre: name,
                        cedula,
                        cargoBase: group.role,
                        activo: true
                    }
                })

                assignments.push({
                    employeeId: emp.id,
                    role: group.role
                })
            }
        }

        // 2. Create WorkDay 14/01/2026
        const date = new Date('2026-01-14T00:00:00') // Local time 00:00?
        // Be careful with timezone. storing "00:00" local.
        // I'll set date components to be safe.
        date.setFullYear(2026, 0, 14)
        date.setHours(0, 0, 0, 0)

        const workDay = await prisma.workDay.upsert({
            where: { fecha: date },
            update: {},
            create: { fecha: date }
        })

        // 3. Create Production
        const prodData = {
            cerdos: 420,
            valDe: 2000,
            valRe: 180,
            inclConst: false // Mode B
        }

        await prisma.productionDay.upsert({
            where: {
                workDayId_productType: {
                    workDayId: workDay.id,
                    productType: 'Cerdo'
                }
            },
            update: {
                cerdosDespostados: prodData.cerdos,
                valorDesposte: prodData.valDe,
                valorRecogedor: prodData.valRe,
                incluirCoordinador: prodData.inclConst
            },
            create: {
                workDayId: workDay.id,
                cerdosDespostados: prodData.cerdos,
                valorDesposte: prodData.valDe,
                valorRecogedor: prodData.valRe,
                incluirCoordinador: prodData.inclConst
            }
        })

        // 4. Assignments
        await prisma.dayAssignment.deleteMany({ where: { workDayId: workDay.id } })
        await prisma.dayAssignment.createMany({
            data: assignments.map(a => ({
                workDayId: workDay.id,
                employeeId: a.employeeId,
                cargoDia: a.role
            }))
        })

        // 5. Calculate
        const results = calculatePayroll({
            pigsProcessed: prodData.cerdos,
            deboneValuePerPig: prodData.valDe,
            pickerValuePerPig: prodData.valRe,
            includeCoordinator: prodData.inclConst,
            assignments
        })

        return NextResponse.json({
            config: prodData,
            expected: {
                bolsaDesposte: 840000,
                units: 10,
                pagoDespostador: 84000,
                pagoPolivalente: 42000,
                pagoAprendiz: 21000,
                bolsaRecogedor: 75600,
                pagoRecogedorInd: 18900
            },
            calculated: results.map(r => ({
                role: r.role,
                amount: r.amount,
                details: r.details
            }))
        })

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
