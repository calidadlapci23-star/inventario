// scripts/seed-pruebas.js
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

// Configuración de Firebase directamente en el script
const firebaseConfig = {
  apiKey: "AIzaSyDlyMrsYBVIlKIQaSJFea1NclEZ7Q2vz9s",
  authDomain: "inventario-de-laboratori-11feb.firebaseapp.com",
  projectId: "inventario-de-laboratori-11feb",
  storageBucket: "inventario-de-laboratori-11feb.appspot.com",
  messagingSenderId: "135418992590",
  appId: "1:135418992590:web:cfcffc8473e353862c7d9f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Catálogo completo de pruebas
const catalogoPruebas = {
  'INMUNOLOGIA': [
    { nombre: 'EPOC', proveedor: 'BGEM' },
    { nombre: 'TSH', proveedor: 'BIOMERIEUX' },
    { nombre: 'T3', proveedor: 'BIOMERIEUX' },
    { nombre: 'T4', proveedor: 'BIOMERIEUX' },
    { nombre: 'FT3', proveedor: 'BIOMERIEUX' },
    { nombre: 'FT4', proveedor: 'BIOMERIEUX' },
    { nombre: 'ANTI TPO', proveedor: 'BIOMERIEUX' },
    { nombre: 'ANTI TG', proveedor: 'BIOMERIEUX' },
    { nombre: 'PROL', proveedor: 'BIOMERIEUX' },
    { nombre: 'E2', proveedor: 'BIOMERIEUX' },
    { nombre: 'LH', proveedor: 'BIOMERIEUX' },
    { nombre: 'FSH', proveedor: 'BIOMERIEUX' },
    { nombre: 'TESTOSTERONA', proveedor: 'BIOMERIEUX' },
    { nombre: 'AMH', proveedor: 'BIOMERIEUX' },
    { nombre: 'VITAMINA D', proveedor: 'BIOMERIEUX' },
    { nombre: 'HEP B', proveedor: 'BIOMERIEUX' },
    { nombre: 'HEP C', proveedor: 'BIOMERIEUX' },
    { nombre: 'PRO BNP', proveedor: 'BIOMERIEUX' },
    { nombre: 'PSA', proveedor: 'BIOMERIEUX' },
    { nombre: 'PCR U', proveedor: 'MEXLAB' },
    { nombre: 'INSULINA', proveedor: 'MEXLAB' },
    { nombre: 'SSA', proveedor: 'MEXLAB' },
    { nombre: 'SSB', proveedor: 'MEXLAB' }
  ],
  'QUIMICA_CLINICA': [
    { nombre: 'FLUID PACKD', proveedor: 'DIAMOND DIAGNOSTIC' },
    { nombre: 'LIPASA', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'AMILASA', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'HIERRO', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'Mg', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'BILI TOTAL', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'ALBUMINA', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'URICO', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'BUN/UREA', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'GGT', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'CALCIO', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'PHOS', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'CAL 1', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'CAL 2', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'CAL 3', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'CAL4', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'GLUCOSA', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'AMYLASA', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'COLESTEROL', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'FE', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'TRIGLIS', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'ALKP', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'BuBc', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'PROT TOTAL', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'T BIL', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'CREA', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'ALTV', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'AST', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'LDH', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'VERIFIER I', proveedor: 'ORTHO CLINICAL' },
    { nombre: 'VERIFIER II', proveedor: 'ORTHO CLINICAL' }
  ],
  'PRUEBAS_RAPIDAS': [
    { nombre: 'VDRL', proveedor: 'SPINREACT' },
    { nombre: 'REACCIONES FEBRILES', proveedor: 'SPINREACT' },
    { nombre: 'HEPATITIS B', proveedor: 'BIOLINE' },
    { nombre: 'HEPATITIS C', proveedor: 'ABBOTT' },
    { nombre: 'VIH', proveedor: 'ABBOTT' },
    { nombre: 'METILFENIATO', proveedor: 'MEXLAB' },
    { nombre: 'HB GLICO', proveedor: 'DIAGNOSTICA INT' },
    { nombre: 'EPOC', proveedor: 'BLOOD ANALYSIS' },
    { nombre: 'H PYLORI', proveedor: 'MEXLAB' },
    { nombre: 'CYSTATINA C', proveedor: 'DIAGNOSTICA INT' },
    { nombre: 'DIMERO D', proveedor: 'DIAGNOSTICA INT' },
    { nombre: 'HEPATITIS B', proveedor: 'ABBOTT' }
  ],
  'COAGULACION': [
    { nombre: 'THOMBOREL S', proveedor: 'SIEMENS' },
    { nombre: 'ACTIN', proveedor: 'SIEMENS' },
    { nombre: 'CONTROL N', proveedor: 'SIEMENS' },
    { nombre: 'CONTROL P', proveedor: 'SIEMENS' },
    { nombre: 'CaCl 2', proveedor: 'SIEMENS' },
    { nombre: 'PT MULTICALIBRADOR', proveedor: 'SIEMENS' }
  ],
  'HEMATOLOGIA': [
    { nombre: 'THOMBOREL S', proveedor: 'SIEMENS' },
    { nombre: 'ACTIN', proveedor: 'SIEMENS' },
    { nombre: 'CONTROL N', proveedor: 'SIEMENS' },
    { nombre: 'CONTROL P', proveedor: 'SIEMENS' },
    { nombre: 'CaCl 2', proveedor: 'SIEMENS' },
    { nombre: 'PT MULTICALIBRADOR', proveedor: 'SIEMENS' }
  ],
  'BACTERIOLOGIA': [
    { nombre: 'AF GENITAL SYSTEM', proveedor: 'Liofilchem' },
    { nombre: 'AGAR CHOCOLATE', proveedor: 'BD' },
    { nombre: 'AGAR CHOCOLATE', proveedor: 'MCDLAB' },
    { nombre: 'AGAR MAC CONKEY', proveedor: 'BD' },
    { nombre: 'AGAR MAC CONKEY', proveedor: 'MCDLAB' },
    { nombre: 'AGAR MUELLER HINTON', proveedor: 'BD' },
    { nombre: 'AGAR MUELLER HINTON', proveedor: 'MCDLAB' },
    { nombre: 'AGAR PARA CANDIDA', proveedor: 'MCDLAB' },
    { nombre: 'AGAR PARA CANDIDA', proveedor: 'BD' },
    { nombre: 'AGAR SALMONELLA SHIGELLA', proveedor: 'MCDLAB' },
    { nombre: 'AGAR SALMONELLA SHIGELLA', proveedor: 'BD' },
    { nombre: 'AGAR SANGRE', proveedor: 'BD' },
    { nombre: 'AGAR SANGRE', proveedor: 'MCDLAB' },
    { nombre: 'CHLAMYDIA', proveedor: 'ABBOTT' },
    { nombre: 'COMPACT DRY', proveedor: 'NISSUI' },
    { nombre: 'HEMOCULTIVO AEROBIO', proveedor: 'INVESTIGACION DIAGNOSTICA' },
    { nombre: 'NEG/URINE COMBO TYPE 87', proveedor: 'BECKMAN COULTER' },
    { nombre: 'POLIDISCOS POSITIVO', proveedor: 'PBM' },
    { nombre: 'POLIDISCOS NEGATIVO', proveedor: 'PBM' },
    { nombre: 'PROMT INOCULATION SYSTEM-D', proveedor: 'BECKMAN COULTER' },
    { nombre: 'QUICK SWAB', proveedor: '3M' }
  ],
  'TOMA_MUESTRA': [
    { nombre: 'PATCHES LANCETA', proveedor: 'LANCETA' },
    { nombre: 'TOALLAS ALCOHOLADAS', proveedor: 'PROTEC' },
    { nombre: 'ABATELENGUAS NO ESTERIL', proveedor: 'POP' },
    { nombre: 'AGUJAS 20X1 1/2', proveedor: 'B,D.' },
    { nombre: 'JERINGAS DE 20ML S/ AGUJA', proveedor: 'B.D.' },
    { nombre: 'FRASCOS ESTERIL 100ML', proveedor: 'LANCETA' },
    { nombre: 'FRASCOS ESTERILES 50 ML', proveedor: 'LANCETA' },
    { nombre: 'GUANTES NITRILO MED', proveedor: 'MOSCARO' },
    { nombre: 'GUANTES NITRILO GLOVES MED', proveedor: 'MOSCARO' },
    { nombre: 'GUANTES NITRILO GRANDES', proveedor: 'MOSCARO' },
    { nombre: 'TUBO DORADO', proveedor: 'KABLA' },
    { nombre: 'DEXTROSOL 50 G', proveedor: 'MOSCARO' },
    { nombre: 'DEXTROSOL 75G', proveedor: 'MOSCARO' },
    { nombre: 'TUBO AZUL', proveedor: 'MOSCARO' },
    { nombre: 'MICROTAINER BH', proveedor: 'SARSTEDT' },
    { nombre: 'TUBOS AMBAR', proveedor: 'SARTEDT' },
    { nombre: 'TUBO LILA', proveedor: 'MOSCARO' },
    { nombre: 'AGUJAS 21X1 1/2', proveedor: 'MOSCARO' },
    { nombre: 'GUANTE DE NIT, GDE', proveedor: 'MOSCARO' },
    { nombre: 'GUANTE DE NIT MED', proveedor: 'MOSCARO' },
    { nombre: 'DEXTROSOL 100 G', proveedor: 'MOSCARO' },
    { nombre: 'DEXTROSOL DE 75 G', proveedor: 'MOSCARO' },
    { nombre: 'FCO ESTERIL 100 ml', proveedor: 'MOSCARO' },
    { nombre: 'STUART', proveedor: 'MOSCARO' }
  ],
  'MOLECULAR': [
    { nombre: 'SPOTFIRE', proveedor: 'BIOMERIEUX' }
  ]
};

async function seedPruebas() {
  try {
    console.log(`🌱 Sembrando pruebas en el proyecto: ${firebaseConfig.projectId}...\n`);
    
    let totalAgregadas = 0;
    let totalDisciplinas = Object.keys(catalogoPruebas).length;

    for (const [disciplina, pruebas] of Object.entries(catalogoPruebas)) {
      console.log(`📦 Procesando ${pruebas.length} pruebas de ${disciplina}...`);
      
      let agregadasEnDisciplina = 0;
      let erroresEnDisciplina = 0;
      
      for (const prueba of pruebas) {
        try {
          const pruebaId = generarIdPrueba(disciplina, prueba.nombre);
          
          const pruebaData = {
            id: pruebaId,
            nombre: prueba.nombre.trim(),
            proveedor: prueba.proveedor.trim(),
            disciplina: disciplina,
            stockActual: 0,
            stockMinimo: 5,
            stockMaximo: 100,
            unidad: obtenerUnidadPorDisciplina(disciplina),
            ubicacion: 'Almacén principal',
            activa: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            necesitaReposicion: true,
            ultimaReposicion: null,
            categoria: obtenerCategoriaPorDisciplina(disciplina)
          };

          const docRef = doc(db, 'pruebas', pruebaId);
          await setDoc(docRef, pruebaData);
          
          agregadasEnDisciplina++;
          totalAgregadas++;
          
        } catch (error) {
          erroresEnDisciplina++;
          console.error(`   ❌ Error con "${prueba.nombre}":`, error.message);
        }
      }
      
      if (erroresEnDisciplina === 0) {
        console.log(`   ✅ ${agregadasEnDisciplina}/${pruebas.length} pruebas agregadas en ${disciplina}\n`);
      } else {
        console.log(`   ⚠️  ${agregadasEnDisciplina}/${pruebas.length} pruebas agregadas, ${erroresEnDisciplina} errores en ${disciplina}\n`);
      }
    }
    
    console.log('🎉 ¡Sembrado completado!');
    console.log(`📊 Resumen:`);
    console.log(`   • Total disciplinas procesadas: ${totalDisciplinas}`);
    console.log(`   • Total pruebas agregadas: ${totalAgregadas}`);
    
    console.log('\n📈 Pruebas por disciplina:');
    for (const [disciplina, pruebas] of Object.entries(catalogoPruebas)) {
      console.log(`   • ${disciplina.padEnd(20)}: ${pruebas.length.toString().padStart(3)} pruebas`);
    }
    
    console.log('\n🔍 Ejemplo de IDs generados:');
    const ejemploDisciplina = Object.keys(catalogoPruebas)[0];
    const ejemploPrueba = catalogoPruebas[ejemploDisciplina][0];
    console.log(`   • ${ejemploDisciplina} - ${ejemploPrueba.nombre}`);
    console.log(`     → ID: ${generarIdPrueba(ejemploDisciplina, ejemploPrueba.nombre)}`);

  } catch (error) {
    console.error('❌ Error durante la siembra:', error);
  }
}

function generarIdPrueba(disciplina, nombrePrueba) {
  const nombreLimpio = nombrePrueba
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .substring(0, 20);
  
  const disciplinaLimpia = disciplina
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .substring(0, 10);
  
  return `${disciplinaLimpia}_${nombreLimpio}`;
}

function obtenerUnidadPorDisciplina(disciplina) {
  const unidades = {
    'INMUNOLOGIA': 'kit',
    'QUIMICA_CLINICA': 'kit',
    'PRUEBAS_RAPIDAS': 'kit',
    'COAGULACION': 'kit',
    'HEMATOLOGIA': 'kit',
    'BACTERIOLOGIA': 'unidad',
    'TOMA_MUESTRA': 'unidad',
    'MOLECULAR': 'kit',
    'UROANALISIS': 'kit'
  };
  
  return unidades[disciplina] || 'unidad';
}

function obtenerCategoriaPorDisciplina(disciplina) {
  const categorias = {
    'INMUNOLOGIA': 'INMUNOENS',
    'QUIMICA_CLINICA': 'REACTIVO',
    'PRUEBAS_RAPIDAS': 'PRUEBA_RAPIDA',
    'COAGULACION': 'REACTIVO',
    'HEMATOLOGIA': 'REACTIVO',
    'BACTERIOLOGIA': 'MEDIO_CULTIVO',
    'TOMA_MUESTRA': 'MATERIAL_CONSUMIBLE',
    'MOLECULAR': 'KIT_MOLECULAR',
    'UROANALISIS': 'REACTIVO'
  };
  
  return categorias[disciplina] || 'OTRO';
}

async function verificarPruebasExistentes() {
  try {
    const { collection, getDocs } = require('firebase/firestore');
    console.log('🔍 Verificando pruebas existentes...');
    const querySnapshot = await getDocs(collection(db, 'pruebas'));
    const count = querySnapshot.size;
    console.log(`📊 Actualmente hay ${count} pruebas en la base de datos`);
    if (count > 0) {
        console.log('Operación cancelada para evitar duplicados. Si deseas volver a sembrar, primero limpia la colección de pruebas.');
        process.exit(0);
    } else {
      console.log('✅ No hay pruebas existentes, continuando...');
      seedPruebas();
    }
  } catch (error) {
    console.error('❌ Error al verificar:', error);
    seedPruebas();
  }
}

verificarPruebasExistentes();
