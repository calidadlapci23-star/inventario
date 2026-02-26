'use server';

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Configuración de Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!getApps().length) {
  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    console.error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY no está configurada.');
  }
}

const DOMAIN = 'inventario.app';

export async function createUser(prevState: any, formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!serviceAccount) {
    return { error: 'El administrador de Firebase no está configurado en el servidor.' };
  }

  if (!username || !password) {
    return { error: 'El nombre de usuario y la contraseña son obligatorios.' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const email = `${username}@${DOMAIN}`;

  try {
    const userRecord = await getAuth().createUser({
      email: email,
      password: password,
      displayName: username,
    });

    return { message: `Usuario '${username}' creado con éxito.` };
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      return { error: 'Este nombre de usuario ya está en uso.' };
    }
    return { error: 'No se pudo crear el usuario. Por favor, inténtalo de nuevo.' };
  }
}

export async function listUsers() {
  if (!serviceAccount) {
    console.error('El administrador de Firebase no está configurado en el servidor.');
    return null;
  }

  try {
    const userRecords = await getAuth().listUsers();
    return userRecords.users.map((user) => ({
      uid: user.uid,
      displayName: user.displayName,
    }));
  } catch (error) {
    console.error('Error al listar los usuarios:', error);
    return null;
  }
}
