
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting data reset...')

    // Delete in order of dependency (Foreign Keys)

    console.log('Deleting Payments...')
    await prisma.payment.deleteMany({})

    console.log('Deleting Assignments...')
    await prisma.dayAssignment.deleteMany({})

    console.log('Deleting Production Data...')
    await prisma.productionDay.deleteMany({})

    console.log('Deleting Work Days...')
    await prisma.workDay.deleteMany({})

    console.log('✅ Daily operation data reset successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
