const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

// Configuración de Firebase directamente en el script
const firebaseConfig = {
  apiKey: "AIzaSyDlyMrsYBVIlKIQaSJFea1NclEZ7Q2vz9s",
  authDomain: "inventario-de-laboratori-11feb.firebaseapp.com",
  projectId: "inventario-de-laboratori-11feb",
  storageBucket: "inventario-de-laboratori-11feb.appspot.com", // Corregido a .appspot.com
  messagingSenderId: "135418992590",
  appId: "1:135418992590:web:cfcffc8473e353862c7d9f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const disciplinas = [
    {
        id: 'QUIMICA_CLINICA',
        nombre: 'QUIMICA_CLINICA',
        label: 'Química Clínica',
        descripcion: 'Análisis químicos en muestras clínicas',
        color: 'blue',
        icono: 'Beaker',
        activo: true,
        orden: 1,
    },
    {
        id: 'INMUNOLOGIA',
        nombre: 'INMUNOLOGIA',
        label: 'Inmunología',
        descripcion: 'Estudio del sistema inmunológico',
        color: 'purple',
        icono: 'Microscope',
        activo: true,
        orden: 2,
    },
    {
        id: 'UROANALISIS',
        nombre: 'UROANALISIS',
        label: 'Uroanálisis',
        descripcion: 'Análisis de orina y fluidos',
        color: 'teal',
        icono: 'Droplets',
        activo: true,
        orden: 3,
    },
    {
        id: 'BACTERIOLOGIA',
        nombre: 'BACTERIOLOGIA',
        label: 'Bacteriología',
        descripcion: 'Estudio de bacterias y microorganismos',
        color: 'green',
        icono: 'Bacteria',
        activo: true,
        orden: 4,
    },
    {
        id: 'MOLECULAR',
        nombre: 'MOLECULAR',
        label: 'Molecular',
        descripcion: 'Pruebas de biología molecular y genética',
        color: 'indigo',
        icono: 'Dna',
        activo: true,
        orden: 5,
    },
    {
        id: 'PRUEBAS_RAPIDAS',
        nombre: 'PRUEBAS_RAPIDAS',
        label: 'Pruebas Rápidas',
        descripcion: 'Pruebas diagnósticas rápidas',
        color: 'yellow',
        icono: 'Zap',
        activo: true,
        orden: 6,
    },
    {
        id: 'TOMA_MUESTRA',
        nombre: 'TOMA_MUESTRA',
        label: 'Toma de Muestra',
        descripcion: 'Recolección y preparación de muestras',
        color: 'orange',
        icono: 'TestTube',
        activo: true,
        orden: 7,
    },
    {
        id: 'HEMATOLOGIA',
        nombre: 'HEMATOLOGIA',
        label: 'Hematología',
        descripcion: 'Estudio de la sangre',
        color: 'red',
        icono: 'Heart',
        activo: true,
        orden: 8,
    },
    {
        id: 'COAGULACION',
        nombre: 'COAGULACION',
        label: 'Coagulación',
        descripcion: 'Pruebas de coagulación sanguínea',
        color: 'pink',
        icono: 'Syringe',
        activo: true,
        orden: 9,
    }
];

async function seedDisciplinas() {
  try {
    console.log(`🌱 Sembrando disciplinas en el proyecto: ${firebaseConfig.projectId}...`);
    
    const disciplinasConTimestamp = disciplinas.map(d => ({
        ...d,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    }));

    for (const disciplina of disciplinasConTimestamp) {
      const docRef = doc(db, 'disciplinas', disciplina.id);
      await setDoc(docRef, disciplina);
      console.log(`✅ ${disciplina.label} agregado`);
    }
    
    console.log('\n🎉 ¡Todas las disciplinas han sido agregadas exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la siembra:', error);
  } finally {
    // No salimos del proceso para poder ver los logs en el entorno del IDE
  }
}

seedDisciplinas();