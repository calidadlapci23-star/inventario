
import { PrismaClient, Frecuencia } from '@prisma/client';

const prisma = new PrismaClient();

const equipos = [
  {
    id: 'bs240',
    nombre: 'BS-240 Pro',
    descripcion: 'Analizador de química clínica automatizado de Mindray',
    modelo: 'BS-240 Pro',
    serie: 'MINDRAY-SN-001',
    fechaInicio: new Date('2023-01-15'),
  },
  {
    id: 'abxpentra',
    nombre: 'ABX Pentra',
    descripcion: 'Contador hematológico automatizado de Horiba',
    modelo: 'Pentra 120',
    serie: 'HORIBA-SN-002',
    fechaInicio: new Date('2022-11-20'),
  },
  {
    id: 'ARCHITECT',
    nombre: 'Architect c4000',
    descripcion: 'Analizador de inmunoensayo y química clínica de Abbott',
    modelo: 'c4000',
    serie: 'ABBOTT-SN-003',
    fechaInicio: new Date('2023-05-10'),
  },
  {
    id: 'STAGO',
    nombre: 'Stago STA Compact Max',
    descripcion: 'Analizador de coagulación automatizado de Stago',
    modelo: 'STA Compact Max',
    serie: 'STAGO-SN-004',
    fechaInicio: new Date('2023-03-25'),
  },
];

const tareas = [
  // --- Tareas para BS-240 Pro ---
  { equipoId: 'bs240', descripcion: 'Verificar pipeta/mezclador/hueco de limpieza', frecuencia: Frecuencia.DIARIO },
  { equipoId: 'bs240', descripcion: 'Verificar conexión y llenado del depósito de solución limpiadora diluida', frecuencia: Frecuencia.DIARIO },
  { equipoId: 'bs240', descripcion: 'Verificar conector de residuos y vaciado de contenedor de desechos', frecuencia: Frecuencia.DIARIO },
  { equipoId: 'bs240', descripcion: 'Verificar solución limpiadora de la pipeta', frecuencia: Frecuencia.DIARIO },
  { equipoId: 'bs240', descripcion: 'Limpiar tubos de electrodos', frecuencia: Frecuencia.DIARIO },
  { equipoId: 'bs240', descripcion: 'Verificar jeringa de muestras/reactivos', frecuencia: Frecuencia.DIARIO },
  { equipoId: 'bs240', descripcion: 'Limpieza exterior de la pipeta', frecuencia: Frecuencia.SEMANAL },
  { equipoId: 'bs240', descripcion: 'Limpieza de mezcladora', frecuencia: Frecuencia.SEMANAL },
  { equipoId: 'bs240', descripcion: 'Lavado especial', frecuencia: Frecuencia.SEMANAL },
  { equipoId: 'bs240', descripcion: 'Comprobación de cubetas', frecuencia: Frecuencia.SEMANAL },
  { equipoId: 'bs240', descripcion: 'Limpieza profunda de mezcladora', frecuencia: Frecuencia.MENSUAL },
  { equipoId: 'bs240', descripcion: 'Limpieza del puerto de inyección de muestras', frecuencia: Frecuencia.MENSUAL },
  { equipoId: 'bs240', descripcion: 'Calibración de bombas', frecuencia: Frecuencia.MENSUAL },
  { equipoId: 'bs240', descripcion: 'Calibración de detector de burbujas de aire', frecuencia: Frecuencia.MENSUAL },
  { equipoId: 'bs240', descripcion: 'Comprobación de fotómetro', frecuencia: Frecuencia.MENSUAL },
  { equipoId: 'bs240', descripcion: 'Limpieza de depósito de agua desionizada', frecuencia: Frecuencia.TRIMESTRAL },
  { equipoId: 'bs240', descripcion: 'Limpieza de depósito de solución limpiadora', frecuencia: Frecuencia.TRIMESTRAL },
  { equipoId: 'bs240', descripcion: 'Reemplazar núcleo del filtro', frecuencia: Frecuencia.TRIMESTRAL },
  { equipoId: 'bs240', descripcion: 'Reemplazar lámpara', frecuencia: Frecuencia.SEMESTRAL },
  { equipoId: 'bs240', descripcion: 'Limpiar panel del analizador', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Mantenimiento del lector de código de barras', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Limpieza de carrusel muestras/reactivos', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Limpieza interior de pipeta', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Limpieza de rotores', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Reemplazo pipeta', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Reemplazo de mezclador', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Reemplazo de cubetas', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Reemplazo de electrodo ISE', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Almacenaje de electrodos', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Extracción de paquete de reactivos', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Limpieza tubo de residuos ISE', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Reemplazo de jeringa', frecuencia: Frecuencia.IRREGULAR },
  { equipoId: 'bs240', descripcion: 'Eliminar burbujas de aire de la jeringa', frecuencia: Frecuencia.IRREGULAR },

  // Tareas para otros equipos (ejemplos)
  { equipoId: 'ARCHITECT', descripcion: 'Mantenimiento diario del sistema de fluidos', frecuencia: Frecuencia.DIARIO },
  { equipoId: 'STAGO', descripcion: 'Verificación diaria de reactivos y controles', frecuencia: Frecuencia.DIARIO },
];

async function main() {
  console.log('Iniciando el sembrado de la base de datos...');

  // El orden es importante para evitar violaciones de clave foránea
  console.log('1. Limpiando datos existentes...');
  await prisma.registroMantenimiento.deleteMany({});
  await prisma.tarea.deleteMany({});
  await prisma.equipo.deleteMany({});
  
  console.log('2. Sembrando equipos...');
  await prisma.equipo.createMany({
    data: equipos,
  });

  console.log('3. Sembrando tareas...');
  await prisma.tarea.createMany({
    data: tareas,
  });

  console.log('Sembrado de la base de datos completado con éxito.');
}

main()
  .catch((e) => {
    console.error('Ha ocurrido un error durante el sembrado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
