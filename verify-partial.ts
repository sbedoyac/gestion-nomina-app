import { calculatePayroll, Role } from '@/lib/payroll-engine'

// Test Case:
// Pigs: 420
// Despostador A (Full): 420
// Despostador B (Partial): 200
// ValDebone: 2000
// ValPicker: 180 (irrelevant for this check)
// Coordinator: Included? Let's check both. 
// For now, let's verify Segment Logic.

// Segments: 
// 0-200 (Size 200). Active: A, B. Units: 2. Pool: 200*2000 = 400,000. Each gets 200,000.
// 200-420 (Size 220). Active: A. Units: 1. Pool: 220*2000 = 440,000. A gets 440,000.
// Totals:
// A: 200,000 + 440,000 = 640,000.
// B: 200,000.

const input = {
    pigsProcessed: 420,
    deboneValuePerPig: 2000,
    pickerValuePerPig: 180,
    includeCoordinator: false,
    assignments: [
        { employeeId: 'A', role: 'Despostador' as Role, pigsParticipated: 420 },
        { employeeId: 'B', role: 'Despostador' as Role, pigsParticipated: 200 },
    ]
}

const results = calculatePayroll(input)

console.log(JSON.stringify(results, null, 2))

// Test Coordinator
const inputCoord = {
    pigsProcessed: 420,
    deboneValuePerPig: 2000,
    pickerValuePerPig: 180,
    includeCoordinator: true,
    assignments: [
        { employeeId: 'D1', role: 'Despostador' as Role, pigsParticipated: 420 },
        { employeeId: 'Coord', role: 'Coordinador' as Role, pigsParticipated: 420 },
    ]
}
// Expected:
// Base rate calculated on Despostador only (1 unit).
// Pool = 840,000. Base Rate = 840,000.
// Despostador gets 840,000.
// Coordinator gets 840,000 (1.0 factor).

const resultsCoord = calculatePayroll(inputCoord)
console.log('--- Coordinator ---')
console.log(JSON.stringify(resultsCoord, null, 2))
