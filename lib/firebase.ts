// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDlyMrsYBVIlKIQaSJFea1NclEZ7Q2vz9s",
  authDomain: "inventario-de-laboratori-11feb.firebaseapp.com",
  projectId: "inventario-de-laboratori-11feb",
  storageBucket: "inventario-de-laboratori-11feb.appspot.com",
  messagingSenderId: "135418992590",
  appId: "1:135418992590"
};

// Inicialización de la app de Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicialización de los servicios de Firebase
const db = getFirestore(app);
const storage = getStorage(app);

// Exportaciones nombradas para los servicios y la exportación por defecto para la app
export { db, storage };
export default app;
