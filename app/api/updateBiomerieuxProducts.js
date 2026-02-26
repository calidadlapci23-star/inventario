const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  query,
  where,
  doc
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

async function updateBiomerieuxProducts() {
  const productosRef = collection(db, "productos");

  console.log('Buscando productos de BIOMERIEUX en INMUNOLOGIA para actualizar...');

  const q = query(
    productosRef,
    where("proveedor", "==", "BIOMERIEUX"),
    where("disciplina", "==", "INMUNOLOGIA")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log("No se encontraron productos de BIOMERIEUX en INMUNOLOGIA para actualizar.");
    return;
  }

  let updatedCount = 0;
  for (const document of snapshot.docs) {
    const productData = document.data();
    // Verificar si el campo ya tiene el valor correcto para evitar escrituras innecesarias
    if (productData['# de Pruebas'] !== '60') {
      const productDocRef = doc(db, 'productos', document.id);
      await updateDoc(productDocRef, {
        '# de Pruebas': '60'
      });
      console.log(`Producto actualizado: ${productData.nombre} (ID: ${document.id})`);
      updatedCount++;
    } else {
      console.log(`Producto ya está actualizado: ${productData.nombre} (ID: ${document.id})`);
    }
  }

  if (updatedCount > 0) {
    console.log(`\n✅ Proceso completado. Se actualizaron ${updatedCount} productos.`);
  } else {
    console.log('\n✅ Proceso completado. Todos los productos relevantes ya estaban actualizados.');
  }
}

updateBiomerieuxProducts().catch(console.error);
