
// removeDuplicateProducts.js
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, writeBatch, deleteDoc, doc } = require("firebase/firestore");

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDlyMrsYBVIlKIQaSJFea1NclEZ7Q2vz9s",
  authDomain: "inventario-de-laboratori-11feb.firebaseapp.com",
  projectId: "inventario-de-laboratori-11feb",
  storageBucket: "inventario-de-laboratori-11feb.firebasestorage.app",
  messagingSenderId: "135418992590",
  appId: "1:135418992590:web:cfcffc8473e353862c7d9f"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function removeDuplicateProducts() {
  console.log("Buscando y eliminando productos duplicados...");
  
  const productosRef = collection(db, "productos");
  const snapshot = await getDocs(productosRef);
  
  // Objeto para agrupar productos por nombre, disciplina y proveedor
  const productosAgrupados = {};
  
  // 1. Agrupar productos
  snapshot.forEach((docSnap) => {
    const producto = docSnap.data();
    const key = `${producto.nombre}_${producto.disciplina}_${producto.proveedor}`;
    
    if (!productosAgrupados[key]) {
      productosAgrupados[key] = [];
    }
    
    productosAgrupados[key].push({
      id: docSnap.id,
      data: producto,
      ref: docSnap.ref
    });
  });
  
  console.log(`Total de productos únicos encontrados: ${Object.keys(productosAgrupados).length}`);
  
  // 2. Identificar productos duplicados a eliminar
  const productosAEliminar = [];
  let duplicadosEncontrados = 0;
  
  Object.entries(productosAgrupados).forEach(([key, productos]) => {
    if (productos.length > 1) {
      duplicadosEncontrados += productos.length - 1;
      
      console.log(`\nDuplicados encontrados para: ${key}`);
      console.log(`Cantidad: ${productos.length}`);
      
      // Ordenar productos: primero los que tienen stock > 0
      productos.sort((a, b) => {
        const stockA = Number(a.data.stock_actual) || 0;
        const stockB = Number(b.data.stock_actual) || 0;
        
        if (stockA > 0 && stockB === 0) return -1;
        if (stockA === 0 && stockB > 0) return 1;
        
        return stockB - stockA;
      });
      
      const productoAMantener = productos[0];
      console.log(`Producto a mantener: ID ${productoAMantener.id} (Stock: ${productoAMantener.data.stock_actual})`);
      
      const productosDuplicados = productos.slice(1);
      
      productosDuplicados.forEach((producto) => {
        console.log(`  → Eliminar: ID ${producto.id} (Stock: ${producto.data.stock_actual})`);
        productosAEliminar.push(producto.ref);
      });
    }
  });
  
  if (productosAEliminar.length > 0) {
    console.log(`\nResumen:`);
    console.log(`- Total de duplicados encontrados: ${duplicadosEncontrados}`);
    console.log(`- Productos a eliminar: ${productosAEliminar.length}`);
    console.log(`\nProcediendo a eliminar...`);
    
    const batchSize = 500;
    let eliminados = 0;
    
    for (let i = 0; i < productosAEliminar.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = productosAEliminar.slice(i, i + batchSize);
      
      batchDocs.forEach((docRef) => {
        batch.delete(docRef);
      });
      
      try {
        await batch.commit();
        eliminados += batchDocs.length;
        console.log(`Eliminado lote ${Math.floor(i/batchSize) + 1}: ${batchDocs.length} productos`);
      } catch (error) {
        console.error(`Error eliminando lote ${Math.floor(i/batchSize) + 1}:`, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ ¡Completado!`);
    console.log(`Total eliminados: ${eliminados} productos duplicados`);
    console.log(`Productos restantes únicos: ${Object.keys(productosAgrupados).length}`);
  } else {
    console.log("\n✅ No se encontraron productos duplicados para eliminar.");
  }
}

removeDuplicateProducts().catch(console.error);
