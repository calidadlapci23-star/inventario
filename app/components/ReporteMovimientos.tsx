'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
  limit,
  where,
} from 'firebase/firestore';
import {
  Calendar,
  Package,
  TrendingDown,
  Truck,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  TestTube,
  FileText,
  Info,
} from 'lucide-react';

// Interfaces para cada tipo de movimiento (actualizadas)
interface MovimientoConsumo {
  id: string;
  tipo: 'CONSUMO';
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  unidad: string;
  desglose: {
    px: number;
    control: number;
    calibrador: number;
    merma: number;
  };
  stock_anterior: number;
  stock_nuevo: number;
  proveedor: string;
  usuario: string;
  observaciones: string;
  fecha: Timestamp;
  fecha_consumo?: Date;
  agotado?: boolean;
  // Nuevos campos para cierre/apertura de lote
  lote_actual?: string;
  lote_cerrado?: string;
  responsable_cierre?: string;
  responsable_apertura?: string;
  observaciones_lote?: string;
  datos_confirmados?: boolean;
}

interface MovimientoRecepcion {
  id: string;
  tipo: 'RECEPCION';
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  unidad: string;
  stock_anterior: number;
  stock_nuevo: number;
  numero_lote?: string;
  fecha_vencimiento?: string;
  pruebas?: number;
  pruebas_por_caja?: number;
  orden_compra?: string;   // <-- Nuevo campo
  factura?: string;
  proveedor: string;
  usuario: string;
  observaciones: string;
  fecha: Timestamp;
  fecha_recepcion?: Date;
}

interface MovimientoInventario {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: 'recepcion' | 'ajuste' | 'consumo'; // Se mapeará según el documento
  cantidad: number;
  pruebas_por_caja?: number;
  total_unidades: number;
  stockAnterior: number;
  stockNuevo: number;
  referencia?: string;
  numeroFactura?: string;
  usuario: string;
  fecha: Timestamp;
  observaciones: string;
  lote?: string;
  fecha_vencimiento?: string;
  // Posiblemente orden de compra también
  orden_compra?: string;
}

// Tipo unificado para mostrar en el reporte
interface MovimientoUnificado {
  id: string;
  fecha: Date;
  tipo: string; // 'CONSUMO', 'RECEPCION', 'RECEPCION_SUMINISTROS', 'AJUSTE', etc.
  producto: string;
  cantidad: number;
  unidad: string;
  stockAnterior: number;
  stockNuevo: number;
  proveedor: string;
  lote?: string;
  factura?: string;
  pruebasPorCaja?: number;
  ordenCompra?: string;   // <-- Nuevo campo unificado
  observaciones: string;
  usuario: string;
  fuente: string; // colección origen
  // Campos adicionales para detalles (se mostrarán en tooltip)
  detalles?: {
    desglose?: { px: number; control: number; calibrador: number; merma: number };
    responsableCierre?: string;
    responsableApertura?: string;
    loteCerrado?: string;
    observacionesLote?: string;
    fechaVencimiento?: string;
  };
}

export default function ReporteMovimientos() {
  const [movimientos, setMovimientos] = useState<MovimientoUnificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [fechaFin, setFechaFin] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [proveedorFiltro, setProveedorFiltro] = useState<string>('');

  const [refrescando, setRefrescando] = useState(false);

  const tipos = ['todos', 'CONSUMO', 'RECEPCION', 'RECEPCION_SUMINISTROS', 'AJUSTE'];

  const cargarMovimientos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Convertir fechas a Timestamps para la consulta
      const inicio = Timestamp.fromDate(new Date(fechaInicio));
      const fin = Timestamp.fromDate(new Date(new Date(fechaFin).setHours(23, 59, 59, 999)));

      // 1. Consultar movimientos (colección principal) con filtro de fecha
      const movimientosRef = collection(db, 'movimientos');
      const qMovimientos = query(
        movimientosRef,
        where('fecha', '>=', inicio),
        where('fecha', '<=', fin),
        orderBy('fecha', 'desc'),
        limit(1000)
      );
      const snapshotMovimientos = await getDocs(qMovimientos);
      console.log(`📦 Movimientos encontrados: ${snapshotMovimientos.size}`);

      const movimientosData = snapshotMovimientos.docs.map((doc) => {
        const data = doc.data();
        // 🔥 Eliminar cualquier campo 'id' interno que pueda sobrescribir el ID real
        const { id: _, ...dataSinId } = data;
        // Asegurar que fecha sea Date
        const fecha = data.fecha?.toDate?.() || new Date();

        if (data.tipo === 'CONSUMO') {
          const detalles: any = {};
          if (data.desglose) detalles.desglose = data.desglose;
          if (data.responsable_cierre) detalles.responsableCierre = data.responsable_cierre;
          if (data.responsable_apertura) detalles.responsableApertura = data.responsable_apertura;
          if (data.lote_cerrado) detalles.loteCerrado = data.lote_cerrado;
          if (data.observaciones_lote) detalles.observacionesLote = data.observaciones_lote;

          return {
            id: doc.id,
            fecha,
            tipo: 'CONSUMO',
            producto: data.producto_nombre || 'Sin nombre',
            cantidad: data.cantidad || 0,
            unidad: data.unidad || 'unidades',
            stockAnterior: data.stock_anterior || 0,
            stockNuevo: data.stock_nuevo || 0,
            proveedor: data.proveedor || 'N/A',
            lote: data.lote_actual || '',
            factura: '',
            pruebasPorCaja: undefined,
            ordenCompra: '',
            observaciones: data.observaciones || '',
            usuario: data.usuario || 'Sistema',
            fuente: 'movimientos',
            detalles: Object.keys(detalles).length > 0 ? detalles : undefined,
          } as MovimientoUnificado;
        } else if (data.tipo === 'RECEPCION') {
          return {
            id: doc.id,
            fecha,
            tipo: 'RECEPCION',
            producto: data.producto_nombre || 'Sin nombre',
            cantidad: data.cantidad || 0,
            unidad: data.unidad || 'unidades',
            stockAnterior: data.stock_anterior || 0,
            stockNuevo: data.stock_nuevo || 0,
            proveedor: data.proveedor || 'N/A',
            lote: data.numero_lote || '',
            factura: data.factura || '',
            pruebasPorCaja: data.pruebas_por_caja || undefined,
            ordenCompra: data.orden_compra || '',
            observaciones: data.observaciones || '',
            usuario: data.usuario || 'Sistema',
            fuente: 'movimientos',
            detalles: data.fecha_vencimiento ? { fechaVencimiento: data.fecha_vencimiento } : undefined,
          } as MovimientoUnificado;
        }
        return null;
      }).filter(Boolean) as MovimientoUnificado[];

      // 2. Consultar movimientos_inventario con filtro de fecha
      const inventarioRef = collection(db, 'movimientos_inventario');
      const qInventario = query(
        inventarioRef,
        where('fecha', '>=', inicio),
        where('fecha', '<=', fin),
        orderBy('fecha', 'desc'),
        limit(1000)
      );
      const snapshotInventario = await getDocs(qInventario);
      console.log(`📦 movimientos_inventario encontrados: ${snapshotInventario.size}`);

      const inventarioData = snapshotInventario.docs.map((doc) => {
        const data = doc.data();
        // 🔥 Eliminar cualquier campo 'id' interno que pueda sobrescribir el ID real
        const { id: _, ...dataSinId } = data;
        const fecha = data.fecha?.toDate?.() || new Date();
        let tipoUnificado = 'RECEPCION_SUMINISTROS';
        if (data.tipo === 'ajuste') tipoUnificado = 'AJUSTE';
        else if (data.tipo === 'consumo') tipoUnificado = 'CONSUMO_SUMINISTROS';
        else if (data.tipo === 'recepcion') tipoUnificado = 'RECEPCION_SUMINISTROS';

        return {
          id: doc.id,
          fecha,
          tipo: tipoUnificado,
          producto: data.productoNombre || 'Sin nombre',
          cantidad: data.total_unidades || data.cantidad || 0,
          unidad: 'pruebas',
          stockAnterior: data.stockAnterior || 0,
          stockNuevo: data.stockNuevo || 0,
          proveedor: data.proveedor || 'N/A',
          lote: data.lote || '',
          factura: data.numeroFactura || '',
          pruebasPorCaja: data.pruebas_por_caja || undefined,
          ordenCompra: data.orden_compra || '',
          observaciones: data.observaciones || '',
          usuario: data.usuario || 'Sistema',
          fuente: 'movimientos_inventario',
          detalles: data.fecha_vencimiento ? { fechaVencimiento: data.fecha_vencimiento } : undefined,
        } as MovimientoUnificado;
      });

      const todos = [...movimientosData, ...inventarioData];
      // Ordenar por fecha descendente (por si acaso)
      todos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      setMovimientos(todos);
    } catch (err: any) {
      console.error('Error cargando movimientos:', err);
      setError('No se pudieron cargar los movimientos. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarMovimientos();
  }, [fechaInicio, fechaFin]); // Recargar cuando cambien las fechas

  const handleRefresh = () => {
    setRefrescando(true);
    cargarMovimientos();
  };

  // Obtener lista única de proveedores para el filtro
  const proveedoresUnicos = useMemo(() => {
    const proveedores = movimientos.map((m) => m.proveedor).filter(Boolean);
    return [...new Set(proveedores)].sort();
  }, [movimientos]);

  // Filtrar movimientos
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      // Filtro por tipo
      if (tipoFiltro !== 'todos' && mov.tipo !== tipoFiltro) return false;

      // Búsqueda por texto (producto, observaciones, lote, factura, ordenCompra)
      if (busqueda) {
        const texto = busqueda.toLowerCase();
        if (
          !mov.producto.toLowerCase().includes(texto) &&
          !mov.observaciones.toLowerCase().includes(texto) &&
          !(mov.lote && mov.lote.toLowerCase().includes(texto)) &&
          !(mov.factura && mov.factura.toLowerCase().includes(texto)) &&
          !(mov.ordenCompra && mov.ordenCompra.toLowerCase().includes(texto))
        ) {
          return false;
        }
      }

      // Filtro por proveedor
      if (proveedorFiltro && mov.proveedor !== proveedorFiltro) return false;

      return true;
    });
  }, [movimientos, tipoFiltro, busqueda, proveedorFiltro]);

  // Calcular totales
  const totales = useMemo(() => {
    let consumos = 0;
    let recepciones = 0;
    let recepcionesSum = 0;
    let ajustes = 0;
    let cantidadTotal = 0;

    movimientosFiltrados.forEach((mov) => {
      if (mov.tipo === 'CONSUMO') {
        consumos += mov.cantidad;
      } else if (mov.tipo === 'RECEPCION') {
        recepciones += mov.cantidad;
      } else if (mov.tipo === 'RECEPCION_SUMINISTROS') {
        recepcionesSum += mov.cantidad;
      } else if (mov.tipo === 'AJUSTE') {
        ajustes += mov.cantidad;
      }
      cantidadTotal += mov.cantidad;
    });

    return {
      consumos,
      recepciones,
      recepcionesSum,
      ajustes,
      cantidadTotal,
      count: movimientosFiltrados.length,
    };
  }, [movimientosFiltrados]);

  // Función para exportar a CSV
  const exportarCSV = () => {
    const headers = [
      'Fecha', 'Tipo', 'Producto', 'Cantidad', 'Unidad',
      'Stock Ant.', 'Stock Nuevo', 'Proveedor', 'Lote', 'Factura',
      'Orden Compra', 'Pruebas/Caja', 'Observaciones', 'Usuario',
      'Detalles'
    ];
    const rows = movimientosFiltrados.map((mov) => {
      let detallesStr = '';
      if (mov.detalles) {
        const parts = [];
        if (mov.detalles.desglose) {
          parts.push(`PX:${mov.detalles.desglose.px} Ctrl:${mov.detalles.desglose.control} Cal:${mov.detalles.desglose.calibrador} Merma:${mov.detalles.desglose.merma}`);
        }
        if (mov.detalles.responsableCierre) parts.push(`Cierra:${mov.detalles.responsableCierre}`);
        if (mov.detalles.responsableApertura) parts.push(`Abre:${mov.detalles.responsableApertura}`);
        if (mov.detalles.loteCerrado) parts.push(`Lote Cerrado:${mov.detalles.loteCerrado}`);
        if (mov.detalles.observacionesLote) parts.push(`Obs Lote:${mov.detalles.observacionesLote}`);
        if (mov.detalles.fechaVencimiento) parts.push(`Vence:${mov.detalles.fechaVencimiento}`);
        detallesStr = parts.join(' | ');
      }
      return [
        mov.fecha.toLocaleDateString(),
        mov.tipo,
        mov.producto,
        mov.cantidad,
        mov.unidad,
        mov.stockAnterior,
        mov.stockNuevo,
        mov.proveedor,
        mov.lote || '',
        mov.factura || '',
        mov.ordenCompra || '',
        mov.pruebasPorCaja || '',
        mov.observaciones,
        mov.usuario,
        detallesStr,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading && !refrescando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando movimientos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Reporte de Movimientos de Inventario
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refrescando}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refrescando ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={exportarCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {t === 'todos' ? 'Todos' : t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Producto, lote, factura, OC, observaciones..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select
                value={proveedorFiltro}
                onChange={(e) => setProveedorFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {proveedoresUnicos.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFechaInicio(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
                  setFechaFin(new Date().toISOString().split('T')[0]);
                  setTipoFiltro('todos');
                  setBusqueda('');
                  setProveedorFiltro('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total movimientos</p>
                <p className="text-2xl font-bold text-gray-800">{totales.count}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Consumos</p>
                <p className="text-2xl font-bold text-red-600">{totales.consumos}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recepciones</p>
                <p className="text-2xl font-bold text-green-600">{totales.recepciones}</p>
              </div>
              <Truck className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recepciones (Sum.)</p>
                <p className="text-2xl font-bold text-purple-600">{totales.recepcionesSum}</p>
              </div>
              <Package className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ajustes</p>
                <p className="text-2xl font-bold text-amber-600">{totales.ajustes}</p>
              </div>
              <TestTube className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cantidad total</p>
                <p className="text-2xl font-bold text-blue-600">{totales.cantidadTotal}</p>
              </div>
              <TestTube className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Tabla de movimientos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No se encontraron movimientos con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Ant.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Nuevo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura/OC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pruebas/Caja</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observaciones</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movimientosFiltrados.map((mov) => (
                    <tr key={`${mov.fuente}-${mov.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                        {mov.fecha.toLocaleDateString()} {mov.fecha.toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            mov.tipo === 'CONSUMO'
                              ? 'bg-red-100 text-red-800'
                              : mov.tipo === 'RECEPCION'
                              ? 'bg-green-100 text-green-800'
                              : mov.tipo === 'RECEPCION_SUMINISTROS'
                              ? 'bg-purple-100 text-purple-800'
                              : mov.tipo === 'AJUSTE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{mov.producto}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{mov.cantidad}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{mov.stockAnterior}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{mov.stockNuevo}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{mov.proveedor}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{mov.lote || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {mov.factura && <div>Fact: {mov.factura}</div>}
                        {mov.ordenCompra && <div>OC: {mov.ordenCompra}</div>}
                        {!mov.factura && !mov.ordenCompra && '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{mov.pruebasPorCaja || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate" title={mov.observaciones}>
                        {mov.observaciones || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{mov.usuario}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {mov.detalles ? (
                          <div className="relative group">
                            <Info className="w-4 h-4 text-blue-500 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-64 z-10">
                              {mov.detalles.desglose && (
                                <div className="mb-1">
                                  <span className="font-bold">Desglose:</span> PX:{mov.detalles.desglose.px} Ctrl:{mov.detalles.desglose.control} Cal:{mov.detalles.desglose.calibrador} Merma:{mov.detalles.desglose.merma}
                                </div>
                              )}
                              {mov.detalles.responsableCierre && (
                                <div><span className="font-bold">Cierra:</span> {mov.detalles.responsableCierre}</div>
                              )}
                              {mov.detalles.responsableApertura && (
                                <div><span className="font-bold">Abre:</span> {mov.detalles.responsableApertura}</div>
                              )}
                              {mov.detalles.loteCerrado && (
                                <div><span className="font-bold">Lote cerrado:</span> {mov.detalles.loteCerrado}</div>
                              )}
                              {mov.detalles.observacionesLote && (
                                <div><span className="font-bold">Obs lote:</span> {mov.detalles.observacionesLote}</div>
                              )}
                              {mov.detalles.fechaVencimiento && (
                                <div><span className="font-bold">Vence:</span> {mov.detalles.fechaVencimiento}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}