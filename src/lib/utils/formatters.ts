/**
 * Notary Style Formatters
 * Implements strict Argentine notary rules for document generation.
 */

const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const DECENAS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const DECENAS_COMP = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

export function numberToSpanishText(n: number): string {
    if (n === 0) return 'cero';
    if (n < 0) return 'menos ' + numberToSpanishText(Math.abs(n));

    let res = '';

    if (n >= 1000000) {
        const millions = Math.floor(n / 1000000);
        res += (millions === 1 ? 'un millón' : numberToSpanishText(millions) + ' millones') + ' ';
        n %= 1000000;
    }

    if (n >= 1000) {
        const thousands = Math.floor(n / 1000);
        res += (thousands === 1 ? 'mil' : numberToSpanishText(thousands) + ' mil') + ' ';
        n %= 1000;
    }

    if (n >= 100) {
        if (n === 100) {
            res += 'cien';
        } else {
            const h = Math.floor(n / 100);
            res += (h === 1 ? 'ciento' : CENTENAS[h]) + ' ';
        }
        n %= 100;
    }

    if (n >= 20) {
        const d = Math.floor(n / 10);
        const u = n % 10;
        if (d === 2 && u > 0) {
            res += 'veinti' + UNIDADES[u];
        } else {
            res += DECENAS_COMP[d];
            if (u > 0) res += ' y ' + UNIDADES[u];
        }
    } else if (n >= 10) {
        res += DECENAS[n - 10];
    } else if (n > 0) {
        res += UNIDADES[n];
    }

    return res.trim().toUpperCase();
}

/**
 * Formats money according to notary standards: TEXT (SYMBOL NUMBER)
 * Example: CIENTO CINCUENTA MIL DÓLARES ESTADOUNIDENSES (U$S 150.000,00)
 */
export function formatNotaryMoney(amount: number, currency: string = 'USD'): string {
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let text = numberToSpanishText(integerPart);

    const currencyName = currency === 'USD' ? 'DÓLARES ESTADOUNIDENSES' : 'PESOS';
    const symbol = currency === 'USD' ? 'U$S' : '$';

    if (decimalPart > 0) {
        text += ` CON ${numberToSpanishText(decimalPart)} CENTAVOS`;
    }

    const formattedNumber = new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);

    return `${currencyName} ${text} (${symbol} ${formattedNumber})`;
}

/**
 * Formats a date to full Spanish text.
 * Example: 2026-01-23 -> "veintitrés de enero de dos mil veintiséis"
 */
export function formatNotaryDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate() + 1; // Correction for UTC
    const year = date.getFullYear();
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const month = months[date.getMonth()];

    return `${numberToSpanishText(day).toLowerCase()} de ${month} de ${numberToSpanishText(year).toLowerCase()}`;
}

export function formatNotaryName(name: string): string {
    if (!name) return "";
    const parts = name.trim().split(' ');
    const lastName = parts[parts.length - 1].toUpperCase();
    const firstNames = parts.slice(0, -1).map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ');
    return `${lastName}, ${firstNames}`;
}
