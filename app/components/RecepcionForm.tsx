// app/inventario/recepcion/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, orderBy, 
  writeBatch, doc, serverTimestamp, Timestamp,
  addDoc, updateDoc
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { 
  Package, Truck, CheckCircle, Search, Filter,
  Plus, Minus, Save, RotateCcw, Home, AlertCircle,
  Calendar, Barcode, Factory, ClipboardCheck, Hash, List, TestTube
} from 'lucide-react';

const Toaster = dynamic(
  () => import('react-hot-toast').then((mod) => mod.Toaster),
  { ssr: false }
);

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  disciplina: string;
  categoria: string;
  unidad_medida: string;
  stock_actual: number;
  proveedor: string;
  fabricante: string;
  fecha_vencimiento?: string;
  lote?: string;
  alerta_minima: number;
  precio_unitario?: number;
  ubicacion?: string;
  pruebas_por_caja?: number;
}

interface RegistroRecepcion {
  productoId: string;
  productoNombre: string;
  codigoProducto: string;
  fabricante: string;
  unidad: string;
  stockActual: number;
  pruebas: number;
  pruebasPorCaja?: number;
  numeroLote: string;
  fechaVencimiento: string;
  nuevoStock: number;
  proveedor?: string;
  observacionesProducto?: string;
}

// Catálogo de productos por disciplina
const catalogoProductos = {
  'QUIMICA_CLINICA': [
    { nombre: 'FLUID PACKD', fabricante: 'DIAMOND DIAGNOSTIC', proveedor: 'Proveedor A', pruebas: 0 },
    { nombre: 'LIPASA', fabricante: 'ORTHO CLINICAL', proveedor: 'Proveedor B', pruebas: 0 },
    { nombre: 'AMILASA', fabricante: 'ORTHO CLINICAL', proveedor: 'Proveedor B', pruebas: 0 },
    { nombre: 'HIERRO', fabricante: 'ORTHO CLINICAL', proveedor: 'Proveedor B', pruebas: 0 },
    { nombre: 'Mg', fabricante: 'ORTHO CLINICAL', proveedor: 'Proveedor B', pruebas: 0 },
    { nombre: 'BILI TOTAL', fabricante: 'ORTHO CLINICAL', proveedor: 'Proveedor B', pruebas: 0 },
    { nombre: 'ALBUMINA', fabricante: 'ORTHO CLINICAL', proveedor: 'Proveedor B', pruebas: 0 },
    { nombre: 'URICO', fabricante: 'ORTHO CLINICAL', proveedor: 'Proveedor B', pruebas: 0 },
    { nombre: 'BUN/UREA', fabricante: 'ORTHO CLINICAL', proveedor: 'Proveedor B', pruebas: 0 },
    { nombre: 'GGT', fabricante: 'ORTHO CLINICAL', proveedor: 'Proveedor B', pruebas: 0 },
  ],
  'INMUNOLOGIA': [
    { nombre: 'EPOC', fabricante: 'BGEM', proveedor: 'Proveedor C', pruebas: 0 },
    { nombre: 'TSH', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'T3', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'T4', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'FT3', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'FT4', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'ANTI TPO', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'ANTI TG', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'PROL', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'E2', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'BNP', fabricante: 'Boditech Med Inc', proveedor: 'DESEGO', pruebas: 24 },
    { nombre: 'hsCRP', fabricante: 'Boditech Med Inc', proveedor: 'DESEGO', pruebas: 24 },
    { nombre: 'HbA1c Neo', fabricante: 'Boditech Med Inc', proveedor: 'DESEGO', pruebas: 24 },
    { nombre: 'Insulina', fabricante: 'Boditech Med Inc', proveedor: 'DESEGO', pruebas: 24 },
    { nombre: 'Anti-CCP Plus', fabricante: 'Boditech Med Inc', proveedor: 'DESEGO', pruebas: 24 },
    { nombre: 'PSA Libre', fabricante: 'Boditech Med Inc', proveedor: 'DESEGO', pruebas: 24 },
    { nombre: 'β-hCG', fabricante: 'Boditech Med Inc', proveedor: 'DESEGO', pruebas: 24 },
    { nombre: 'Cortisol', fabricante: 'Boditech Med Inc', proveedor: 'DESEGO', pruebas: 24 },
    { nombre: 'Hormona Antimülleriana', fabricante: 'Boditech Med Inc', proveedor: 'DESEGO', pruebas: 24 }
  ],
  'BACTERIOLOGIA': [
    { nombre: 'AF GENITAL SYSTEM', fabricante: 'Liofilchem', proveedor: 'Proveedor E', pruebas: 0 },
    { nombre: 'AGAR CHOCOLATE', fabricante: 'BD', proveedor: 'Proveedor F', pruebas: 0 },
    { nombre: 'AGAR MAC CONKEY', fabricante: 'BD', proveedor: 'Proveedor F', pruebas: 0 },
    { nombre: 'AGAR MUELLER HINTON', fabricante: 'BD', proveedor: 'Proveedor F', pruebas: 0 },
    { nombre: 'AGAR SANGRE', fabricante: 'BD', proveedor: 'Proveedor F', pruebas: 0 },
    { nombre: 'HEMOCULTIVO AEROBIO', fabricante: 'INVESTIGACION DIAGNOSTICA', proveedor: 'Proveedor G', pruebas: 0 },
  ],
  'PRUEBAS_RAPIDAS': [
    { nombre: 'VDRL', fabricante: 'SPINREACT', proveedor: 'Proveedor H', pruebas: 0 },
    { nombre: 'REACCIONES FEBRILES', fabricante: 'SPINREACT', proveedor: 'Proveedor H', pruebas: 0 },
    { nombre: 'HEPATITIS B', fabricante: 'BIOLINE', proveedor: 'Proveedor I', pruebas: 0 },
    { nombre: 'HEPATITIS C', fabricante: 'ABBOTT', proveedor: 'Proveedor J', pruebas: 0 },
    { nombre: 'VIH', fabricante: 'ABBOTT', proveedor: 'Proveedor J', pruebas: 0 },
  ],
  'TOMA_MUESTRA': [
    { nombre: 'AGUJAS 20X1 1/2', fabricante: 'B.D.', proveedor: 'Proveedor K', pruebas: 0 },
    { nombre: 'JERINGAS DE 20ML', fabricante: 'B.D.', proveedor: 'Proveedor K', pruebas: 0 },
    { nombre: 'GUANTES NITRILO', fabricante: 'MOSCARO', proveedor: 'Proveedor L', pruebas: 0 },
    { nombre: 'TUBO DORADO', fabricante: 'KABLA', proveedor: 'Proveedor M', pruebas: 0 },
    { nombre: 'TUBO AZUL', fabricante: 'MOSCARO', proveedor: 'Proveedor L', pruebas: 0 },
  ],
  'HEMATOLOGIA': [
    { nombre: 'THOMBOREL S', fabricante: 'SIEMENS', proveedor: 'Proveedor N', pruebas: 0 },
    { nombre: 'ACTIN', fabricante: 'SIEMENS', proveedor: 'Proveedor N', pruebas: 0 },
    { nombre: 'CONTROL N', fabricante: 'SIEMENS', proveedor: 'Proveedor N', pruebas: 0 },
    { nombre: 'CONTROL P', fabricante: 'SIEMENS', proveedor: 'Proveedor N', pruebas: 0 },
  ],
  'COAGULACION': [
    { nombre: 'THOMBOREL S', fabricante: 'SIEMENS', proveedor: 'Proveedor N', pruebas: 0 },
    { nombre: 'ACTIN', fabricante: 'SIEMENS', proveedor: 'Proveedor N', pruebas: 0 },
    { nombre: 'CaCl 2', fabricante: 'SIEMENS', proveedor: 'Proveedor N', pruebas: 0 },
  ],
  'MOLECULAR': [
    { nombre: 'SPOTFIRE', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 0 },
  ]
};

const DISCIPLINAS = [
  { value: 'QUIMICA_CLINICA', label: 'Química Clínica' },
  { value: 'INMUNOLOGIA', label: 'Inmunología' },
  { value: 'BACTERIOLOGIA', label: 'Bacteriología' },
  { value: 'PRUEBAS_RAPIDAS', label: 'Pruebas Rápidas' },
  { value: 'TOMA_MUESTRA', label: 'Toma de Muestra' },
  { value: 'HEMATOLOGIA', label: 'Hematología' },
  { value: 'COAGULACION', label: 'Coagulación' },
  { value: 'MOLECULAR', label: 'Molecular' },
  { value: 'UROANALISIS', label: 'Uroanálisis' },
];

export default function RecepcionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  const [fechaRecepcion, setFechaRecepcion] = useState(new Date().toISOString().split('T')[0]);
  const [disciplina, setDisciplina] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [fabricanteFiltro, setFabricanteFiltro] = useState('');
  
  const [productos, setProductos] = useState<Producto[]>([]);
  const [registros, setRegistros] = useState<RegistroRecepcion[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [factura, setFactura] = useState('');
  const [modo, setModo] = useState<'CREAR' | 'RECEPCION'>('CREAR');
  const [productosCatalogo, setProductosCatalogo] = useState<any[]>([]);

  // ---------- FUNCIÓN DE SANITIZACIÓN ----------
  const safeString = (value: any, defaultValue: string = ''): string => {
    if (value === undefined || value === null) return defaultValue;
    return String(value);
  };

  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === undefined || value === null) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };
  // ---------------------------------------------

  // Cargar productos cuando cambia la disciplina
  useEffect(() => {
    const cargarDatos = async () => {
      if (!disciplina) {
        setProductos([]);
        setRegistros([]);
        setProductosCatalogo([]);
        return;
      }
      
      setLoadingData(true);
      try {
        console.log('Cargando datos para disciplina:', disciplina);
        
        const productosRef = collection(db, 'productos');
        const q = query(
          productosRef,
          where('disciplina', '==', disciplina),
          orderBy('nombre')
        );
        
        const querySnapshot = await getDocs(q);
        const productosData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            stock_actual: safeNumber(data.stock_actual, 0),
            pruebas_por_caja: safeNumber(data.pruebas_por_caja, 0),
            codigo: safeString(data.codigo, ''),
          } as Producto;
        });
        
        console.log('Productos cargados de Firebase:', productosData.length);
        setProductos(productosData);
        
        if (productosData.length === 0) {
          setModo('CREAR');
          const catalogo = catalogoProductos[disciplina as keyof typeof catalogoProductos] || [];
          setProductosCatalogo(catalogo.map((prod, index) => ({
            ...prod,
            id: `catalogo-${index}`,
            codigo: `${disciplina.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`
          })));
        } else {
          setModo('RECEPCION');
          const catalogo = catalogoProductos[disciplina as keyof typeof catalogoProductos] || [];
          
          const nuevosRegistros: RegistroRecepcion[] = productosData.map(producto => {
            const productoCatalogo = catalogo.find(
              (p: any) => p.nombre === producto.nombre && p.fabricante === producto.fabricante
            );
            const pruebasPorCaja = safeNumber(
              productoCatalogo?.pruebas ?? producto.pruebas_por_caja, 0
            );
            
            return {
              productoId: producto.id,
              productoNombre: safeString(producto.nombre),
              // ⚠️ TRIPLE FALLBACK para código
              codigoProducto: safeString(producto.codigo) || producto.id || 'SIN-CODIGO',
              fabricante: safeString(producto.fabricante),
              unidad: safeString(producto.unidad_medida),
              stockActual: producto.stock_actual,
              pruebas: pruebasPorCaja,
              pruebasPorCaja: pruebasPorCaja,
              numeroLote: '',
              fechaVencimiento: '',
              nuevoStock: producto.stock_actual,
              proveedor: safeString(producto.proveedor)
            };
          });
          
          setRegistros(nuevosRegistros);
        }
        
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar datos. Verifica la conexión a Firebase.');
      } finally {
        setLoadingData(false);
      }
    };
    
    cargarDatos();
  }, [disciplina]);

  // Crear producto desde el catálogo
  const handleCrearProducto = async (nombre: string, fabricante: string, proveedor: string, pruebas: number = 0) => {
    setLoading(true);
    
    try {
      const catalogo = catalogoProductos[disciplina as keyof typeof catalogoProductos] || [];
      const productoCatalogo = catalogo.find(
        (p: any) => p.nombre === nombre && p.fabricante === fabricante
      );
      const pruebasPorCaja = safeNumber(productoCatalogo?.pruebas ?? pruebas, 0);

      const codigo = `${disciplina.slice(0, 3).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      await addDoc(collection(db, 'productos'), {
        nombre: safeString(nombre),
        codigo: codigo,
        disciplina: safeString(disciplina),
        categoria: 'Reactivo',
        unidad_medida: 'pruebas',
        stock_actual: 0,
        proveedor: safeString(proveedor),
        fabricante: safeString(fabricante),
        pruebas_por_caja: pruebasPorCaja,
        alerta_minima: 10,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      toast.success(`Producto "${nombre}" creado exitosamente`);
      
      // Recargar productos
      const productosRef = collection(db, 'productos');
      const q = query(
        productosRef,
        where('disciplina', '==', disciplina),
        orderBy('nombre')
      );
      
      const querySnapshot = await getDocs(q);
      const productosData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          stock_actual: safeNumber(data.stock_actual, 0),
          pruebas_por_caja: safeNumber(data.pruebas_por_caja, 0),
          codigo: safeString(data.codigo, ''),
        } as Producto;
      });
      
      setProductos(productosData);
      setModo('RECEPCION');
      
      const catalogoForDiscipline = catalogoProductos[disciplina as keyof typeof catalogoProductos] || [];
      
      const nuevosRegistros: RegistroRecepcion[] = productosData.map(producto => {
        const productoCatalogo = catalogoForDiscipline.find(
          (p: any) => p.nombre === producto.nombre && p.fabricante === producto.fabricante
        );
        const pruebasPorCaja = safeNumber(
          productoCatalogo?.pruebas ?? producto.pruebas_por_caja, 0
        );
        
        return {
          productoId: producto.id,
          productoNombre: safeString(producto.nombre),
          codigoProducto: safeString(producto.codigo) || producto.id || 'SIN-CODIGO',
          fabricante: safeString(producto.fabricante),
          unidad: safeString(producto.unidad_medida),
          stockActual: producto.stock_actual,
          pruebas: pruebasPorCaja,
          pruebasPorCaja: pruebasPorCaja,
          numeroLote: '',
          fechaVencimiento: '',
          nuevoStock: producto.stock_actual,
          proveedor: safeString(producto.proveedor)
        };
      });
      
      setRegistros(nuevosRegistros);
      
    } catch (error) {
      console.error('Error creando producto:', error);
      toast.error('Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar valores individuales
  const updateRegistroValue = (productoId: string, campo: keyof RegistroRecepcion, valor: string | number) => {
    setRegistros(prev => prev.map(registro => {
      if (registro.productoId === productoId) {
        if (campo === 'pruebas') {
          const numValor = typeof valor === 'string' ? parseInt(valor) || 0 : valor;
          return { 
            ...registro, 
            [campo]: numValor < 0 ? 0 : numValor 
          };
        }
        return { 
          ...registro, 
          [campo]: valor 
        };
      }
      return registro;
    }));
  };

  const handleAplicarPruebasPorCaja = (productoId: string) => {
    setRegistros(prev => prev.map(registro => {
      if (registro.productoId === productoId && registro.pruebasPorCaja && registro.pruebasPorCaja > 0) {
        return { 
          ...registro, 
          pruebas: registro.pruebasPorCaja
        };
      }
      return registro;
    }));
  };

  const incrementValue = (productoId: string, campo: keyof RegistroRecepcion) => {
    setRegistros(prev => prev.map(registro => {
      if (registro.productoId === productoId) {
        if (campo === 'pruebas') {
          const currentValue = safeNumber(registro.pruebas, 0);
          return { ...registro, [campo]: currentValue + 1 };
        }
      }
      return registro;
    }));
  };

  const decrementValue = (productoId: string, campo: keyof RegistroRecepcion) => {
    setRegistros(prev => prev.map(registro => {
      if (registro.productoId === productoId) {
        if (campo === 'pruebas') {
          const currentValue = safeNumber(registro.pruebas, 0);
          if (currentValue > 0) {
            return { ...registro, [campo]: currentValue - 1 };
          }
        }
      }
      return registro;
    }));
  };

  // Registrar recepción
  const handleRegistrarRecepcion = async () => {
    const tieneRecepciones = registros.some(registro => 
      safeNumber(registro.pruebas, 0) > 0 || 
      safeString(registro.numeroLote).trim() !== ''
    );
    
    if (!tieneRecepciones) {
      toast.error('No hay recepciones registradas');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Registrando recepción...');

    try {
      const batch = writeBatch(db);
      const ahora = Timestamp.now();
      let productosActualizados = 0;

      // (Opcional) Log para depuración
      console.log('Registros a procesar:', registros.map(r => ({
        productoId: r.productoId,
        productoNombre: r.productoNombre,
        codigoProducto: r.codigoProducto,
        tipo: typeof r.codigoProducto
      })));

      registros.forEach(registro => {
        const tieneDatos = safeNumber(registro.pruebas, 0) > 0 || safeString(registro.numeroLote).trim() !== '';
        
        if (tieneDatos) {
          const productoRef = doc(db, 'productos', registro.productoId);
          const nuevoStockCalculado = safeNumber(registro.stockActual, 0) + safeNumber(registro.pruebas, 0);
          
          const updateData: any = {
            stock_actual: nuevoStockCalculado,
            updated_at: serverTimestamp(),
          };
          
          if (safeString(registro.numeroLote).trim() !== '') {
            updateData.lote = safeString(registro.numeroLote);
          }
          if (safeString(registro.fechaVencimiento).trim() !== '') {
            updateData.fecha_vencimiento = safeString(registro.fechaVencimiento);
          }
          if (safeNumber(registro.pruebasPorCaja, 0) > 0) {
            updateData.pruebas_por_caja = safeNumber(registro.pruebasPorCaja);
          }
          
          batch.update(productoRef, updateData);
          productosActualizados++;

          const movimientoRef = doc(collection(db, 'movimientos'));
          
          // ---------- SANITIZACIÓN TOTAL ----------
          batch.set(movimientoRef, {
            id: safeString(movimientoRef.id),
            tipo: 'RECEPCION',
            producto_id: safeString(registro.productoId),
            producto_nombre: safeString(registro.productoNombre),
            // ⚠️ ESTE ES EL CAMPO CRÍTICO
            codigo_producto: safeString(registro.codigoProducto) || 'SIN-CODIGO',
            disciplina: safeString(disciplina),
            fabricante: safeString(registro.fabricante),
            cantidad: safeNumber(registro.pruebas, 0),
            unidad: safeString(registro.unidad),
            stock_anterior: safeNumber(registro.stockActual, 0),
            stock_nuevo: nuevoStockCalculado,
            numero_lote: safeString(registro.numeroLote) || 'N/A',
            fecha_vencimiento: safeString(registro.fechaVencimiento) || 'N/A',
            pruebas: safeNumber(registro.pruebas, 0),
            pruebas_por_caja: safeNumber(registro.pruebasPorCaja, 0),
            orden_compra: safeString(ordenCompra).trim() || 'N/A',
            factura: safeString(factura).trim() || 'N/A',
            proveedor: safeString(registro.proveedor) || 'N/A',
            usuario: 'usuario_actual',
            observaciones: safeString(observaciones).trim() || `Recepción registrada - ${fechaRecepcion}`,
            created_at: serverTimestamp(),
            fecha: ahora,
            fecha_recepcion: new Date(fechaRecepcion)
          });
        }
      });

      if (productosActualizados > 0) {
        await batch.commit();
        toast.dismiss(loadingToast);
        toast.success(`Recepción registrada para ${productosActualizados} productos`, { duration: 5000 });
        
        setTimeout(() => {
          router.refresh();
          resetFormulario();
        }, 2000);
      } else {
        toast.dismiss(loadingToast);
        toast.error('No hay datos válidos para registrar');
      }
      
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Error:', error);
      toast.error(`Error al registrar la recepción: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetFormulario = () => {
    if (modo === 'RECEPCION') {
      setRegistros(prev => prev.map(registro => ({
        ...registro,
        pruebas: registro.pruebasPorCaja || 0,
        numeroLote: '',
        fechaVencimiento: '',
        nuevoStock: registro.stockActual
      })));
    }
    setOrdenCompra('');
    setFactura('');
    setObservaciones('');
    toast.success('Valores reiniciados (pruebas restauradas a valor por caja)');
  };

  const resetTodo = () => {
    setDisciplina('');
    setProductos([]);
    setRegistros([]);
    setProductosCatalogo([]);
    setProveedorFiltro('');
    setFabricanteFiltro('');
    setBusqueda('');
    setObservaciones('');
    setOrdenCompra('');
    setFactura('');
    setFechaRecepcion(new Date().toISOString().split('T')[0]);
    setModo('CREAR');
    toast.success('Formulario reiniciado completamente');
  };

  const calcularTotales = () => {
    return registros.reduce((totales, registro) => ({
      pruebas: totales.pruebas + safeNumber(registro.pruebas, 0),
      productosConLote: totales.productosConLote + (safeString(registro.numeroLote).trim() ? 1 : 0),
      productosConRecepcion: totales.productosConRecepcion + 
        (safeNumber(registro.pruebas, 0) > 0 || safeString(registro.numeroLote).trim() !== '' ? 1 : 0),
      stockTotalAnterior: totales.stockTotalAnterior + safeNumber(registro.stockActual, 0),
      stockTotalNuevo: totales.stockTotalNuevo + (safeNumber(registro.stockActual, 0) + safeNumber(registro.pruebas, 0)),
      productosConPruebasPorCaja: totales.productosConPruebasPorCaja + (safeNumber(registro.pruebasPorCaja, 0) > 0 ? 1 : 0)
    }), { 
      pruebas: 0,
      productosConLote: 0,
      productosConRecepcion: 0,
      stockTotalAnterior: 0,
      stockTotalNuevo: 0,
      productosConPruebasPorCaja: 0
    });
  };

  const totales = calcularTotales();

  const productosCatalogoFiltrados = productosCatalogo.filter(producto =>
    safeString(producto.nombre).toLowerCase().includes(busqueda.toLowerCase()) ||
    safeString(producto.fabricante).toLowerCase().includes(busqueda.toLowerCase()) ||
    safeString(producto.proveedor).toLowerCase().includes(busqueda.toLowerCase())
  );

  const registrosFiltrados = registros.filter(registro => {
    const matchBusqueda = safeString(registro.productoNombre).toLowerCase().includes(busqueda.toLowerCase()) ||
                         safeString(registro.codigoProducto).toLowerCase().includes(busqueda.toLowerCase()) ||
                         safeString(registro.fabricante).toLowerCase().includes(busqueda.toLowerCase());
    
    const matchProveedor = !proveedorFiltro || 
                          safeString(registro.proveedor).toLowerCase().includes(proveedorFiltro.toLowerCase());
    
    const matchFabricante = !fabricanteFiltro || 
                           safeString(registro.fabricante).toLowerCase().includes(fabricanteFiltro.toLowerCase());
    
    return matchBusqueda && matchProveedor && matchFabricante;
  });

  const fabricantesUnicos = Array.from(new Set(
    registros.filter(r => safeString(r.fabricante)).map(r => safeString(r.fabricante))
  )).sort();

  const proveedoresUnicos = Array.from(new Set(
    registros.filter(r => safeString(r.proveedor)).map(r => safeString(r.proveedor))
  )).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="p-3 bg-white/20 rounded-xl">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  RECEPCIÓN DE PRODUCTOS POR DISCIPLINA
                </h1>
                <p className="text-white/90 mt-1">
                  Sistema de Control de Inventario - Desglose Automático
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => router.push('/inventario/dashboard')} 
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                <Home className="w-5 h-5" />
                Dashboard
              </button>
              <div className="bg-white/20 rounded-xl p-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-white" />
                <input 
                  type="date" 
                  value={fechaRecepcion}
                  onChange={(e) => setFechaRecepcion(e.target.value)}
                  className="bg-transparent text-white font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Selector de disciplina */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-gray-800 font-bold text-lg mb-3 flex items-center gap-2">
                <Package className="w-5 h-5" />
                <span className="text-red-500">*</span> Disciplina
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DISCIPLINAS.map((disc) => {
                  const tieneCatalogo = catalogoProductos.hasOwnProperty(disc.value);
                  return (
                    <button 
                      key={disc.value} 
                      type="button" 
                      onClick={() => setDisciplina(disc.value)}
                      className={`p-3 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                        disciplina === disc.value 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : tieneCatalogo
                            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <span className="font-medium text-xs">{disc.label}</span>
                      {tieneCatalogo && (
                        <span className="text-xs text-gray-500 mt-1">
                          ({catalogoProductos[disc.value as keyof typeof catalogoProductos]?.length || 0})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {disciplina && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-800 font-bold text-lg mb-2">
                    Orden de Compra
                  </label>
                  <input
                    type="text"
                    value={ordenCompra}
                    onChange={(e) => setOrdenCompra(e.target.value)}
                    placeholder="OC-2024-001"
                    className="w-full p-3 border-2 rounded-xl text-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-800 font-bold text-lg mb-2">
                    Número de Factura
                  </label>
                  <input
                    type="text"
                    value={factura}
                    onChange={(e) => setFactura(e.target.value)}
                    placeholder="FAC-2024-001"
                    className="w-full p-3 border-2 rounded-xl text-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modo CREAR: catálogo */}
        {modo === 'CREAR' && disciplina && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Package className="w-6 h-6 text-green-500" />
                    Catálogo de {DISCIPLINAS.find(d => d.value === disciplina)?.label}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({productosCatalogo.length} productos en catálogo)
                    </span>
                  </h2>
                  <p className="text-gray-600 mt-1 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    No hay productos registrados. Selecciona productos para crear.
                  </p>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar producto, fabricante o proveedor..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64"
                  />
                </div>
              </div>
            </div>

            <div className="p-6">
              {loadingData ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Cargando catálogo...</p>
                </div>
              ) : productosCatalogoFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No se encontraron productos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productosCatalogoFiltrados.map((producto, index) => (
                    <div 
                      key={index} 
                      className="border rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{producto.nombre}</h3>
                          <p className="text-sm text-gray-600">Fabricante: {producto.fabricante}</p>
                          <p className="text-sm text-gray-500">Proveedor: {producto.proveedor}</p>
                          {producto.pruebas > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-sm">
                              <TestTube className="w-4 h-4 text-blue-500" />
                              <span className="text-blue-600 font-medium">
                                {producto.pruebas} pruebas/caja
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleCrearProducto(producto.nombre, producto.fabricante, producto.proveedor, producto.pruebas)}
                          disabled={loading}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Creando...' : 'Crear Producto'}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Disciplina: {DISCIPLINAS.find(d => d.value === disciplina)?.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modo RECEPCION: tabla */}
        {modo === 'RECEPCION' && disciplina && productos.length > 0 && (
          <>
            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros de Búsqueda
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar producto, código o fabricante..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10 pr-4 py-3 border-2 rounded-xl w-full focus:border-green-500"
                  />
                </div>
                <div>
                  <select
                    value={fabricanteFiltro}
                    onChange={(e) => setFabricanteFiltro(e.target.value)}
                    className="w-full p-3 border-2 rounded-xl focus:border-green-500"
                  >
                    <option value="">Todos los fabricantes</option>
                    {fabricantesUnicos.map(fabricante => (
                      <option key={fabricante} value={fabricante}>
                        {fabricante}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={proveedorFiltro}
                    onChange={(e) => setProveedorFiltro(e.target.value)}
                    className="w-full p-3 border-2 rounded-xl focus:border-green-500"
                  >
                    <option value="">Todos los proveedores</option>
                    {proveedoresUnicos.map(proveedor => (
                      <option key={proveedor} value={proveedor}>
                        {proveedor}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setModo('CREAR')}
                  className="px-4 py-3 border border-green-500 text-green-500 rounded-xl hover:bg-green-50 transition-colors"
                >
                  Ver Catálogo
                </button>
              </div>
            </div>

            {/* Tabla de recepción */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
              <div className="p-6 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <List className="w-6 h-6 text-green-500" />
                      Recepción para {DISCIPLINAS.find(d => d.value === disciplina)?.label}
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({productos.length} productos registrados)
                      </span>
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Registra la recepción de productos, lotes y pruebas
                    </p>
                    {totales.productosConPruebasPorCaja > 0 && (
                      <div className="mt-2 text-sm text-blue-600 flex items-center gap-1">
                        <TestTube className="w-4 h-4" />
                        <span>{totales.productosConPruebasPorCaja} productos tienen valor predefinido de pruebas por caja</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Mostrando {registrosFiltrados.length} de {registros.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-700 border-r">Producto</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r">Stock Actual</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r">Fabricante</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r bg-blue-50">Pruebas/Caja</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r bg-amber-50"># Pruebas</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r bg-purple-50">Número de Lote</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r bg-red-50">Fecha Vencimiento</th>
                      <th className="p-4 text-center font-bold text-gray-700 bg-green-50">Nuevo Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map((registro) => (
                      <tr key={registro.productoId} className="border-b hover:bg-gray-50">
                        <td className="p-4 border-r">
                          <div className="font-medium text-gray-800">{registro.productoNombre}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Barcode className="w-3 h-3" />
                            {registro.codigoProducto}
                          </div>
                          {registro.proveedor && (
                            <div className="text-xs text-gray-500 mt-1">Prov: {registro.proveedor}</div>
                          )}
                        </td>
                        <td className="p-4 text-center border-r">
                          <div className={`text-xl font-bold ${
                            registro.stockActual === 0 ? 'text-red-600' : registro.stockActual <= 10 ? 'text-amber-600' : 'text-gray-800'
                          }`}>
                            {registro.stockActual}
                          </div>
                          <div className="text-sm text-gray-500">{registro.unidad}</div>
                        </td>
                        <td className="p-4 text-center border-r">
                          <div className="flex items-center justify-center gap-1">
                            <Factory className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{registro.fabricante || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center border-r bg-blue-50/50">
                          <div className="flex flex-col items-center justify-center">
                            <div className={`text-lg font-bold ${
                              registro.pruebasPorCaja && registro.pruebasPorCaja > 0 ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                              {registro.pruebasPorCaja && registro.pruebasPorCaja > 0 ? registro.pruebasPorCaja : 'N/A'}
                            </div>
                            {registro.pruebasPorCaja && registro.pruebasPorCaja > 0 && (
                              <button
                                onClick={() => handleAplicarPruebasPorCaja(registro.productoId)}
                                className="mt-1 text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                              >
                                Aplicar
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 border-r bg-amber-50/50">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center space-x-2 mb-1">
                              <button 
                                onClick={() => decrementValue(registro.productoId, 'pruebas')}
                                className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={registro.pruebas}
                                onChange={(e) => updateRegistroValue(registro.productoId, 'pruebas', parseInt(e.target.value) || 0)}
                                className="w-20 p-2 text-center border rounded-lg bg-white"
                              />
                              <button 
                                onClick={() => incrementValue(registro.productoId, 'pruebas')}
                                className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            {registro.pruebasPorCaja && registro.pruebasPorCaja > 0 && registro.pruebas !== registro.pruebasPorCaja && (
                              <div className="text-xs text-gray-500">
                                <span className="text-amber-600">
                                  {registro.pruebas > registro.pruebasPorCaja ? '+' : ''}
                                  {registro.pruebas - registro.pruebasPorCaja} vs. caja
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 border-r bg-purple-50/50">
                          <input
                            type="text"
                            value={registro.numeroLote}
                            onChange={(e) => updateRegistroValue(registro.productoId, 'numeroLote', e.target.value)}
                            placeholder="Lote-001"
                            className="w-full p-2 text-center border rounded-lg bg-white"
                          />
                        </td>
                        <td className="p-4 border-r bg-red-50/50">
                          <input
                            type="date"
                            value={registro.fechaVencimiento}
                            onChange={(e) => updateRegistroValue(registro.productoId, 'fechaVencimiento', e.target.value)}
                            className="w-full p-2 text-center border rounded-lg bg-white"
                          />
                        </td>
                        <td className="p-4 text-center bg-green-50/50">
                          <div className={`text-xl font-bold ${
                            ((registro.stockActual || 0) + (registro.pruebas || 0)) > (registro.stockActual || 0)
                              ? 'text-green-600' 
                              : ((registro.stockActual || 0) + (registro.pruebas || 0)) === (registro.stockActual || 0)
                                ? 'text-gray-800'
                                : 'text-red-600'
                          }`}>
                            {(registro.stockActual || 0) + (registro.pruebas || 0)}
                          </div>
                          <div className="text-sm text-gray-500">{registro.unidad}</div>
                          {(registro.pruebas || 0) > 0 && (
                            <div className="text-xs mt-1">
                              <span className="text-green-500">↑ +{registro.pruebas} pruebas</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="p-4 font-bold text-gray-800 border-r">TOTALES</td>
                      <td className="p-4 text-center border-r">
                        <div className="text-xl font-bold text-gray-800">{totales.stockTotalAnterior}</div>
                      </td>
                      <td className="p-4 text-center border-r">-</td>
                      <td className="p-4 text-center border-r bg-blue-50">
                        <div className="text-sm text-gray-700">{totales.productosConPruebasPorCaja}</div>
                        <div className="text-xs text-gray-500">productos con valor</div>
                      </td>
                      <td className="p-4 text-center border-r bg-amber-50">
                        <div className="text-xl font-bold text-amber-700">{totales.pruebas}</div>
                        <div className="text-xs text-gray-500">pruebas recibidas</div>
                      </td>
                      <td className="p-4 text-center border-r bg-purple-50">
                        <div className="text-xl font-bold text-purple-700">{totales.productosConLote}</div>
                        <div className="text-xs text-gray-500">productos con lote</div>
                      </td>
                      <td className="p-4 text-center border-r bg-red-50">-</td>
                      <td className="p-4 text-center bg-green-50">
                        <div className="text-xl font-bold text-green-700">{totales.stockTotalNuevo}</div>
                        <div className="text-xs text-gray-500">
                          {totales.stockTotalNuevo > totales.stockTotalAnterior ? (
                            <span className="text-green-600">↑ +{totales.stockTotalNuevo - totales.stockTotalAnterior}</span>
                          ) : 'Sin cambios'}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Observaciones y acciones */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <label className="block text-gray-800 font-bold text-lg mb-3">
              Observaciones Generales de la Recepción
            </label>
            <textarea 
              value={observaciones} 
              onChange={(e) => setObservaciones(e.target.value)} 
              placeholder="Observaciones sobre la recepción, condiciones del producto, etc..."
              className="w-full p-4 border-2 rounded-xl min-h-[100px] text-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex gap-4">
              <button 
                onClick={resetFormulario}
                disabled={loading || !disciplina || modo !== 'RECEPCION'}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="w-5 h-5" />
                Reiniciar Valores
              </button>
              <button 
                onClick={resetTodo}
                disabled={loading}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-all flex items-center gap-2"
              >
                Limpiar Todo
              </button>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => router.push('/inventario/dashboard')}
                disabled={loading}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRegistrarRecepcion}
                disabled={loading || !disciplina || totales.productosConRecepcion === 0 || modo !== 'RECEPCION'}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : `Registrar Recepción (${totales.productosConRecepcion})`}
              </button>
            </div>
          </div>

          {totales.productosConRecepcion > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Resumen de la Recepción
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-100 rounded-lg">
                  <div className="text-sm text-blue-700">Con Valor Predef.</div>
                  <div className="text-2xl font-bold text-blue-800">{totales.productosConPruebasPorCaja}</div>
                </div>
                <div className="text-center p-3 bg-amber-100 rounded-lg">
                  <div className="text-sm text-amber-700">Pruebas Recibidas</div>
                  <div className="text-2xl font-bold text-amber-800">{totales.pruebas}</div>
                </div>
                <div className="text-center p-3 bg-purple-100 rounded-lg">
                  <div className="text-sm text-purple-700">Productos con Lote</div>
                  <div className="text-2xl font-bold text-purple-800">{totales.productosConLote}</div>
                </div>
                <div className="text-center p-3 bg-green-100 rounded-lg">
                  <div className="text-sm text-green-700">Stock Incrementado</div>
                  <div className="text-2xl font-bold text-green-800">
                    +{totales.stockTotalNuevo - totales.stockTotalAnterior}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p><strong>Orden de Compra:</strong> {ordenCompra || 'No especificada'}</p>
                  <p><strong>Factura:</strong> {factura || 'No especificada'}</p>
                </div>
                <div>
                  <p><strong>Fecha de Recepción:</strong> {fechaRecepcion}</p>
                  <p><strong>Productos procesados:</strong> {totales.productosConRecepcion} de {productos.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}