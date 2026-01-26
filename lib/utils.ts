
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Función para combinar clases de Tailwind de forma segura
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para formatear fechas
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'Fecha no disponible';
  try {
    const date = new Date(dateString);
    // Previene fechas inválidas
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    // Formato amigable: DD/MM/AAAA
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC' // Asegura consistencia independientemente del servidor/cliente
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Fecha errónea';
  }
};

