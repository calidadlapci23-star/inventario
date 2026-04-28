export const equiposData = {
  easylite: {
    id: 'easylite',
    nombre: 'EASYLYTE',
    mantenimientos: {
      diario: [
        { id: 'd1', tarea: 'Aplicar solucion de limpieza/aclarado.' },
        { id: 'd2', tarea: 'Sustituir paquete de soluciones' },
      ],
      trimestral: [
        { id: 't1', tarea: 'Sustituir conjunto de la membrana' },
        { id: 't2', tarea: 'Sustituir tubo de muestras' },
        { id: 't3', tarea: 'Sustituir tubo corto de muestras' },
        { id: 't4', tarea: 'Sustituir tubo de la bomba' },
        { id: 't5', tarea: 'Aplicar solución de cebado interno' },
        { id: 't6', tarea: 'Sustituir electrodo de referencia desechable' },
        { id: 't7', tarea: 'Sustituir valvula de soluciones de lavado' },
      ],
      requerido: [
        { id: 'r1', tarea: 'Sustituir valvula de soluciones' },
        { id: 'r2', tarea: 'Sustituir sonda de muestras' },
        { id: 'r3', tarea: 'Sustituir electrodo de K' },
        { id: 'r4', tarea: 'Sustituir electrodo de Na' },
        { id: 'r5', tarea: 'Sustituir electrodo de Cl' },
        { id: 'r6', tarea: 'Sustituir electrodo de referencia Na/K/Cl' },
      ],
    },
  },
  bftii: {
    id: 'bftii',
    nombre: 'BFT II',
    mantenimientos: {
      diario: [
        { id: 'bft-d1', tarea: 'LIMPIEZA SUPERFICIAL' },
        { id: 'bft-d2', tarea: 'ESPACIOS DE MUESTREO' },
      ],
      requerido: [
        { id: 'bft-r1', tarea: 'CAMBIO DE FUSIBLE' },
      ],
    },
  },
  chromate4300: {
    id: 'chromate4300',
    nombre: 'CHROMATE 4300',
    mantenimientos: {
      diario: [
        { id: 'ch-d1', tarea: 'LIMPIEZA DE SUPERFICIE' },
        { id: 'ch-d2', tarea: 'LIMPIEZA DE CHAROLA INTERNA' },
        { id: 'ch-d3', tarea: 'MEDIDA DE FOTOMETRO (405, 450, 492 y 630)' },
      ],
      requerido: [
        { id: 'ch-r1', tarea: 'CAMBIO DE LÁMPARA' },
      ],
    },
  },
  'microscopio-bioblue': {
    id: 'microscopio-bioblue',
    nombre: 'MICROSCOPIO BIO BLUE',
    mantenimientos: {
      diario: [
        { id: 'mbb-d1', tarea: 'Verificar encendido' },
        { id: 'mbb-d2', tarea: 'Limpieza Externa' },
        { id: 'mbb-d3', tarea: 'Limpieza de Objetivos' },
        { id: 'mbb-d4', tarea: 'Limpieza oculares' },
      ],
    },
  },
  // Aquí se pueden añadir más equipos en el futuro
};
