/**
 * Deterministic Tax Calculator for Argentine Notary Operations (PBA focus)
 * Based on notary-tax-calculator skill.
 */

export interface TaxCalculationInput {
    price: number;
    currency: 'USD' | 'ARS' | 'UVA';
    exchangeRate: number; // For USD this is the dollar rate, for UVA it's the UVA rate
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
    totalExpensesUva?: number;
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

    // Calculo de Base Imponible en ARS
    let priceArs = price;
    if (currency === 'USD') {
        priceArs = price * exchangeRate;
    } else if (currency === 'UVA') {
        priceArs = price * exchangeRate; // Aquí exchangeRate es el valor de la UVA
    }

    const baseSellos = Math.max(priceArs, fiscalValuation);

    // 1. Impuesto de Sellos (PBA - 2% para hipotecas también, aunque hay exenciones según monto/vivienda social)
    // NOTA: Para este upgrade mantenemos la lógica de 2% pero con base UVA convertida.
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

    // 2. ITI (1.5%) - Aplica si se adquirió antes de 2018 (Generalmente compraventas, pero lo mantenemos)
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
        totalExpensesUsd: currency === 'USD' ? Math.round((totalArs / exchangeRate) * 100) / 100 : undefined,
        totalExpensesUva: currency === 'UVA' ? Math.round((totalArs / exchangeRate) * 100) / 100 : undefined
    };
}
