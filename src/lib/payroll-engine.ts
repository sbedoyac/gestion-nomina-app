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

    // 1. Separate Groups
    const pickers = assignments.filter(a => a.role === 'Recogedor');
    const deboningTeam = assignments.filter(a => a.role !== 'Recogedor');

    // 2. Calculate Pay for Each Group
    const deboningResults = calculateSegmentedPay(deboningTeam, pigsProcessed, deboneValuePerPig, includeCoordinator, 'debone');
    const pickerResults = calculateSegmentedPay(pickers, pigsProcessed, pickerValuePerPig, false, 'picker');

    return [...deboningResults, ...pickerResults];
}

function calculateSegmentedPay(
    team: CalculationInput['assignments'],
    totalUnits: number,
    valuePerUnit: number,
    includeCoordinator: boolean,
    poolType: 'debone' | 'picker'
): PaymentResult[] {

    // Normalize participation
    const teamWithParticipation = team.map(m => ({
        ...m,
        participation: (m.pigsParticipated && m.pigsParticipated > 0)
            ? Math.min(m.pigsParticipated, totalUnits)
            : totalUnits
    }));

    // Identify Cut Points [0, ..., totalUnits]
    const unsortedPoints = new Set([0]);
    teamWithParticipation.forEach(m => unsortedPoints.add(m.participation));

    if (Math.max(...Array.from(unsortedPoints)) < totalUnits) {
        unsortedPoints.add(totalUnits);
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

        if (activeMembers.length === 0) return;

        // Calculate Units
        let segmentUnits = 0;
        activeMembers.forEach(m => {
            if (poolType === 'picker') {
                // Pickers are all 1.0 share relative to each other
                segmentUnits += 1.0;
            } else {
                switch (m.role) {
                    case 'Despostador': segmentUnits += 1.0; break;
                    case 'Polivalente': segmentUnits += 0.5; break;
                    case 'Aprendiz': segmentUnits += 0.25; break;
                    // Coordinator excluded from DIVISOR in Bonus Mode
                    case 'Coordinador': break;
                }
            }
        });

        // Segment Pool
        const segmentPool = seg.size * valuePerUnit;

        // Segment Base Rate
        const segmentBaseRate = segmentUnits > 0 ? segmentPool / segmentUnits : 0;

        // Distribute
        activeMembers.forEach(m => {
            let factor = 0;
            if (poolType === 'picker') {
                factor = 1.0;
            } else {
                switch (m.role) {
                    case 'Despostador': factor = 1.0; break;
                    case 'Polivalente': factor = 0.5; break;
                    case 'Aprendiz': factor = 0.25; break;
                    // Coordinator included in PAYMENT in Bonus Mode
                    case 'Coordinador': factor = includeCoordinator ? 1.0 : 0; break;
                }
            }

            if (factor > 0) {
                const pay = segmentBaseRate * factor;
                const current = payMap.get(m.employeeId)!;
                current.total += pay;

                if (pay > 0 && activeMembers.length < 15) {
                    current.formulas.push(`[${seg.start}-${seg.end}]: ${Math.floor(pay)}`);
                }
            }
        });
    });

    // Final Results
    return teamWithParticipation.map(m => {
        const data = payMap.get(m.employeeId)!;
        let factor = 0;
        if (poolType === 'picker') {
            factor = 1.0;
        } else {
            switch (m.role) {
                case 'Despostador': factor = 1.0; break;
                case 'Polivalente': factor = 0.5; break;
                case 'Aprendiz': factor = 0.25; break;
                case 'Coordinador': factor = 1.0; break;
            }
        }

        return {
            employeeId: m.employeeId,
            role: m.role,
            amount: Math.floor(data.total),
            details: {
                baseRate: 0,
                units: factor,
                debonePool: poolType === 'debone' ? m.participation * valuePerUnit : 0,
                pickerPool: poolType === 'picker' ? m.participation * valuePerUnit : 0,
                formula: data.formulas.length > 0 ? data.formulas.join(' + ') : 'No participation'
            }
        };
    });
}
