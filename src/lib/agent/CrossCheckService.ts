/**
 * CrossCheckService
 * 
 * Logic to triangulate data from multiple sources:
 * 1. OFFICIAL_API (e.g. AFIP/RENAPER)
 * 2. DOCUMENT_EXTRACT (IA extraction from deeds/DNI)
 * 3. MANUAL_INPUT (User-provided data)
 */

export enum ValidationState {
    MATCH_TOTAL = "MATCH_TOTAL",           // All sources align
    REVIEW_REQUIRED = "REVIEW_REQUIRED",   // Minor differences (accents, typos)
    CRITICAL_DISCREPANCY = "CRITICAL_DISCREPANCY" // Major mismatches (IDs, roles)
}

export interface CrossCheckField {
    official?: any;
    extracted?: any;
    manual?: any;
}

export interface CrossCheckResult {
    state: ValidationState;
    details: Record<string, {
        match: boolean;
        severity: 'LOW' | 'HIGH';
        message: string;
    }>;
}

export class CrossCheckService {

    /**
     * Levenshtein distance for fuzzy name matching
     */
    private static getLevenshteinDistance(a: string, b: string): number {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    private static normalize(str: string): string {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .trim();
    }

    /**
     * Validates identity data across sources
     */
    public static validateIdentity(fields: Record<string, CrossCheckField>): CrossCheckResult {
        const details: Record<string, any> = {};
        let overallState = ValidationState.MATCH_TOTAL;

        for (const [key, values] of Object.entries(fields)) {
            const { official, extracted, manual } = values;

            // 1. Strict Check for IDs (DNI, CUIT)
            if (key.includes('dni') || key.includes('cuit')) {
                const offStr = official?.toString().replace(/\D/g, '');
                const extStr = extracted?.toString().replace(/\D/g, '');
                const manStr = manual?.toString().replace(/\D/g, '');

                const mismatch = (offStr && extStr && offStr !== extStr) || (offStr && manStr && offStr !== manStr);

                if (mismatch) {
                    details[key] = {
                        match: false,
                        severity: 'HIGH',
                        message: `Discrepancia CRÍTICA en ${key.toUpperCase()}. El dato oficial manda.`
                    };
                    overallState = ValidationState.CRITICAL_DISCREPANCY;
                } else {
                    details[key] = { match: true, severity: 'LOW', message: "Coincidencia exacta." };
                }
                continue;
            }

            // 2. Fuzzy Check for Names
            if (key.includes('nombre')) {
                const offNorm = this.normalize(official || "");
                const extNorm = this.normalize(extracted || "");
                const manNorm = this.normalize(manual || "");

                // If any source is missing, we cannot validade, so we skip or mark as review if partial
                if (!offNorm || (!extNorm && !manNorm)) {
                    details[key] = { match: true, severity: 'LOW', message: "Datos insuficientes para validar." };
                    continue;
                }

                const distExt = extNorm ? this.getLevenshteinDistance(offNorm, extNorm) : 0;
                const distMan = manNorm ? this.getLevenshteinDistance(offNorm, manNorm) : 0;

                // Only penalize if the distance is high AND the value exists
                const failExt = extNorm && distExt > 5;
                const failMan = manNorm && distMan > 5;

                if (failExt || failMan) {
                    details[key] = {
                        match: false,
                        severity: 'HIGH',
                        message: `Diferencia significativa en NOMBRE. Verificar identidad.`
                    };
                    overallState = ValidationState.CRITICAL_DISCREPANCY;
                } else if (distExt > 0 || distMan > 0) {
                    details[key] = {
                        match: false,
                        severity: 'LOW',
                        message: `Diferencias leves (acentos/tipo) en NOMBRE.`
                    };
                    if (overallState !== ValidationState.CRITICAL_DISCREPANCY) {
                        overallState = ValidationState.REVIEW_REQUIRED;
                    }
                } else {
                    details[key] = { match: true, severity: 'LOW', message: "Coincidencia de nombre." };
                }
                continue;
            }
        }

        return { state: overallState, details };
    }
}
