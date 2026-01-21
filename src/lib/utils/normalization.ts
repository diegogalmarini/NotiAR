export function toTitleCase(str: string): string {
    if (!str) return "";
    const lower = str.toLowerCase().trim();
    const exceptions = ["de", "del", "la", "las", "los", "y", "e"];

    return lower.split(' ').map((word, index) => {
        // Si es una excepción y no es la primera palabra, dejar en minúscula
        if (exceptions.includes(word) && index !== 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

export function normalizeID(id: string): string {
    if (!id) return "";
    // Elimina puntos, guiones, espacios y letras. Devuelve solo números.
    return id.toString().replace(/[^0-9]/g, "");
}

export function normalizeAddress(addr: string): string {
    // Misma lógica que TitleCase pero forzando palabras clave a mayúscula si es necesario
    return toTitleCase(addr);
}

/**
 * Valida un número de CUIT/CUIL argentino
 * Formato: XX-XXXXXXXX-X (11 dígitos en total)
 * @param cuit - El CUIT/CUIL a validar (con o sin guiones)
 * @returns true si el CUIT es válido, false en caso contrario
 */
export function validateCUIT(cuit: string): boolean {
    if (!cuit) return false;

    // Remover guiones y espacios
    const cleaned = cuit.replace(/[-\s]/g, '');

    // Verificar que tenga 11 dígitos
    if (!/^\d{11}$/.test(cleaned)) return false;

    // Extraer dígitos
    const digits = cleaned.split('').map(Number);
    const checkDigit = digits[10];

    // Multiplicadores para el algoritmo
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

    // Calcular suma
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += digits[i] * multipliers[i];
    }

    // Calcular dígito verificador
    let verifier = 11 - (sum % 11);
    if (verifier === 11) verifier = 0;
    if (verifier === 10) verifier = 9;

    return verifier === checkDigit;
}

/**
 * Formatea un CUIT/CUIL al formato estándar XX-XXXXXXXX-X
 * @param cuit - El CUIT/CUIL a formatear
 * @returns El CUIT formateado o la cadena original si no es válido
 */
export function formatCUIT(cuit: string): string {
    if (!cuit) return "";

    const cleaned = cuit.replace(/[-\s]/g, '');

    if (cleaned.length !== 11) return cuit;

    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10)}`;
}
