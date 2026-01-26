import { PrismaClient } from '@prisma/client';

// Declara una variable global para almacenar la instancia de Prisma.
// Esto es necesario para que la conexión se mantenga durante el hot-reloading en desarrollo.
declare global {
  var prisma: PrismaClient | undefined;
}

// Crea la instancia de Prisma Client, reutilizando la instancia existente en `globalThis` si existe.
// En producción, siempre se creará una nueva instancia.
export const prisma = globalThis.prisma || new PrismaClient();

// Almacena la instancia en la variable global solo en el entorno de desarrollo.
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
