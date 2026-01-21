import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateInstructions(dateString: string | null | undefined): string {
  if (!dateString) return "-";

  // Asumimos que dateString viene en formato YYYY-MM-DD o ISO
  const date = new Date(dateString);

  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) return dateString;

  // Ajustar zona horaria para evitar desfasaje por UTC si viene solo YYYY-MM-DD
  // Si la cadena tiene 10 caracteres (YYYY-MM-DD), agregamos T12:00:00 para asegurar mediodía
  const dateToFormat = dateString.length === 10 ? new Date(dateString + 'T12:00:00') : date;

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(dateToFormat);
}

/**
 * Valida un CUIT/CUIL de Argentina mediante el algoritmo de dígito verificador.
 * Opcionalmente valida que el DNI esté presente en el CUIT.
 */
export function isValidCUIT(cuit: string, dni?: string): boolean {
  if (!cuit) return true; // Opcional, permitimos vacío si el campo lo es

  // Limpiar caracteres no numéricos
  const cleanCUIT = cuit.replace(/\D/g, "");

  if (cleanCUIT.length !== 11) return false;

  // Si se proporciona un DNI, verificar que esté en el CUIT
  if (dni) {
    const cleanDNI = dni.replace(/\D/g, "");
    const dniInCUIT = cleanCUIT.substring(2, 10); // Posiciones 2-9 contienen el DNI
    if (dniInCUIT !== cleanDNI) {
      return false; // El DNI no coincide con el CUIT
    }
  }

  const digits = cleanCUIT.split("").map(Number);
  const verifier = digits[10];

  const coeff = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * coeff[i];
  }

  let calculatedVerifier = 11 - (sum % 11);
  if (calculatedVerifier === 11) calculatedVerifier = 0;
  if (calculatedVerifier === 10) calculatedVerifier = 9; // Aunque técnicamente se reinicia el prefijo, 9 es el fallback común

  return verifier === calculatedVerifier;
}
