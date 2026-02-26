'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, orderBy, 
  Timestamp, limit as firestoreLimit
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { 
  Download, RefreshCw, Search, Filter, 
  Calendar, FileText, ChevronDown, ChevronUp,
  Loader2, TrendingUp, TrendingDown, Printer,
  Eye, EyeOff
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Toaster = dynamic(
  () => import('react-hot-toast').then((mod) => mod.Toaster),
  { ssr: false }
);

// Interfaces
interface Movimiento {
  id: string;
  tipo: 'RECEPCION' | 'CONSUMO' | 'CIERRE_LOTE' | 'APERTURA_LOTE' | 'AJUSTE';
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
  usuario: string;
  observaciones: string;
  fecha: any;
  created_at: any;
  lote_id?: string;
  lote_numero?: string;
  orden_compra?: string;
  factura?: string;
  proveedor?: string;
  pruebas?: number;
  desglose?: {
    px?: number;
    control?: number;
    calibrador?: number;
    merma?: number;
  };
}

interface Filtros {
  fechaInicio: string;
  fechaFin: string;
  disciplina: string;
  tipoMovimiento: string;
  busqueda: string;
  usuario: string;
  producto: string;
}

interface Estadisticas {
  totalMovimientos: number;
  recepciones: number;
  consumos: number;
  ajustes: number;
  lotesCerrados: number;
  lotesAbiertos: number;
  cantidadTotal: number;
  productosDiferentes: number;
}

// Opciones para filtros
const DISCIPLINAS = [
  { value: '', label: 'Todas las disciplinas' },
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
  { value: '', label: 'Todos los tipos' },
  { value: 'RECEPCION', label: 'Recepción' },
  { value: 'CONSUMO', label: 'Consumo' },
  { value: 'CIERRE_LOTE', label: 'Cierre de Lote' },
  { value: 'APERTURA_LOTE', label: 'Apertura de Lote' },
  { value: 'AJUSTE', label: 'Ajuste' },
];

interface ReporteMovimientosProps {
  tipo?: 'general' | 'dia';
}

export default function ReporteMovimientos({ tipo = 'general' }: ReporteMovimientosProps) {
  const router = useRouter();
  
  // Estado para datos
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [movimientosFiltrados, setMovimientosFiltrados] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    totalMovimientos: 0,
    recepciones: 0,
    consumos: 0,
    ajustes: 0,
    lotesCerrados: 0,
    lotesAbiertos: 0,
    cantidadTotal: 0,
    productosDiferentes: 0
  });

  // Estado para filtros
  const [filtros, setFiltros] = useState<Filtros>({
    fechaInicio: tipo === 'dia' 
      ? new Date().toISOString().split('T')[0] 
      : (() => {
          const date = new Date();
          date.setDate(date.getDate() - 30);
          return date.toISOString().split('T')[0];
        })(),
    fechaFin: new Date().toISOString().split('T')[0],
    disciplina: '',
    tipoMovimiento: '',
    busqueda: '',
    usuario: '',
    producto: ''
  });

  // Estado para UI
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  const [detallesExpandidos, setDetallesExpandidos] = useState<Record<string, boolean>>({});
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(20);
  const [ordenarPor, setOrdenarPor] = useState<'fecha' | 'producto' | 'tipo' | 'cantidad'>('fecha');
  const [ordenAscendente, setOrdenAscendente] = useState(false);

  // Cargar movimientos
  const cargarMovimientos = useCallback(async () => {
    try {
      setLoading(true);

      // Construir query base
      let q = query(
        collection(db, 'movimientos'),
        orderBy('fecha', 'desc')
      );

      // Aplicar filtro de fecha
      if (filtros.fechaInicio && filtros.fechaFin) {
        const fechaInicioTimestamp = Timestamp.fromDate(new Date(filtros.fechaInicio));
        const fechaFinTimestamp = Timestamp.fromDate(new Date(filtros.fechaFin + 'T23:59:59'));
        
        q = query(
          q,
          where('fecha', '>=', fechaInicioTimestamp),
          where('fecha', '<=', fechaFinTimestamp)
        );
      }

      // Ejecutar query
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMovimientos([]);
        setMovimientosFiltrados([]);
        toast.success('No se encontraron movimientos para el período seleccionado');
        return;
      }

      // Procesar datos
      const datos: Movimiento[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          fecha: data.fecha?.toDate() || new Date(),
        } as Movimiento;
      });

      setMovimientos(datos);
      setMovimientosFiltrados(datos);
      
      // Calcular estadísticas
      calcularEstadisticas(datos);

      toast.success(`${datos.length} movimientos cargados`);

    } catch (error) {
      console.error('Error cargando movimientos:', error);
      toast.error('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  }, [filtros.fechaInicio, filtros.fechaFin]);

  // Calcular estadísticas
  const calcularEstadisticas = (datos: Movimiento[]) => {
    const estadisticas: Estadisticas = {
      totalMovimientos: datos.length,
      recepciones: datos.filter(m => m.tipo === 'RECEPCION').length,
      consumos: datos.filter(m => m.tipo === 'CONSUMO').length,
      ajustes: datos.filter(m => m.tipo === 'AJUSTE').length,
      lotesCerrados: datos.filter(m => m.tipo === 'CIERRE_LOTE').length,
      lotesAbiertos: datos.filter(m => m.tipo === 'APERTURA_LOTE').length,
      cantidadTotal: datos.reduce((sum, m) => sum + Math.abs(m.cantidad), 0),
      productosDiferentes: new Set(datos.map(m => m.producto_id)).size
    };
    
    setEstadisticas(estadisticas);
  };

  // Aplicar filtros
  useEffect(() => {
    let resultados = [...movimientos];

    // Aplicar filtro por disciplina
    if (filtros.disciplina) {
      resultados = resultados.filter(m => m.disciplina === filtros.disciplina);
    }

    // Aplicar filtro por tipo de movimiento
    if (filtros.tipoMovimiento) {
      resultados = resultados.filter(m => m.tipo === filtros.tipoMovimiento);
    }

    // Aplicar filtro de búsqueda
    if (filtros.busqueda) {
      const busquedaLower = filtros.busqueda.toLowerCase();
      resultados = resultados.filter(m =>
        m.producto_nombre.toLowerCase().includes(busquedaLower) ||
        m.codigo_producto.toLowerCase().includes(busquedaLower) ||
        m.usuario.toLowerCase().includes(busquedaLower) ||
        m.observaciones?.toLowerCase().includes(busquedaLower) ||
        m.numero_lote?.toLowerCase().includes(busquedaLower)
      );
    }

    // Aplicar ordenamiento
    resultados.sort((a, b) => {
      let valorA: any, valorB: any;
      
      switch (ordenarPor) {
        case 'fecha':
          valorA = a.fecha;
          valorB = b.fecha;
          break;
        case 'producto':
          valorA = a.producto_nombre;
          valorB = b.producto_nombre;
          break;
        case 'tipo':
          valorA = a.tipo;
          valorB = b.tipo;
          break;
        case 'cantidad':
          valorA = Math.abs(a.cantidad);
          valorB = Math.abs(b.cantidad);
          break;
        default:
          return 0;
      }
      
      if (ordenAscendente) {
        return valorA > valorB ? 1 : -1;
      } else {
        return valorA < valorB ? 1 : -1;
      }
    });

    setMovimientosFiltrados(resultados);
    setPaginaActual(1);
  }, [movimientos, filtros, ordenarPor, ordenAscendente]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarMovimientos();
  }, []);

  // Exportar a Excel
  const exportarExcel = () => {
    try {
      const datosExportar = movimientosFiltrados.map(mov => ({
        'Fecha': mov.fecha.toLocaleString(),
        'Producto': mov.producto_nombre,
        'Código': mov.codigo_producto,
        'Tipo': mov.tipo,
        'Cantidad': mov.cantidad,
        'Unidad': mov.unidad,
        'Stock Anterior': mov.stock_anterior,
        'Stock Nuevo': mov.stock_nuevo,
        'Lote': mov.numero_lote || 'N/A',
        'Usuario': mov.usuario,
        'Observaciones': mov.observaciones || '',
        'Disciplina': mov.disciplina,
        'Proveedor': mov.proveedor || 'N/A',
        'Factura': mov.factura || 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(datosExportar);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
      
      const nombreArchivo = tipo === 'dia' 
        ? `movimientos_dia_${new Date().toISOString().split('T')[0]}.xlsx`
        : `movimientos_${filtros.fechaInicio}_a_${filtros.fechaFin}.xlsx`;
      
      XLSX.writeFile(workbook, nombreArchivo);
      toast.success('Archivo exportado correctamente');
    } catch (error) {
      console.error('Error exportando Excel:', error);
      toast.error('Error al exportar el archivo');
    }
  };

  // Imprimir reporte
  const imprimirReporte = () => {
    window.print();
  };

  // Toggle detalles expandidos
  const toggleDetalles = (id: string) => {
    setDetallesExpandidos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Obtener color según tipo de movimiento
  const getColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'RECEPCION':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'CONSUMO':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'APERTURA_LOTE':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'CIERRE_LOTE':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'AJUSTE':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Obtener icono según tipo
  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'RECEPCION':
        return <TrendingUp className="w-4 h-4" />;
      case 'CONSUMO':
        return <TrendingDown className="w-4 h-4" />;
      case 'APERTURA_LOTE':
        return <ChevronUp className="w-4 h-4" />;
      case 'CIERRE_LOTE':
        return <ChevronDown className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Calcular paginación
  const totalPaginas = Math.ceil(movimientosFiltrados.length / itemsPorPagina);
  const indiceInicio = (paginaActual - 1) * itemsPorPagina;
  const indiceFin = indiceInicio + itemsPorPagina;
  const movimientosPaginados = movimientosFiltrados.slice(indiceInicio, indiceFin);

  return (
    <div className="p-4 sm:p-6">
      <Toaster position="top-right" />
      
      {/* Encabezado */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {tipo === 'dia' ? 'Movimientos del Día' : 'Reporte de Movimientos'}
        </h2>
        <p className="text-gray-600">
          {tipo === 'dia' 
            ? `Mostrando movimientos del ${new Date().toLocaleDateString()}`
            : `Período: ${filtros.fechaInicio} al ${filtros.fechaFin}`
          }
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Movimientos</p>
              <p className="text-2xl font-bold">{estadisticas.totalMovimientos}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Recepciones</p>
              <p className="text-2xl font-bold text-green-600">{estadisticas.recepciones}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Consumos</p>
              <p className="text-2xl font-bold text-red-600">{estadisticas.consumos}</p>
            </div>
            <div className="bg-red-100 p-2 rounded-full">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cantidad Total</p>
              <p className="text-2xl font-bold">{estadisticas.cantidadTotal}</p>
            </div>
            <div className="bg-purple-100 p-2 rounded-full">
              <Filter className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros principales */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </h3>
          <button
            onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {mostrarFiltrosAvanzados ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Filtros avanzados
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Fecha inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) => setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={filtros.fechaFin}
              onChange={(e) => setFiltros(prev => ({ ...prev, fechaFin: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Disciplina */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disciplina
            </label>
            <select
              value={filtros.disciplina}
              onChange={(e) => setFiltros(prev => ({ ...prev, disciplina: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DISCIPLINAS.map(disciplina => (
                <option key={disciplina.value} value={disciplina.value}>
                  {disciplina.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de movimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Movimiento
            </label>
            <select
              value={filtros.tipoMovimiento}
              onChange={(e) => setFiltros(prev => ({ ...prev, tipoMovimiento: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS_MOVIMIENTO.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros avanzados */}
        {mostrarFiltrosAvanzados && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Búsqueda
              </label>
              <input
                type="text"
                placeholder="Buscar por producto, lote, usuario..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                type="text"
                placeholder="Filtrar por usuario..."
                value={filtros.usuario}
                onChange={(e) => setFiltros(prev => ({ ...prev, usuario: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto
              </label>
              <input
                type="text"
                placeholder="Nombre del producto..."
                value={filtros.producto}
                onChange={(e) => setFiltros(prev => ({ ...prev, producto: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={cargarMovimientos}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Actualizar
          </button>

          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>

          <button
            onClick={imprimirReporte}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Ordenar por:</label>
              <select
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as any)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="fecha">Fecha</option>
                <option value="producto">Producto</option>
                <option value="tipo">Tipo</option>
                <option value="cantidad">Cantidad</option>
              </select>
              <button
                onClick={() => setOrdenAscendente(!ordenAscendente)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {ordenAscendente ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Mostrar:</label>
              <select
                value={itemsPorPagina}
                onChange={(e) => setItemsPorPagina(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Cargando movimientos...</span>
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron movimientos</p>
            <p className="text-gray-400">Intenta ajustar los filtros o seleccionar otro período</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="px-6 py-3 bg-gray-50 border-b">
              <p className="text-sm text-gray-600">
                Mostrando {indiceInicio + 1}-{Math.min(indiceFin, movimientosFiltrados.length)} de {movimientosFiltrados.length} movimientos
              </p>
            </div>

            {/* Tabla de movimientos */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lote
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detalles
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimientosPaginados.map((movimiento) => (
                    <tr key={movimiento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movimiento.fecha.toLocaleDateString()} {movimiento.fecha.toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{movimiento.producto_nombre}</p>
                          <p className="text-xs text-gray-500">{movimiento.codigo_producto}</p>
                          <p className="text-xs text-gray-400">{movimiento.disciplina}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getColorTipo(movimiento.tipo)}`}>
                          {getIconoTipo(movimiento.tipo)}
                          {movimiento.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movimiento.numero_lote || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold ${movimiento.tipo === 'RECEPCION' ? 'text-green-600' : 'text-red-600'}`}>
                          {movimiento.tipo === 'RECEPCION' ? '+' : movimiento.tipo === 'CONSUMO' ? '-' : ''}
                          {movimiento.cantidad} {movimiento.unidad}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{movimiento.stock_anterior}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-bold">{movimiento.stock_nuevo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movimiento.usuario}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleDetalles(movimiento.id)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          {detallesExpandidos[movimiento.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {detallesExpandidos[movimiento.id] ? 'Ocultar' : 'Ver'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                    disabled={paginaActual === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                    disabled={paginaActual === totalPaginas}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Página <span className="font-medium">{paginaActual}</span> de{' '}
                      <span className="font-medium">{totalPaginas}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {[...Array(totalPaginas)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setPaginaActual(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            paginaActual === i + 1
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
   );
  } //