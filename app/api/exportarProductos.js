
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, orderBy, query } = require("firebase/firestore");
const fs = require('fs');

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

// Función para escapar comas y comillas en los valores del CSV
function escapeCSV(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    // Si el valor contiene comas, comillas dobles o saltos de línea, lo envolvemos en comillas dobles
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        // Escapamos las comillas dobles existentes duplicándolas
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

async function exportarProductos() {
  try {
    console.log("Obteniendo productos de la base de datos...");
    const productosRef = collection(db, "productos");
    const q = query(productosRef, orderBy("disciplina"), orderBy("nombre"));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("No se encontraron productos para exportar.");
      return;
    }

    const productos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Definir las cabeceras del CSV
    const headers = [
      'ID', 'Nombre', 'Codigo', 'Disciplina', 'Categoría', 
      'Proveedor', 'Stock Actual', 'Alerta Mínima', 'Pruebas por Caja', 
      'Unidad de Medida', 'Lote Actual', 'Fecha Vencimiento Actual'
    ];
    
    // Convertir los datos a formato CSV
    const csvRows = [headers.join(',')]; // Fila de cabecera

    productos.forEach(prod => {
      const row = [
        escapeCSV(prod.id),
        escapeCSV(prod.nombre),
        escapeCSV(prod.codigo),
        escapeCSV(prod.disciplina),
        escapeCSV(prod.categorias), // Asegúrate que el nombre del campo sea correcto
        escapeCSV(prod.proveedor),
        escapeCSV(prod.stock_actual),
        escapeCSV(prod.alerta_minima),
        escapeCSV(prod['# de Pruebas']), // Acceso al campo con caracteres especiales
        escapeCSV(prod.unidad_medida),
        escapeCSV(prod.lote_actual),
        escapeCSV(prod.fecha_vencimiento_actual)
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const filePath = 'productos_exportados.csv';

    // Guardar el archivo CSV
    fs.writeFileSync(filePath, csvContent);

    console.log(`\n✅ ¡Exportación completada!`);
    console.log(`Se han exportado ${productos.length} productos.`);
    console.log(`El archivo se ha guardado en: ${filePath}`);
    console.log("Puedes descargarlo desde el explorador de archivos a tu izquierda.");

  } catch (error) {
    console.error("Error al exportar los productos:", error);
  }
}

exportarProductos();
