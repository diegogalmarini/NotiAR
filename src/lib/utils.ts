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
