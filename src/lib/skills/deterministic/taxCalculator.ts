/**
 * Deterministic Tax Calculator for Argentine Notary Operations (PBA focus)
 * Based on notary-tax-calculator skill.
 */

export interface TaxCalculationInput {
    price: number;
    currency: 'USD' | 'ARS';
    exchangeRate: number;
    acquisitionDate: string; // YYYY-MM-DD
    isUniqueHome: boolean;
    fiscalValuation: number;
    sellosExemptionThreshold?: number; // Tope Ley Impositiva
}

export interface TaxCalculationResult {
    baseCalculoArs: number;
    detail: {
        sellosPba: number;
        itiAfip: number;
        honorarios: number;
        iva21: number;
        aportesNotariales: number;
    };
    totalExpensesArs: number;
    totalExpensesUsd?: number;
}

export function calculateNotaryExpenses(input: TaxCalculationInput): TaxCalculationResult {
    const {
        price,
        currency,
        exchangeRate,
        acquisitionDate,
        isUniqueHome,
        fiscalValuation,
        sellosExemptionThreshold = 90000000 // Default or dynamic
    } = input;

    const priceArs = currency === 'USD' ? price * exchangeRate : price;
    const baseSellos = Math.max(priceArs, fiscalValuation);

    // 1. Impuesto de Sellos (PBA - 2%)
    let sellosPba = 0;
    const tasaSellos = 0.02;

    if (isUniqueHome) {
        if (baseSellos > sellosExemptionThreshold) {
            sellosPba = (baseSellos - sellosExemptionThreshold) * tasaSellos;
        } else {
            sellosPba = 0;
        }
    } else {
        sellosPba = baseSellos * tasaSellos;
    }

    // 2. ITI (1.5%) - Aplica si se adquirió antes de 2018
    let itiAfip = 0;
    const isPre2018 = new Date(acquisitionDate) < new Date('2018-01-01');
    if (isPre2018) {
        itiAfip = priceArs * 0.015;
    }

    // 3. Honorarios (2% suggested)
    const honorarios = priceArs * 0.02;
    const iva21 = honorarios * 0.21;

    // 4. Aportes (Approx 15% of Fees)
    const aportesNotariales = honorarios * 0.15;

    const totalArs = sellosPba + itiAfip + honorarios + iva21 + aportesNotariales;

    return {
        baseCalculoArs: baseSellos,
        detail: {
            sellosPba: Math.round(sellosPba * 100) / 100,
            itiAfip: Math.round(itiAfip * 100) / 100,
            honorarios: Math.round(honorarios * 100) / 100,
            iva21: Math.round(iva21 * 100) / 100,
            aportesNotariales: Math.round(aportesNotariales * 100) / 100
        },
        totalExpensesArs: Math.round(totalArs * 100) / 100,
        totalExpensesUsd: currency === 'USD' ? Math.round((totalArs / exchangeRate) * 100) / 100 : undefined
    };
}
