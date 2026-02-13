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
import * as XLSX from 'xlsx';

const Toaster = dynamic(
  () => import('react-hot-toast').then((mod) => mod.Toaster),
  { ssr: false }
);

// Interfaces (Movimiento, Lote, etc.)
interface Movimiento { id: string; tipo: 'RECEPCION' | 'CONSUMO' | 'CIERRE_LOTE' | 'APERTURA_LOTE'; producto_id: string; producto_nombre: string; codigo_producto: string; disciplina: string; fabricante: string; cantidad: number; unidad: string; stock_anterior: number; stock_nuevo: number; numero_lote?: string; fecha_vencimiento?: string; pruebas?: number; orden_compra?: string; factura?: string; proveedor?: string; usuario: string; observaciones: string; created_at: any; fecha: any; lote_id?: string; lote_numero?: string; lote_estado?: 'ACTIVO' | 'CERRADO'; desglose?: { px?: number; control?: number; calibrador?: number; merma?: number; };}
interface Lote { id: string; numero_lote: string; producto_id: string; producto_nombre: string; disciplina: string; fabricante: string; cantidad_inicial: number; cantidad_actual: number; estado: 'ACTIVO' | 'CERRADO'; fecha_apertura: any; fecha_cierre?: any; fecha_vencimiento?: string; observaciones?: string; movimientos: string[]; }
interface Estadisticas { totalMovimientos: number; totalRecepciones: number; totalConsumos: number; totalProductos: number; totalLotes: number; lotesActivos: number; lotesCerrados: number; stockIncremento: number; stockDecremento: number; promedioDiario: number; }

const DISCIPLINAS = [ { value: 'QUIMICA_CLINICA', label: 'Química Clínica' }, { value: 'INMUNOLOGIA', label: 'Inmunología' }, { value: 'BACTERIOLOGIA', label: 'Bacteriología' }, { value: 'PRUEBAS_RAPIDAS', label: 'Pruebas Rápidas' }, { value: 'TOMA_MUESTRA', label: 'Toma de Muestra' }, { value: 'HEMATOLOGIA', label: 'Hematología' }, { value: 'COAGULACION', label: 'Coagulación' }, { value: 'MOLECULAR', label: 'Molecular' }, { value: 'UROANALISIS', label: 'Uroanálisis' }, ];
const TIPOS_MOVIMIENTO = [ { value: 'TODOS', label: 'Todos los movimientos' }, { value: 'RECEPCION', label: 'Recepción' }, { value: 'CONSUMO', label: 'Consumo' }, { value: 'CIERRE_LOTE', label: 'Cierre de Lote' }, { value: 'APERTURA_LOTE', label: 'Apertura de Lote' }, ];

const ReporteHistorico = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<string>(() => { const date = new Date(); date.setDate(date.getDate() - 30); return date.toISOString().split('T')[0]; });
  const [fechaFin, setFechaFin] = useState<string>(new Date().toISOString().split('T')[0]);
  const [disciplina, setDisciplina] = useState<string>('');
  const [tipoMovimiento, setTipoMovimiento] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({ totalMovimientos: 0, totalRecepciones: 0, totalConsumos: 0, totalProductos: 0, totalLotes: 0, lotesActivos: 0, lotesCerrados: 0, stockIncremento: 0, stockDecremento: 0, promedioDiario: 0, });
  const [mostrarDetalles, setMostrarDetalles] = useState<Record<string, boolean>>({});
  const [mostrarLotes, setMostrarLotes] = useState(true);
  const [mostrarGraficos, setMostrarGraficos] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(50);
  const [ultimoDoc, setUltimoDoc] = useState<any>(null);
  const [tieneMas, setTieneMas] = useState(true);
  const [datosCargados, setDatosCargados] = useState(false);

  const cargarMovimientos = useCallback(async (cargarMas: boolean = false) => {
    try {
      let q = query(
        collection(db, 'movimientos'),
        where('fecha', '>=', Timestamp.fromDate(new Date(fechaInicio))),
        where('fecha', '<=', Timestamp.fromDate(new Date(fechaFin + 'T23:59:59'))),
        orderBy('fecha', 'desc'),
        firestoreLimit(100)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        if (!cargarMas) setMovimientos([]);
        setTieneMas(false);
        return [];
      }

      const nuevosMovimientos = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { ...data, id: docSnap.id, fecha: data.fecha?.toDate() } as Movimiento;
      });

      setUltimoDoc(snapshot.docs[snapshot.docs.length - 1]);
      setTieneMas(snapshot.docs.length === 100);
      return nuevosMovimientos;

    } catch (error) {
      console.error('Error cargando movimientos:', error);
      toast.error('Error al cargar movimientos.');
      return [];
    }
  }, [fechaInicio, fechaFin]);

   const cargarDatosIniciales = useCallback(async () => {
    setLoadingData(true);
    const movs = await cargarMovimientos();
    setMovimientos(movs);
    setLoadingData(false);
    setDatosCargados(true);
  }, [cargarMovimientos]);

  useEffect(() => {
    cargarDatosIniciales();
  }, [cargarDatosIniciales]);
  
  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(movimientos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial');
    XLSX.writeFile(workbook, "reporte_historico.xlsx");
  };

  return (
    <div className="p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border p-2 rounded"/>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border p-2 rounded"/>
            <button onClick={cargarDatosIniciales} disabled={loadingData} className="bg-blue-500 text-white p-2 rounded flex items-center justify-center">
                {loadingData ? <Loader2 className="animate-spin"/> : <RefreshCw/>}
                Actualizar
            </button>
            <button onClick={exportarExcel} className="bg-green-500 text-white p-2 rounded flex items-center justify-center">
                <Download className="mr-2"/>
                Exportar
            </button>
        </div>
      </div>
      {loadingData && <div className="text-center"><Loader2 className="animate-spin inline-block"/></div>}
      {!loadingData && movimientos.length === 0 && datosCargados && <p className="text-center text-gray-500">No se encontraron movimientos para el período seleccionado.</p>}
      {!loadingData && movimientos.length > 0 &&
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Resultante</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movimientos.map((mov) => (
                  <tr key={mov.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{mov.fecha?.toLocaleString() ?? 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{mov.producto_nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{mov.tipo}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${mov.tipo === 'RECEPCION' ? 'text-green-600' : 'text-red-600'}`}>{mov.cantidad}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">{mov.stock_nuevo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      }
    </div>
  );
};

export default ReporteHistorico;
