import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const count = await prisma.employee.count()
    console.log('Employee count:', count)
    if (count === 0) {
      console.log('Seeding...')
      await prisma.employee.createMany({
        data: [
          { nombre: 'Juan Perez', cedula: '123', cargoBase: 'Despostador' },
          { nombre: 'Maria Lopez', cedula: '456', cargoBase: 'Recogedor' },
          { nombre: 'Carlos Ruiz', cedula: '789', cargoBase: 'Coordinador' },
          { nombre: 'Ana Gomez', cedula: '101', cargoBase: 'Polivalente' },
        ]
      })
      console.log('Seeded 4 employees.')
    }
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}
main()
