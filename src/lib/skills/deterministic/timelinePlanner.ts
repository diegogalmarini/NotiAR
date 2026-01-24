/**
 * Deterministic Timeline Planner for Notary Documents
 * Based on notary-timeline-planner skill.
 */

export interface TimelineTask {
    action: string;
    deadline: string; // YYYY-MM-DD
    daysBeforeSigning: number;
    status: 'ON_TIME' | 'LATE';
}

export interface TimelinePlan {
    targetSigningDate: string;
    feasibility: 'OK' | 'CRITICAL_RISK';
    tasks: TimelineTask[];
    alerts: string[];
}

const PROCESSING_TIMES: Record<string, Record<string, number>> = {
    "PBA": {
        "DOMINIO_SIMPLE": 20,
        "DOMINIO_URGENTE": 7,
        "INHIBICION_SIMPLE": 20,
        "INHIBICION_URGENTE": 7,
        "CATASTRO": 15,
        "MUNICIPAL": 10
    }
};

export function planTimeline(targetDateStr: string, jurisdiction: string = "PBA", mode: "SIMPLE" | "URGENTE" = "SIMPLE"): TimelinePlan {
    const targetDate = new Date(targetDateStr);
    const today = new Date();
    const safetyBuffer = 3;

    const plan: TimelinePlan = {
        targetSigningDate: targetDateStr,
        feasibility: 'OK',
        tasks: [],
        alerts: []
    };

    const requirements = ["DOMINIO", "INHIBICION", "CATASTRO", "MUNICIPAL"];

    for (const req of requirements) {
        let lookupKey = req;
        if (req === "DOMINIO" || req === "INHIBICION") {
            lookupKey = `${req}_${mode}`;
        }

        const daysNeeded = PROCESSING_TIMES[jurisdiction]?.[lookupKey] || 15;
        const totalLeadTime = daysNeeded + safetyBuffer;

        const deadlineDate = new Date(targetDate);
        deadlineDate.setDate(deadlineDate.getDate() - totalLeadTime);

        let status: 'ON_TIME' | 'LATE' = 'ON_TIME';
        if (deadlineDate < today) {
            status = 'LATE';
            plan.feasibility = 'CRITICAL_RISK';
            plan.alerts.push(`Imposible llegar con ${req} en modo ${mode}. Sugerencia: mueva la fecha de firma.`);
        }

        plan.tasks.push({
            action: `Solicitar ${req} (${mode})`,
            deadline: deadlineDate.toISOString().split('T')[0],
            daysBeforeSigning: totalLeadTime,
            status
        });
    }

    // Sort tasks by deadline
    plan.tasks.sort((a, b) => a.deadline.localeCompare(b.deadline));

    return plan;
}
