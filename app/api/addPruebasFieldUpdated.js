import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDlyMrsYBVIlKIQaSJFea1NclEZ7Q2vz9s",
  authDomain: "inventario-de-laboratori-11feb.firebaseapp.com",
  projectId: "inventario-de-laboratori-11feb",
  storageBucket: "inventario-de-laboratori-11feb.firebasestorage.app",
  messagingSenderId: "135418992590",
  appId: "1:135418992590:web:cfcffc8473e353862c7d9f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addProgesterona() {
  const productosRef = collection(db, "productos");

  // Buscar si ya existe
  const q = query(
    productosRef,
    where("nombre", "==", "Progesterona"),
    where("disciplina", "==", "INMUNOLOGIA")
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    console.log("Progesterona ya existe. No se agrega.");
    return;
  }

  // Crear producto
  await addDoc(productosRef, {
    nombre: "Progesterona",
    proveedor: "BIOMERIEUX",
    "# de Pruebas": "60",
    alerta_minima: 10,
    categorías: "Reactivo",
    código: "",
    created_at: Timestamp.now(),
    disciplina: "INMUNOLOGIA",
    stock_actual: 0,
    unidad_medida: "unidades",
    updated_at: Timestamp.now()
  });

  console.log("Progesterona agregada correctamente.");
}

addProgesterona().catch(console.error);
