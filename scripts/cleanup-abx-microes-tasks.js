
// scripts/cleanup-abx-microes-tasks.js
const admin = require('firebase-admin');
require('dotenv').config({ path: './.env.local' });

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY no está definida.');
}

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.error('Error al inicializar Firebase Admin:', error);
  process.exit(1);
}

const db = admin.firestore();

const cleanupABXMicroesTasks = async () => {
  const equipoId = 'ABX microes';
  console.log(`🧹 Iniciando limpieza de tareas para el equipo: ${equipoId}...`);

  const tareasCollection = db.collection('tareas');
  const snapshot = await tareasCollection.where('equipoId', '==', equipoId).get();

  if (snapshot.empty) {
    console.log('No se encontraron tareas para limpiar.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    console.log(`- Documento ${doc.id} marcado para eliminación.`);
  });

  await batch.commit();
  console.log(`✅ Limpieza completada. Se eliminaron ${snapshot.size} tareas.`);
};

cleanupABXMicroesTasks().catch(error => {
  console.error('🔥 Error durante la limpieza de tareas:', error);
});
