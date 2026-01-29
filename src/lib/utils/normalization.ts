
export function normalizeID(id: string | null | undefined): string | null {
    if (!id) return null;
    // Remove all non-alphanumeric characters
    const cleaned = id.replace(/[^a-zA-Z0-9]/g, '');
    return cleaned.length > 0 ? cleaned : null;
}

export function toTitleCase(str: string | null | undefined): string | null {
    if (!str) return null;
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Formatea un CUIT/CUIL al formato argentino estándar: XX-XXXXXXXX-X
 * Si el CUIT no tiene exactamente 11 dígitos, lo devuelve sin cambios.
 */
export function formatCUIT(cuit: string | null | undefined): string | null {
    if (!cuit) return null;

    // Limpiar caracteres no numéricos
    const clean = cuit.replace(/\D/g, "");

    // Si tiene menos de 11, devolvemos lo que hay (formateo parcial si es posible)
    if (clean.length < 11) {
        if (clean.length > 2 && clean.length <= 10) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
        if (clean.length > 10) return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
        return clean;
    }

    // Formatear estándar: XX-XXXXXXXX-X (tomando solo los primeros 11 si hubiera más)
    const fixed = clean.slice(0, 11);
    return `${fixed.slice(0, 2)}-${fixed.slice(2, 10)}-${fixed.slice(10)}`;
}

/**
 * Detects and formats surnames to uppercase. 
 * Heuristic: In Argentina, if there are 3+ words, usually the last 2 are surnames. 
 * If 2 words, the second is surname.
 */
export function formatPersonName(fullname: string | null | undefined): string {
    if (!fullname) return "";

    // Handle "SURNAME, Name" (Standardize to "Name SURNAME")
    if (fullname.includes(",")) {
        const [last, ...firstParts] = fullname.split(",").map(s => s.trim());
        return `${firstParts.join(" ")} ${last.toUpperCase()}`;
    }

    const parts = fullname.trim().split(/\s+/);
    if (parts.length >= 2) {
        const last = parts.pop()!.toUpperCase();
        return `${parts.join(" ")} ${last}`;
    }

    return fullname.toUpperCase();
}

export function isLegalEntity(persona: any): boolean {
    if (!persona) return false;
    if (persona.tipo_persona === 'JURIDICA') return true;

    const cuit = (persona.cuit_cuil || persona.cuit)?.toString().replace(/\D/g, '') || '';
    // Argentinian CUIT/CUIL prefixes for legal entities: 30, 33, 34
    return ['30', '33', '34'].some(prefix => cuit.startsWith(prefix));
}

export function getCuitLabel(tipo: 'CUIT' | 'CUIL' | string | null | undefined, isFormal: boolean = true): string {
    const t = (tipo || 'CUIT').toUpperCase();
    if (isFormal) {
        return t === 'CUIL' ? 'C.U.I.L.' : 'C.U.I.T.';
    }
    return t;
}
