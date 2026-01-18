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
    // Elimina puntos, guiones y espacios. Devuelve solo números y letras mayúsculas.
    return id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function normalizeAddress(addr: string): string {
    // Misma lógica que TitleCase pero forzando palabras clave a mayúscula si es necesario
    return toTitleCase(addr);
}
