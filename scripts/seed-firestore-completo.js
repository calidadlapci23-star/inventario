// /scripts/seed-firestore-completo.js
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  query,
  where,
  serverTimestamp 
} = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CATALOGO_PRUEBAS = {
    INMUNOLOGIA: [
        { nombre: "Perfil Tiroideo", proveedor: "Roche" },
        { nombre: "Marcadores Tumorales", proveedor: "Abbott" },
    ],
    QUIMICA_CLINICA: [
        { nombre: "Química Sanguínea 6", proveedor: "Wiener" },
        { nombre: "Electrolitos Séricos", proveedor: "Siemens" },
    ]
};

async function crearCatalogoProductos() {
  console.log('\n📚 Creando productos del catálogo...');
  
  for (const [disciplina, pruebas] of Object.entries(CATALOGO_PRUEBAS)) {
    console.log(`\n📂 ${disciplina}:`);
    
    for (const prueba of pruebas) {
      try {
        const productosRef = collection(db, 'productos');
        const q = query(
          productosRef, 
          where('nombre', '==', prueba.nombre),
          where('disciplina', '==', disciplina)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          await addDoc(productosRef, {
            nombre: prueba.nombre,
            codigo: `PRUEBA-${prueba.nombre.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
            disciplina: disciplina,
            unidad_medida: 'unidades',
            stock_actual: Math.floor(Math.random() * 50) + 10,
            alerta_minima: 5,
            alerta_maxima: 100,
            categoria: 'REACTIVO',
            proveedor_sugerido: prueba.proveedor,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
          console.log(`  ✅ ${prueba.nombre}`);
        } else {
          console.log(`  ⏭️ ${prueba.nombre} (ya existe)`);
        }
      } catch (error) {
        console.warn(`  ❌ ${prueba.nombre}:`, error.message);
      }
    }
  }
}

async function main() {
    await crearCatalogoProductos();
}

main().catch(console.error);