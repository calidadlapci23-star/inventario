const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp
} = require("firebase/firestore");

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

async function addTuboLila() {
  const productosRef = collection(db, "productos");

  // Verificar duplicado
  const q = query(
    productosRef,
    where("nombre", "==", "TUBO LILA (EDTA)"),
    where("disciplina", "==", "TOMA_MUESTRA")
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    console.log("El producto ya existe. No se agrega.");
    return;
  }

  await addDoc(productosRef, {
    nombre: "TUBO LILA (EDTA)",
    código: "",
    disciplina: "TOMA_MUESTRA",
    categorías: "Consumible",
    proveedor: "MOSCARO",
    stock_actual: 0,
    alerta_minima: 10,
    "# de Pruebas": "100",
    unidad_medida: "unidades",
    lote_actual: "",
    fecha_vencimiento_actual: "",
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  });

  console.log("TUBO LILA (EDTA) agregado correctamente.");
}

addTuboLila().catch(console.error);
