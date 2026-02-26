'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, orderBy, 
  writeBatch, doc, serverTimestamp, Timestamp,
  startAfter, limit as firestoreLimit
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { 
  BarChart3, Download, FileText, Filter,
  History, Home, Package, RefreshCw,
  Search, TrendingUp, TrendingDown, ChevronDown, 
  ChevronUp, Loader2, Box
} from 'lucide-react';
import * as ExcelJS from 'exceljs';

const Toaster = dynamic(
  () => import('react-hot-toast').then((mod) => mod.Toaster),
  { ssr: false }
);

interface Movimiento {
  id: string;
  tipo: 'RECEPCION' | 'CONSUMO' | 'CIERRE_LOTE' | 'APERTURA_LOTE';
  producto_id: string;
  producto_nombre: string;
  codigo_producto: string;
  disciplina: string;
  fabricante: string;
  cantidad: number;
  unidad: string;
  stock_anterior: number;
  stock_nuevo: number;
  numero_lote?: string;
  fecha_vencimiento?: string;
  pruebas?: number;
  orden_compra?: string;
  factura?: string;
  proveedor?: string;
  usuario: string;
  observaciones: string;
  created_at: any;
  fecha: any;
  lote_id?: string;
  lote_numero?: string;
  lote_estado?: 'ACTIVO' | 'CERRADO';
  desglose?: {
    px?: number;
    control?: number;
    calibrador?: number;
    merma?: number;
  };
}

interface Lote {
  id: string;
  numero_lote: string;
  producto_id: string;
  producto_nombre: string;
  disciplina: string;
  fabricante: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  estado: 'ACTIVO' | 'CERRADO';
  fecha_apertura: any;
  fecha_cierre?: any;
  fecha_vencimiento?: string;
  observaciones?: string;
  movimientos: string[];
}

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

const TIPOS_MOVIMIENTO = [
  { value: 'TODOS', label: 'Todos los movimientos' },
  { value: 'RECEPCION', label: 'Recepción' },
  { value: 'CONSUMO', label: 'Consumo' },
  { value: 'CIERRE_LOTE', label: 'Cierre de Lote' },
  { value: 'APERTURA_LOTE', label: 'Apertura de Lote' },
];

interface Estadisticas {
  totalMovimientos: number;
  totalRecepciones: number;
  totalConsumos: number;
  totalProductos: number;
  totalLotes: number;
  lotesActivos: number;
  lotesCerrados: number;
  stockIncremento: number;
  stockDecremento: number;
  promedioDiario: number;
}

export default function ReporteHistorico() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  // Filtros
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState<string>(new Date().toISOString().split('T')[0]);
  const [disciplina, setDisciplina] = useState<string>('');
  const [tipoMovimiento, setTipoMovimiento] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  
  // Datos
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    totalMovimientos: 0,
    totalRecepciones: 0,
    totalConsumos: 0,
    totalProductos: 0,
    totalLotes: 0,
    lotesActivos: 0,
    lotesCerrados: 0,
    stockIncremento: 0,
    stockDecremento: 0,
    promedioDiario: 0,
  });
  
  // UI States
  const [mostrarDetalles, setMostrarDetalles] = useState<Record<string, boolean>>({});
  const [mostrarLotes, setMostrarLotes] = useState(true);
  const [mostrarGraficos, setMostrarGraficos] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(50);
  const [ultimoDoc, setUltimoDoc] = useState<any>(null);
  const [tieneMas, setTieneMas] = useState(true);
  const [datosCargados, setDatosCargados] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    console.log('useEffect ejecutado, cargando datos iniciales...');
    cargarDatosIniciales();
  }, [fechaInicio, fechaFin, disciplina, tipoMovimiento]);

  const cargarDatosIniciales = useCallback(async () => {
    console.log('cargarDatosIniciales ejecutado');
    console.log('Filtros actuales:', { fechaInicio, fechaFin, disciplina, tipoMovimiento });
    
    setLoadingData(true);
    setDatosCargados(false);
    setMovimientos([]);
    setUltimoDoc(null);
    setTieneMas(true);
    setPaginaActual(1);
    
    try {
      console.log('Iniciando carga de datos...');
      
      // Cargar movimientos y lotes en paralelo
      const [movimientosData, lotesData] = await Promise.all([
        cargarMovimientos(),
        cargarLotes()
      ]);
      
      console.log('Movimientos cargados:', movimientosData?.length || 0);
      console.log('Lotes cargados:', lotesData?.length || 0);
      
      if (movimientosData) {
        setMovimientos(movimientosData);
        
        // Calcular estadísticas
        calcularEstadisticas(movimientosData, lotesData || []);
      }
      
      if (lotesData) {
        setLotes(lotesData);
      }
      
      setDatosCargados(true);
      
    } catch (error) {
      console.error('Error en cargarDatosIniciales:', error);
      toast.error('Error al cargar los datos históricos');
    } finally {
      setLoadingData(false);
    }
  }, [fechaInicio, fechaFin, disciplina, tipoMovimiento]);

  const cargarMovimientos = async (cargarMas: boolean = false) => {
    console.log('cargarMovimientos ejecutado, cargarMas:', cargarMas);
    
    try {
      let movimientosQuery = collection(db, 'movimientos');
      let constraints: any[] = [];

      // Filtrar por fecha
      if (fechaInicio && fechaFin) {
        const startDate = new Date(fechaInicio);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(fechaFin);
        endDate.setHours(23, 59, 59, 999);
        
        console.log('Filtrando por fecha:', { startDate, endDate });
        
        constraints.push(where('fecha', '>=', Timestamp.fromDate(startDate)));
        constraints.push(where('fecha', '<=', Timestamp.fromDate(endDate)));
      }

      // Filtrar por disciplina
      if (disciplina) {
        console.log('Filtrando por disciplina:', disciplina);
        constraints.push(where('disciplina', '==', disciplina));
      }

      // Filtrar por tipo de movimiento
      if (tipoMovimiento !== 'TODOS') {
        console.log('Filtrando por tipo:', tipoMovimiento);
        constraints.push(where('tipo', '==', tipoMovimiento));
      }

      // Ordenar por fecha
      constraints.push(orderBy('fecha', 'desc'));
      constraints.push(firestoreLimit(100));

      if (cargarMas && ultimoDoc) {
        console.log('Cargando más después de:', ultimoDoc.id);
        constraints.push(startAfter(ultimoDoc));
      }

      const q = query(movimientosQuery, ...constraints);
      console.log('Query construida:', q);
      
      const snapshot = await getDocs(q);
      console.log('Snapshot obtenido, documentos:', snapshot.docs.length);

      if (snapshot.empty) {
        console.log('No hay documentos en la colección movimientos');
        if (cargarMas) {
          setTieneMas(false);
        }
        return cargarMas ? null : [];
      }

      const nuevosMovimientos = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          fecha: data.fecha?.toDate(),
          created_at: data.created_at?.toDate(),
        } as Movimiento;
      });

      console.log('Movimientos procesados:', nuevosMovimientos.length);
      console.log('Primer movimiento:', nuevosMovimientos[0]);

      if (cargarMas) {
        setMovimientos(prev => [...prev, ...nuevosMovimientos]);
      } else {
        setMovimientos(nuevosMovimientos);
      }

      setUltimoDoc(snapshot.docs[snapshot.docs.length - 1]);
      setTieneMas(snapshot.docs.length === 100);

      return nuevosMovimientos;

    } catch (error) {
      console.error('Error detallado cargando movimientos:', error);
      if (error instanceof Error) {
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
      }
      toast.error('Error al cargar movimientos: ' + (error instanceof Error ? error.message : 'Desconocido'));
      throw error;
    }
  };

  const cargarLotes = async () => {
    console.log('cargarLotes ejecutado');
    
    try {
      let lotesQuery = collection(db, 'lotes');
      let constraints: any[] = [];

      if (disciplina) {
        constraints.push(where('disciplina', '==', disciplina));
      }

      constraints.push(orderBy('fecha_apertura', 'desc'));
      constraints.push(firestoreLimit(50));

      const q = query(lotesQuery, ...constraints);
      const snapshot = await getDocs(q);
      console.log('Lotes cargados:', snapshot.docs.length);

      if (snapshot.empty) {
        console.log('No hay documentos en la colección lotes');
        return [];
      }

      const lotesData = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          fecha_apertura: data.fecha_apertura?.toDate(),
          fecha_cierre: data.fecha_cierre?.toDate(),
        } as Lote;
      });

      return lotesData;

    } catch (error) {
      console.error('Error cargando lotes:', error);
      toast.error('Error al cargar los lotes');
      return [];
    }
  };

  const calcularEstadisticas = (movimientosData: Movimiento[], lotesData: Lote[]) => {
    console.log('Calculando estadísticas con:', {
      movimientos: movimientosData.length,
      lotes: lotesData.length
    });
    
    const totalMovimientos = movimientosData.length;
    const totalRecepciones = movimientosData.filter(m => m.tipo === 'RECEPCION').length;
    const totalConsumos = movimientosData.filter(m => m.tipo === 'CONSUMO').length;
    
    const productosUnicos = Array.from(new Set(movimientosData.map(m => m.producto_id)));
    
    const stockIncremento = movimientosData
      .filter(m => m.tipo === 'RECEPCION')
      .reduce((sum, m) => sum + m.cantidad, 0);
    
    const stockDecremento = movimientosData
      .filter(m => m.tipo === 'CONSUMO')
      .reduce((sum, m) => sum + m.cantidad, 0);
    
    const fechaInicioObj = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    const diasPeriodo = Math.max(1, Math.floor((fechaFinObj.getTime() - fechaInicioObj.getTime()) / (1000 * 60 * 60 * 24)));
    
    const nuevasEstadisticas = {
      totalMovimientos,
      totalRecepciones,
      totalConsumos,
      totalProductos: productosUnicos.length,
      totalLotes: lotesData.length,
      lotesActivos: lotesData.filter(l => l.estado === 'ACTIVO').length,
      lotesCerrados: lotesData.filter(l => l.estado === 'CERRADO').length,
      stockIncremento,
      stockDecremento,
      promedioDiario: totalMovimientos / diasPeriodo,
    };
    
    console.log('Estadísticas calculadas:', nuevasEstadisticas);
    setEstadisticas(nuevasEstadisticas);
  };
  
  // Filtrar movimientos localmente
  const movimientosFiltrados = movimientos.filter(movimiento => {
    if (!busqueda) return true;
    
    const busquedaLower = busqueda.toLowerCase();
    return (
      movimiento.producto_nombre.toLowerCase().includes(busquedaLower) ||
      movimiento.codigo_producto.toLowerCase().includes(busquedaLower) ||
      movimiento.numero_lote?.toLowerCase().includes(busquedaLower) ||
      movimiento.proveedor?.toLowerCase().includes(busquedaLower) ||
      movimiento.usuario.toLowerCase().includes(busquedaLower)
    );
  });
  
  // Cerrar un lote
  const handleCerrarLote = async (loteId: string) => {
    if (!confirm('¿Estás seguro de cerrar este lote? Esta acción no se puede deshacer.')) {
      return;
    }
    
    setLoading(true);
    try {
      const loteRef = doc(db, 'lotes', loteId);
      const lote = lotes.find(l => l.id === loteId);
      
      if (!lote) {
        toast.error('Lote no encontrado');
        return;
      }

      const batch = writeBatch(db);
      const now = Timestamp.now();

      // Actualizar lote
      batch.update(loteRef, {
        estado: 'CERRADO',
        fecha_cierre: now,
        updated_at: serverTimestamp(),
      });

      // Crear movimiento de cierre
      const movimientoRef = doc(collection(db, 'movimientos'));
      batch.set(movimientoRef, {
        id: movimientoRef.id,
        tipo: 'CIERRE_LOTE',
        producto_id: lote.producto_id,
        producto_nombre: lote.producto_nombre,
        disciplina: lote.disciplina,
        lote_id: loteId,
        lote_numero: lote.numero_lote,
        lote_estado: 'CERRADO',
        cantidad: lote.cantidad_actual,
        usuario: 'Sistema',
        observaciones: `Cierre de lote ${lote.numero_lote}`,
        created_at: serverTimestamp(),
        fecha: now,
      });

      await batch.commit();
      toast.success(`Lote ${lote.numero_lote} cerrado exitosamente`);
      
      // Actualizar estado local
      setLotes(prev => prev.map(l => 
        l.id === loteId 
          ? { ...l, estado: 'CERRADO', fecha_cierre: now }
          : l
      ));

      // Recargar datos
      await cargarDatosIniciales();

    } catch (error) {
      console.error('Error cerrando lote:', error);
      toast.error('Error al cerrar el lote');
    } finally {
      setLoading(false);
    }
  };
  
  // Aperturar un lote
  const handleAperturarLote = async (movimiento: Movimiento) => {
    if (!movimiento.numero_lote) {
      toast.error('El movimiento no tiene número de lote');
      return;
    }
    
    // Verificar si ya existe un lote activo
    const loteExistente = lotes.find(l => 
      l.numero_lote === movimiento.numero_lote && 
      l.estado === 'ACTIVO' &&
      l.producto_id === movimiento.producto_id
    );
    
    if (loteExistente) {
      toast.error('Ya existe un lote activo con este número');
      return;
    }
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();

      // Crear nuevo lote
      const loteRef = doc(collection(db, 'lotes'));
      const nuevoLote = {
        id: loteRef.id,
        numero_lote: movimiento.numero_lote,
        producto_id: movimiento.producto_id,
        producto_nombre: movimiento.producto_nombre,
        disciplina: movimiento.disciplina,
        fabricante: movimiento.fabricante || 'No especificado',
        cantidad_inicial: movimiento.cantidad,
        cantidad_actual: movimiento.cantidad,
        estado: 'ACTIVO',
        fecha_apertura: now,
        fecha_vencimiento: movimiento.fecha_vencimiento,
        observaciones: `Aperturado desde recepción ${movimiento.id}`,
        movimientos: [movimiento.id],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      
      batch.set(loteRef, nuevoLote);

      // Crear movimiento de apertura
      const movimientoRef = doc(collection(db, 'movimientos'));
      batch.set(movimientoRef, {
        id: movimientoRef.id,
        tipo: 'APERTURA_LOTE',
        producto_id: movimiento.producto_id,
        producto_nombre: movimiento.producto_nombre,
        disciplina: movimiento.disciplina,
        lote_id: loteRef.id,
        lote_numero: movimiento.numero_lote,
        lote_estado: 'ACTIVO',
        cantidad: movimiento.cantidad,
        usuario: 'Sistema',
        observaciones: `Apertura de lote ${movimiento.numero_lote}`,
        created_at: serverTimestamp(),
        fecha: now,
      });

      await batch.commit();
      toast.success(`Lote ${movimiento.numero_lote} aperturado exitosamente`);
      
      // Recargar datos
      await cargarDatosIniciales();

    } catch (error) {
      console.error('Error aperturando lote:', error);
      toast.error('Error al aperturar el lote');
    } finally {
      setLoading(false);
    }
  };
  
  // Exportar a Excel usando exceljs
  const exportarExcel = async () => {
    if (movimientosFiltrados.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte Histórico');
      
      // Definir columnas
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 20 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Hora', key: 'hora', width: 12 },
        { header: 'Tipo', key: 'tipo', width: 15 },
        { header: 'Producto', key: 'producto', width: 30 },
        { header: 'Código', key: 'codigo', width: 15 },
        { header: 'Disciplina', key: 'disciplina', width: 20 },
        { header: 'Cantidad', key: 'cantidad', width: 12 },
        { header: 'Unidad', key: 'unidad', width: 10 },
        { header: 'Stock Anterior', key: 'stockAnterior', width: 15 },
        { header: 'Stock Nuevo', key: 'stockNuevo', width: 15 },
        { header: 'Número de Lote', key: 'numeroLote', width: 15 },
        { header: 'Fecha Vencimiento', key: 'fechaVencimiento', width: 15 },
        { header: 'Orden Compra', key: 'ordenCompra', width: 15 },
        { header: 'Factura', key: 'factura', width: 15 },
        { header: 'Proveedor', key: 'proveedor', width: 20 },
        { header: 'Usuario', key: 'usuario', width: 15 },
        { header: 'Observaciones', key: 'observaciones', width: 30 }
      ];
      
      // Agregar filas
      movimientosFiltrados.forEach(movimiento => {
        worksheet.addRow({
          id: movimiento.id,
          fecha: movimiento.fecha?.toLocaleDateString() || '',
          hora: movimiento.fecha?.toLocaleTimeString() || '',
          tipo: movimiento.tipo,
          producto: movimiento.producto_nombre,
          codigo: movimiento.codigo_producto,
          disciplina: movimiento.disciplina,
          cantidad: movimiento.cantidad,
          unidad: movimiento.unidad,
          stockAnterior: movimiento.stock_anterior,
          stockNuevo: movimiento.stock_nuevo,
          numeroLote: movimiento.numero_lote || '',
          fechaVencimiento: movimiento.fecha_vencimiento || '',
          ordenCompra: movimiento.orden_compra || '',
          factura: movimiento.factura || '',
          proveedor: movimiento.proveedor || '',
          usuario: movimiento.usuario,
          observaciones: movimiento.observaciones
        });
      });
      
      // Estilo para el encabezado
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fecha = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `reporte_historico_${fecha}.xlsx`;
      link.click();
      
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte exportado exitosamente');
      
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast.error('Error al exportar el reporte');
    }
  };
  
  // Toggle detalles
  const toggleDetalles = (id: string) => {
    setMostrarDetalles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Paginación local
  const totalPaginas = Math.ceil(movimientosFiltrados.length / itemsPorPagina);
  const movimientosPaginados = movimientosFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  // Cargar más datos
  const cargarMas = async () => {
    if (!tieneMas) return;
    
    setLoadingData(true);
    try {
      await cargarMovimientos(true);
      setPaginaActual(prev => prev + 1);
    } catch (error) {
      console.error('Error cargando más datos:', error);
      toast.error('Error al cargar más datos');
    } finally {
      setLoadingData(false);
    }
  };

  // Botón para debug
  const verificarDatos = () => {
    console.log('=== VERIFICACIÓN DE DATOS ===');
    console.log('Movimientos en estado:', movimientos.length);
    console.log('Movimientos filtrados:', movimientosFiltrados.length);
    console.log('Movimientos paginados:', movimientosPaginados.length);
    console.log('Datos cargados:', datosCargados);
    console.log('Filtros aplicados:', { fechaInicio, fechaFin, disciplina, tipoMovimiento });
    console.log('Primer movimiento:', movimientos[0]);
    
    // Verificar Firebase
    console.log('Firebase config:', {
      db: db ? 'Conectado' : 'No conectado',
      app: db.app ? 'App disponible' : 'App no disponible',
      projectId: db.app.options?.projectId || 'No disponible'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="p-3 bg-white/20 rounded-xl">
                <History className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  REPORTE HISTÓRICO Y GESTIÓN DE LOTES
                </h1>
                <p className="text-white/90 mt-1">
                  Análisis completo de movimientos y control de inventario
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => router.push('/inventario/dashboard')} 
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                <Home className="w-5 h-5" />
                Dashboard
              </button>
              <button 
                onClick={verificarDatos}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                Debug
              </button>
            </div>
          </div>
        </div>

        {/* Filtros principales */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Búsqueda
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disciplina
              </label>
              <select
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Todas las disciplinas</option>
                {DISCIPLINAS.map((disc) => (
                  <option key={disc.value} value={disc.value}>
                    {disc.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Movimiento
              </label>
              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                {TIPOS_MOVIMIENTO.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Búsqueda avanzada */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Búsqueda general
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por producto, código, lote, proveedor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Items por página
              </label>
              <select
                value={itemsPorPagina}
                onChange={(e) => {
                  setItemsPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="w-full p-2 border rounded-lg"
              >
                <option value={20}>20 items</option>
                <option value={50}>50 items</option>
                <option value={100}>100 items</option>
              </select>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={cargarDatosIniciales}
              disabled={loadingData}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loadingData ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </>
              )}
            </button>
            
            <button
              onClick={exportarExcel}
              disabled={movimientosFiltrados.length === 0}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
            
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setMostrarGraficos(!mostrarGraficos)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                {mostrarGraficos ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}
              </button>
              
              <button
                onClick={() => setMostrarLotes(!mostrarLotes)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
              >
                <Box className="w-4 h-4" />
                {mostrarLotes ? 'Ocultar Lotes' : 'Mostrar Lotes'}
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        {mostrarGraficos && datosCargados && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Movimientos</p>
                  <p className="text-2xl font-bold text-gray-800">{estadisticas.totalMovimientos}</p>
                </div>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <History className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Período: {fechaInicio} al {fechaFin}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Recepciones vs Consumos</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-600">
                      +{estadisticas.stockIncremento}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span className="text-lg font-bold text-red-600">
                      -{estadisticas.stockDecremento}
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {estadisticas.totalRecepciones} recepciones • {estadisticas.totalConsumos} consumos
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Gestión de Lotes</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-600">
                      {estadisticas.lotesActivos}
                    </span>
                    <span className="text-xs text-gray-500">activos</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-lg font-bold text-gray-600">
                      {estadisticas.lotesCerrados}
                    </span>
                    <span className="text-xs text-gray-500">cerrados</span>
                  </div>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Package className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Total: {estadisticas.totalLotes} lotes
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Promedio Diario</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {estadisticas.promedioDiario.toFixed(1)}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {estadisticas.totalProductos} productos únicos
              </div>
            </div>
          </div>
        )}

        {/* Sección de Lotes */}
        {mostrarLotes && lotes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Box className="w-6 h-6 text-amber-500" />
                Gestión de Lotes ({lotes.length} lotes)
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {estadisticas.lotesActivos} activos • {estadisticas.lotesCerrados} cerrados
                </span>
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left font-bold text-gray-700">Lote</th>
                    <th className="p-4 text-left font-bold text-gray-700">Producto</th>
                    <th className="p-4 text-center font-bold text-gray-700">Disciplina</th>
                    <th className="p-4 text-center font-bold text-gray-700">Estado</th>
                    <th className="p-4 text-center font-bold text-gray-700">Cantidad</th>
                    <th className="p-4 text-center font-bold text-gray-700">Fecha Apertura</th>
                    <th className="p-4 text-center font-bold text-gray-700">Vencimiento</th>
                    <th className="p-4 text-center font-bold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.map((lote) => (
                    <tr key={lote.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{lote.numero_lote}</div>
                      </td>
                      
                      <td className="p-4">
                        <div className="font-medium">{lote.producto_nombre}</div>
                        <div className="text-sm text-gray-500">{lote.fabricante}</div>
                      </td>
                      
                      <td className="p-4 text-center">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {DISCIPLINAS.find(d => d.value === lote.disciplina)?.label || lote.disciplina}
                        </span>
                      </td>
                      
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          lote.estado === 'ACTIVO'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {lote.estado === 'ACTIVO' ? 'ACTIVO' : 'CERRADO'}
                        </span>
                      </td>
                      
                      <td className="p-4 text-center">
                        <div className="font-bold text-gray-800">{lote.cantidad_actual}</div>
                        <div className="text-xs text-gray-500">Inicial: {lote.cantidad_inicial}</div>
                      </td>
                      
                      <td className="p-4 text-center">
                        <div className="text-sm">
                          {lote.fecha_apertura?.toLocaleDateString() || 'No especificada'}
                        </div>
                      </td>
                      
                      <td className="p-4 text-center">
                        <div className={`text-sm ${
                          lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) < new Date()
                            ? 'text-red-600 font-bold'
                            : 'text-gray-700'
                        }`}>
                          {lote.fecha_vencimiento || 'No especificado'}
                        </div>
                      </td>
                      
                      <td className="p-4 text-center">
                        {lote.estado === 'ACTIVO' ? (
                          <button
                            onClick={() => handleCerrarLote(lote.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                          >
                            Cerrar Lote
                          </button>
                        ) : (
                          <span className="text-sm text-gray-500">Cerrado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabla de movimientos */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-indigo-500" />
                  Histórico de Movimientos
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    {movimientosFiltrados.length} registros encontrados
                  </span>
                </h2>
                <p className="text-gray-600 mt-1">
                  Detalle completo de recepciones, consumos y operaciones
                </p>
              </div>
              
              <div className="text-sm text-gray-600">
                Página {paginaActual} de {totalPaginas}
              </div>
            </div>
          </div>
          
          {loadingData && !datosCargados ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Cargando movimientos...</p>
            </div>
          ) : movimientosFiltrados.length === 0 && datosCargados ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No se encontraron movimientos con los filtros aplicados</p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => {
                    setDisciplina('');
                    setTipoMovimiento('TODOS');
                    setBusqueda('');
                  }}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  Limpiar filtros
                </button>
                <button
                  onClick={verificarDatos}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Verificar datos
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-700">Fecha</th>
                      <th className="p-4 text-left font-bold text-gray-700">Tipo</th>
                      <th className="p-4 text-left font-bold text-gray-700">Producto</th>
                      <th className="p-4 text-center font-bold text-gray-700">Cantidad</th>
                      <th className="p-4 text-center font-bold text-gray-700">Stock</th>
                      <th className="p-4 text-center font-bold text-gray-700">Lote</th>
                      <th className="p-4 text-center font-bold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosPaginados.map((movimiento) => (
                      <>
                        <tr key={movimiento.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="text-sm font-medium text-gray-800">
                              {movimiento.fecha?.toLocaleDateString() || 'Sin fecha'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {movimiento.fecha?.toLocaleTimeString() || ''}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              movimiento.tipo === 'RECEPCION' ? 'bg-green-100 text-green-800' :
                              movimiento.tipo === 'CONSUMO' ? 'bg-blue-100 text-blue-800' :
                              movimiento.tipo === 'CIERRE_LOTE' ? 'bg-purple-100 text-purple-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {movimiento.tipo}
                            </span>
                          </td>
                          
                          <td className="p-4">
                            <div className="font-medium text-gray-800">
                              {movimiento.producto_nombre || 'Sin nombre'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {movimiento.codigo_producto || 'Sin código'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {DISCIPLINAS.find(d => d.value === movimiento.disciplina)?.label || movimiento.disciplina || 'Sin disciplina'}
                            </div>
                          </td>
                          
                          <td className="p-4 text-center">
                            <div className={`text-lg font-bold ${
                              movimiento.tipo === 'RECEPCION' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {movimiento.tipo === 'RECEPCION' ? '+' : '-'}{movimiento.cantidad || 0}
                            </div>
                            <div className="text-xs text-gray-500">{movimiento.unidad || 'unidades'}</div>
                          </td>
                          
                          <td className="p-4 text-center">
                            <div className="text-sm">
                              <span className="text-gray-500">{movimiento.stock_anterior || 0}</span>
                              <span className="mx-1">→</span>
                              <span className="font-bold text-gray-800">{movimiento.stock_nuevo || 0}</span>
                            </div>
                          </td>
                          
                          <td className="p-4 text-center">
                            {movimiento.numero_lote ? (
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-gray-800">
                                  {movimiento.numero_lote}
                                </span>
                                {movimiento.fecha_vencimiento && (
                                  <span className="text-xs text-gray-500">
                                    Vence: {movimiento.fecha_vencimiento}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Sin lote</span>
                            )}
                          </td>
                          
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => toggleDetalles(movimiento.id)}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Ver detalles"
                              >
                                {mostrarDetalles[movimiento.id] ? (
                                  <ChevronUp className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                              
                              {movimiento.tipo === 'RECEPCION' && 
                               movimiento.numero_lote && 
                               !lotes.some(l => 
                                 l.numero_lote === movimiento.numero_lote && 
                                 l.estado === 'ACTIVO' &&
                                 l.producto_id === movimiento.producto_id
                               ) && (
                                <button
                                  onClick={() => handleAperturarLote(movimiento)}
                                  disabled={loading}
                                  className="px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600 disabled:opacity-50"
                                  title="Aperturar lote"
                                >
                                  <Package className="w-3 h-3 inline mr-1" />
                                  Lote
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {mostrarDetalles[movimiento.id] && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <h4 className="font-bold text-gray-700 mb-2">Información Detallada</h4>
                                  <div className="space-y-1">
                                    <p><span className="font-medium">ID:</span> {movimiento.id}</p>
                                    <p><span className="font-medium">Usuario:</span> {movimiento.usuario || 'No especificado'}</p>
                                    <p><span className="font-medium">Proveedor:</span> {movimiento.proveedor || 'No especificado'}</p>
                                    <p><span className="font-medium">Factura:</span> {movimiento.factura || 'No especificada'}</p>
                                    {movimiento.orden_compra && (
                                      <p><span className="font-medium">Orden Compra:</span> {movimiento.orden_compra}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-bold text-gray-700 mb-2">Observaciones</h4>
                                  <p className="text-gray-600">{movimiento.observaciones || 'Sin observaciones'}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación y cargar más */}
              <div className="p-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {Math.min(movimientosPaginados.length, itemsPorPagina)} de {movimientosFiltrados.length} registros
                  </div>
                  
                  {totalPaginas > 1 && (
                    <div className="flex items-center gap-2">
                      {paginaActual > 1 && (
                        <button
                          onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                          className="px-3 py-1 border rounded hover:bg-gray-100"
                        >
                          Anterior
                        </button>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                          let pageNum;
                          if (totalPaginas <= 5) {
                            pageNum = i + 1;
                          } else if (paginaActual <= 3) {
                            pageNum = i + 1;
                          } else if (paginaActual >= totalPaginas - 2) {
                            pageNum = totalPaginas - 4 + i;
                          } else {
                            pageNum = paginaActual - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPaginaActual(pageNum)}
                              className={`w-8 h-8 rounded ${
                                paginaActual === pageNum
                                  ? 'bg-indigo-500 text-white'
                                  : 'border hover:bg-gray-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      {paginaActual < totalPaginas && (
                        <button
                          onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                          className="px-3 py-1 border rounded hover:bg-gray-100"
                        >
                          Siguiente
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {tieneMas && (
                  <div className="text-center mt-4">
                    <button
                      onClick={cargarMas}
                      disabled={loadingData}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {loadingData ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cargando más...
                        </>
                      ) : (
                        'Cargar más datos'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}