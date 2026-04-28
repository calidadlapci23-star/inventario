import admin from 'firebase-admin';

// Variable que contendrá la instancia de Firestore
let dbInstance: admin.firestore.Firestore | null = null;

if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY no está definida');
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    dbInstance = admin.firestore();
    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('🔥 ERROR FATAL al inicializar Firebase Admin:', error);
    // No asignes dbInstance, se mantiene null
  }
} else {
  // Si ya estaba inicializado (por otro módulo), obtener Firestore
  dbInstance = admin.firestore();
}

// Exportar db, pero si es null, lanzar error descriptivo
export const db = dbInstance ?? (() => { throw new Error('Firebase Admin no inicializado correctamente. Revisa las variables de entorno.'); })();