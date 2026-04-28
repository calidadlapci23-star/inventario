
// scripts/seed-abx-tasks.js
const admin = require('firebase-admin');
require('dotenv').config({ path: './.env.local' });

// Validar que la variable de entorno de la clave de servicio exista
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY no está definida. Asegúrate de que tu archivo .env.local está configurado correctamente.');
}

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  // Inicializar Firebase Admin SDK si no está ya inicializado
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.error('Error al parsear FIREBASE_SERVICE_ACCOUNT_KEY o al inicializar Firebase Admin:', error);
  process.exit(1); // Salir del script si hay un error de configuración
}


const db = admin.firestore();

// --- Tareas para el equipo ABX microes ---
const tareasABX = [
  // Mantenimiento Diario
  {
    equipoId: 'ABX microes',
    frecuencia: 'Diario',
    descripcion: 'Verificar la condición de los reactivos.',
    orden: 1,
  },
  {
    equipoId: 'ABX microes',
    frecuencia: 'Diario',
    descripcion: 'Compruebe el contenido del tanque de desechos.',
    orden: 2,
  },
  {
    equipoId: 'ABX microes',
    frecuencia: 'Diario',
    descripcion: 'Compruebe que no hay burbujas de aire en las mangueras de uso.',
    orden: 3,
  },
  {
    equipoId: 'ABX microes',
    frecuencia: 'Diario',
    descripcion: 'Realizar medición de blanco.',
    orden: 4,
  },
  {
    equipoId: 'ABX microes',
    frecuencia: 'Diario',
    descripcion: 'Analizar muestras de control de calidad.',
    orden: 5,
  },
  {
    equipoId: 'ABX microes',
    frecuencia: 'Diario',
    descripcion: 'Realizar limpieza diaria en mantenimiento>limpieza.',
    orden: 6,
  },
  // Mantenimiento Semanal
  {
    equipoId: 'ABX microes',
    frecuencia: 'Semanal',
    descripcion: 'Realizar una limpieza forzada.',
    orden: 1,
  },
  {
    equipoId: 'ABX microes',
    frecuencia: 'Semanal',
    descripcion: 'Limpieza exterior del sistema.',
    orden: 2,
  },
];

/**
 * Función para sembrar las tareas en Firestore.
 * Evita duplicados verificando si ya existe una tarea con la misma descripción y equipo.
 */
const seedTareas = async () => {
  const tareasCollection = db.collection('tareas');
  console.log('🌱 Comenzando la siembra de tareas para el equipo ABX microes...');

  const promises = tareasABX.map(async (tarea) => {
    // Consulta para ver si la tarea ya existe para ese equipo
    const snapshot = await tareasCollection
      .where('equipoId', '==', tarea.equipoId)
      .where('descripcion', '==', tarea.descripcion)
      .get();

    if (snapshot.empty) {
      // Si no existe, la añadimos
      await tareasCollection.add(tarea);
      console.log(`✅ Tarea añadida: "${tarea.descripcion}"`);
    } else {
      // Si ya existe, no hacemos nada
      console.log(`- Tarea omitida (ya existe): "${tarea.descripcion}"`);
    }
  });

  await Promise.all(promises);
  console.log('🌲 Siembra de tareas para ABX microes completada.');
};

seedTareas().catch(error => {
  console.error('🔥 Error durante la siembra de tareas:', error);
});
