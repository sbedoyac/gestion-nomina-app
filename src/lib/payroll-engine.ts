export type Role = 'Coordinador' | 'Despostador' | 'Polivalente' | 'Aprendiz' | 'Recogedor';

export interface CalculationInput {
    pigsProcessed: number;
    deboneValuePerPig: number;
    pickerValuePerPig: number;
    includeCoordinator: boolean;
    assignments: {
        employeeId: string;
        role: Role;
        pigsParticipated?: number | null; // Null or 0 means ALL
    }[];
}

export interface PaymentResult {
    employeeId: string;
    role: Role;
    amount: number;
    details: {
        baseRate: number; // For display, maybe average or just last?
        units: number;
        debonePool: number; // Total value of pigs they participated in
        pickerPool: number;
        formula?: string;
    };
}

export function calculatePayroll(input: CalculationInput): PaymentResult[] {
    const { pigsProcessed, deboneValuePerPig, pickerValuePerPig, includeCoordinator, assignments } = input;

    // 1. Separate Pickers (Recogedores)
    // Assumption: Recogedores are paid based on TOTAL pigs, divided by pool.
    const pickers = assignments.filter(a => a.role === 'Recogedor');
    const deboningTeam = assignments.filter(a => a.role !== 'Recogedor');

    // Recogedores Logic
    const pickerPool = pigsProcessed * pickerValuePerPig;
    const pickerPayment = pickers.length > 0 ? Math.floor(pickerPool / pickers.length) : 0;

    const results: PaymentResult[] = [];

    pickers.forEach(p => {
        results.push({
            employeeId: p.employeeId,
            role: p.role,
            amount: pickerPayment,
            details: {
                baseRate: 0,
                units: 0,
                debonePool: 0,
                pickerPool,
                formula: `(${pigsProcessed} * ${pickerValuePerPig}) / ${pickers.length}`
            }
        });
    });

    // 2. Deboning Team - Segmented Calculation

    // Normalize participation
    const teamWithParticipation = deboningTeam.map(m => ({
        ...m,
        participation: (m.pigsParticipated && m.pigsParticipated > 0)
            ? Math.min(m.pigsParticipated, pigsProcessed)
            : pigsProcessed
    }));

    // Identify Cut Points [0, ..., pigsProcessed]
    const unsortedPoints = new Set([0]);
    teamWithParticipation.forEach(m => unsortedPoints.add(m.participation));
    // Ensure we include total if any gap exists? No, the segments are defined by participations.
    // Actually, if everyone stops at 200 but total is 420, the period 200-420 exists but has 0 units?
    // Yes. If max participation < pigsProcessed, that segment exists but pool remains undistributed?
    // Or implies no one worked that segment.

    if (Math.max(...Array.from(unsortedPoints)) < pigsProcessed) {
        unsortedPoints.add(pigsProcessed);
    }

    const cutPoints = Array.from(unsortedPoints).sort((a, b) => a - b);

    // Build Segments
    interface Segment {
        start: number;
        end: number;
        size: number;
    }
    const segments: Segment[] = [];
    for (let i = 0; i < cutPoints.length - 1; i++) {
        if (cutPoints[i + 1] > cutPoints[i]) {
            segments.push({
                start: cutPoints[i],
                end: cutPoints[i + 1],
                size: cutPoints[i + 1] - cutPoints[i]
            });
        }
    }

    // Accumulate Pay
    const payMap = new Map<string, { total: number, formulas: string[] }>();
    teamWithParticipation.forEach(m => payMap.set(m.employeeId, { total: 0, formulas: [] }));

    segments.forEach(seg => {
        // Who is active in this segment? (Participation >= seg.end)
        const activeMembers = teamWithParticipation.filter(m => m.participation >= seg.end);

        // Calculate Units (excluding Coordinator)
        let segmentUnits = 0;
        activeMembers.forEach(m => {
            switch (m.role) {
                case 'Despostador': segmentUnits += 1.0; break;
                case 'Polivalente': segmentUnits += 0.5; break;
                case 'Aprendiz': segmentUnits += 0.25; break;
                case 'Coordinador':
                    if (includeCoordinator) segmentUnits += 1.0;
                    break;
            }
        });

        // Segment Pool
        const segmentPool = seg.size * deboneValuePerPig;

        // Segment Base Rate
        const segmentBaseRate = segmentUnits > 0 ? segmentPool / segmentUnits : 0;

        // Distribute
        activeMembers.forEach(m => {
            let factor = 0;
            switch (m.role) {
                case 'Despostador': factor = 1.0; break;
                case 'Polivalente': factor = 0.5; break;
                case 'Aprendiz': factor = 0.25; break;
                case 'Coordinador': factor = includeCoordinator ? 1.0 : 0; break;
            }

            if (factor > 0) {
                const pay = segmentBaseRate * factor;
                const current = payMap.get(m.employeeId)!;
                current.total += pay;

                if (pay > 0 && activeMembers.length < 15) { // Only log concise formulas
                    current.formulas.push(`[${seg.start}-${seg.end}]: ${Math.floor(pay)}`);
                }
            }
        });
    });

    // Final Results
    teamWithParticipation.forEach(m => {
        const data = payMap.get(m.employeeId)!;
        let factor = 0;
        switch (m.role) {
            case 'Despostador': factor = 1.0; break;
            case 'Polivalente': factor = 0.5; break;
            case 'Aprendiz': factor = 0.25; break;
            case 'Coordinador': factor = 1.0; break;
        }

        results.push({
            employeeId: m.employeeId,
            role: m.role,
            amount: Math.floor(data.total),
            details: {
                baseRate: 0,
                units: factor,
                debonePool: m.participation * deboneValuePerPig,
                pickerPool: 0,
                formula: data.formulas.length > 0 ? data.formulas.join(' + ') : 'No participation'
            }
        });
    });

    return results;
}
