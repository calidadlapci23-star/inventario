// scripts/seed-tareas.js
const admin = require('firebase-admin');

// Inicializa el SDK de Admin. En este entorno, las credenciales se detectan automáticamente.
try {
  admin.initializeApp();
} catch (e) {
  // Evita el error si la app ya está inicializada (útil en entornos de recarga en caliente)
  if (e.code !== 'app/duplicate-app') {
    console.error('Error en la inicialización de Firebase Admin', e);
  }
}

const db = admin.firestore();

async function seedTareas() {
  const tareasCollection = db.collection('tareas');
  console.log('Poblando la colección de tareas con la lista completa...');

  // Primero, borramos los documentos existentes para evitar duplicados
  const snapshot = await tareasCollection.get();
  if (!snapshot.empty) {
    console.log('Borrando tareas existentes...');
    const deleteBatch = db.batch();
    snapshot.docs.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    console.log('Tareas anteriores borradas.');
  }

  const tareas = [
    // DIARIO
    { equipoId: "bs240", descripcion: "VERIFICAR PIPETA / MEZCLADOR / HUECO DE LIMPIEZA", frecuencia: "DIARIO" },
    { equipoId: "bs240", descripcion: "VERIFICAR CONEXIÓN Y LLENADO DEL DEPOSITO DE SOLUCIÓN LIMPIADORA DILUIDA", frecuencia: "DIARIO" },
    { equipoId: "bs240", descripcion: "VERIFICAR CONECTOR DE RESIDUOS Y VACIADO DE CONTENEDOR DE DESECHOS", frecuencia: "DIARIO" },
    { equipoId: "bs240", descripcion: "VERIFICAR SOLUCIÓN LIMPIADORA DE LA PIPETA", frecuencia: "DIARIO" },
    { equipoId: "bs240", descripcion: "LIMPIAR TUBOS DE ELECTRODOS", frecuencia: "DIARIO" },
    { equipoId: "bs240", descripcion: "VERIFICAR JERINGA DE MUESTRAS / REACTIVOS", frecuencia: "DIARIO" },
    // SEMANAL
    { equipoId: "bs240", descripcion: "LIMPIEZA EXTERIOR DE LA PIPETA", frecuencia: "SEMANAL" },
    { equipoId: "bs240", descripcion: "LIMPIEZA DE MEZCLADORA", frecuencia: "SEMANAL" },
    { equipoId: "bs240", descripcion: "LAVADO ESPECIAL", frecuencia: "SEMANAL" },
    { equipoId: "bs240", descripcion: "COMPROBACIÓN DE CUBETAS", frecuencia: "SEMANAL" },
    // MENSUAL
    { equipoId: "bs240", descripcion: "LIMPIEZA PROFUNDA DE MEZCLADORA", frecuencia: "MENSUAL" },
    { equipoId: "bs240", descripcion: "LIMPIEZA DEL PUERTO DE INYECCION DE MUESTRAS", frecuencia: "MENSUAL" },
    { equipoId: "bs240", descripcion: "CALIBRACIÓN DE BOMBAS", frecuencia: "MENSUAL" },
    { equipoId: "bs240", descripcion: "CALIBRACIÓN DE DETECTOR DE BURBUJAS DE AIRE", frecuencia: "MENSUAL" },
    { equipoId: "bs240", descripcion: "COMPROBACIÓN DE FOTOMETRO", frecuencia: "MENSUAL" },
    // TRIMESTRAL
    { equipoId: "bs240", descripcion: "LIMPIEZA DEL DEPOSITO DE AGUA DESIONIZADA", frecuencia: "TRIMESTRAL" },
    { equipoId: "bs240", descripcion: "LIMPIEZA DE DEPOSITO DE SOLUCION LIMPIADORA", frecuencia: "TRIMESTRAL" },
    { equipoId: "bs240", descripcion: "REEMPLAZAR NUCLEO DEL FILTRO", frecuencia: "TRIMESTRAL" },
    // SEMESTRAL
    { equipoId: "bs240", descripcion: "REEMPLAZAR LAMPARA", frecuencia: "SEMESTRAL" },
    // IRREGULAR
    { equipoId: "bs240", descripcion: "LIMPIAR PANEL DEL ANALIZADOR", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "MANTENIMIENTO DEL LECTOR DE CODIGO DE BARRAS", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "LIMPIEZA DE CARRUSEL MUESTRAS / REACTIVOS", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "LIMPIEZA INTERIOR DE PIPETA", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "LIMPIEZA DE ROTORES", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "REEMPLAZO PIPETA", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "REEMPLAZO DE MEZCLADOR", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "REEMPLAZO DE CUBETAS", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "REEMPLAZO DE ELECTRODO ISE", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "ALMACENAJE DE ELECTRODOS", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "EXTRACCIÓN DE PAQUETE DE REACTIVOS", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "LIMPIEZA TUBO DE RESIDUOS ISE", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "REEMPLAZO DE JERINGA", frecuencia: "IRREGULAR" },
    { equipoId: "bs240", descripcion: "ELIMINAR BURBUJAS DE AIRE DE LA JERINGA", frecuencia: "IRREGULAR" }
  ];

  const batch = db.batch();

  tareas.forEach(tarea => {
    const docRef = tareasCollection.doc();
    batch.set(docRef, tarea);
  });

  try {
    await batch.commit();
    console.log('¡Éxito! La colección de tareas ha sido poblada con la lista completa.');
  } catch (error) {
    console.error('Error al poblar la colección: ', error);
  }
}

seedTareas().then(() => {
  console.log('Proceso de sembrado finalizado.');
}).catch(error => {
  console.error('Ocurrió un error en el proceso de sembrado:', error);
});
