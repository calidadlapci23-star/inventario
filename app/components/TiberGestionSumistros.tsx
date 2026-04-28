'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import React from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  doc, 
  updateDoc, 
  addDoc, 
  Timestamp,
  where,
  limit,
  writeBatch,
  deleteDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { 
  Package, 
  Search, 
  ShoppingCart, 
  Trash2, 
  CheckCircle, 
  XCircle,
  FileText,
  Check,
  X,
  Filter,
  Calendar,
  User,
  DollarSign,
  Truck,
  AlertCircle,
  Building,
  Eye,
  Download,
  MoreVertical,
  ClipboardCheck,
  Plus, 
  Minus, 
  RotateCcw, 
  RefreshCw,
  Bug,
  Percent,
  PackageCheck,
  Clock,
  CalendarDays,
  ShieldCheck,
  Star,
  Calculator,
  Receipt,
  Archive,
  Box,
  BarChart,
  Layers,
  ExternalLink,
  TestTube,
  Hash,
  Copy,
  Trash
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

// Interfaces principales actualizadas
interface Producto {
  id: string;
  nombre: string;
  disciplina: string;
  stock_actual: number;
  alerta_minima: number;
  unidad_medida: string;
  codigo?: string;
  proveedor: string;
  proveedor_id?: string;
  precio_unitario?: number;
  categoria?: string;
  fabricante?: string;
  pruebas_por_caja?: number;
  lote?: string;
  fecha_vencimiento?: string;
}

interface CarritoItem {
  producto: Producto;
  cantidad: number;
}

interface ProductoSolicitud {
  productoId: string;
  nombre: string;
  cantidadSolicitada: number;
  cantidadAprobada?: number;
  stockDisponible: number;
  unidad_medida: string;
  precio_unitario: number;
  proveedor: string;
  proveedor_id?: string;
  fabricante?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  comentario?: string;
  pruebas_por_caja?: number;
}

interface Solicitud {
  id: string;
  numero: string;
  fecha: Timestamp;
  productos: ProductoSolicitud[];
  estado: 'pendiente' | 'parcial' | 'aprobada' | 'rechazada' | 'procesada' | 'completada';
  solicitante: string;
  departamento: string;
  aprobador?: string;
  fechaAprobacion?: Timestamp;
  comentarios: string;
  totalProductos: number;
  totalUnidadesSolicitadas: number;
  totalUnidadesAprobadas?: number;
  ordenesCompra?: string[];
  totalPruebasSolicitadas?: number;
}

interface ProductoOrden {
  id: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad_medida: string;
  pruebas_por_caja?: number;
  fabricante?: string;
  proveedor?: string;
}

interface OrdenCompra {
  id: string;
  numero: string;
  fecha: Timestamp;
  solicitudId: string;
  solicitudNumero: string;
  proveedor: string;
  proveedor_id: string;
  proveedor_contacto?: string;
  proveedor_telefono?: string;
  proveedor_email?: string;
  productos: ProductoOrden[];
  subtotal: number;
  iva: number;
  total: number;
  estado: 'pendiente' | 'generada' | 'enviada' | 'recibida' | 'completada' | 'cancelada';
  fechaEntrega?: Timestamp;
  fechaRecepcion?: Timestamp;
  numeroFactura?: string;
  observaciones?: string;
  creadaPor: string;
  totalPruebas?: number;
  evaluacionPorcentaje?: number;
  evaluacionEvaluadoPor?: string;
  evaluacionAprobada?: boolean;
}

interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  pruebas_por_caja_default?: number;
}

interface RecepcionProducto {
  productoId: string;
  productoNombre: string;
  codigoProducto: string;
  cantidadOrdenada: number;
  cantidadRecibida: number;
  diferencia: number;
  numeroLote: string;
  fechaVencimiento: string;
  observaciones: string;
  fabricante: string;
  unidadMedida: string;
  precioUnitario: number;
  stockActual: number;
  nuevoStock: number;
  pruebasPorCaja?: number;
  totalPruebasRecibidas?: number;
  proveedor?: string;
  pruebasPorCajaDefault?: number;
}

interface EvaluacionProveedor {
  productosTotales: '100%' | '≥80%' | '≤50%' | '';
  presentacion: 'Conforme' | 'No Conforme' | '';
  caducidad: '≥1 año' | '≥6 meses' | '≥1 mes' | 'Por Caducar' | '';
  integridadProducto: 'Conforme' | 'No Conforme' | '';
  tiempoEntrega: 'Mismo día' | '2 días' | '3 días' | '';
  puntuacionTotal: number;
  porcentajeTotal: number;
  observacionesEvaluacion?: string;
  evaluadoPor: string;
  fechaEvaluacion: Date;
}

const COLECCIONES = {
  productos: 'productos_tiber',
  proveedores: 'tiber_proveedores',
  solicitudes: 'tiber_solicitudes',
  ordenesCompra: 'tiber_ordenes_compra',
  recepciones: 'recepciones_tiberrecepciones',
  evaluaciones: 'evaluaciones_proveedores_tiber',
  movimientos: 'movimientos_inventario_tiber',
  historial: 'tiber_historial'
};

// Helper para debounce
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Componente memoizado para filas de productos en recepción
const ProductoRecepcionRow = React.memo(({ 
  producto, 
  index, 
  onUpdate, 
  onAdjust,
  onApplyPruebasPorCaja,
  onAgregarLote,
  onEliminarLote,
  puedeEliminar,
  totalFilasProducto
}: { 
  producto: RecepcionProducto, 
  index: number, 
  onUpdate: (index: number, campo: string, valor: any) => void, 
  onAdjust: (index: number, incremento: number) => void,
  onApplyPruebasPorCaja: (index: number) => void,
  onAgregarLote: (index: number) => void,
  onEliminarLote: (index: number) => void,
  puedeEliminar: boolean,
  totalFilasProducto: number
}) => {
  const cantidadRef = useRef<HTMLInputElement>(null);
  const loteRef = useRef<HTMLInputElement>(null);
  const vencimientoRef = useRef<HTMLInputElement>(null);
  const observacionesRef = useRef<HTMLInputElement>(null);
  
  const handleUpdateDebounced = useCallback(
    debounce((campo: string, valor: any) => {
      onUpdate(index, campo, valor);
    }, 300),
    [index, onUpdate]
  );

  const totalPruebasFila = producto.pruebasPorCaja && producto.pruebasPorCaja > 0 
    ? producto.cantidadRecibida * producto.pruebasPorCaja 
    : producto.cantidadRecibida;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{producto.productoNombre}</div>
        <div className="text-xs text-gray-500">
          {producto.codigoProducto} • {producto.unidadMedida}
          {producto.proveedor && (
            <div className="mt-1">Prov: {producto.proveedor}</div>
          )}
        </div>
        {totalFilasProducto > 1 && (
          <div className="text-xs text-blue-600 mt-1">
            Lote {index + 1} de {totalFilasProducto}
          </div>
        )}
      </td>
      
      <td className="px-4 py-3 text-center border-r bg-blue-50/50">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-1">
            <input
              type="number"
              min="0"
              value={producto.pruebasPorCaja || 0}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                onUpdate(index, 'pruebasPorCaja', value);
              }}
              className="w-20 p-1 border border-gray-300 rounded text-center text-sm"
              placeholder="Pruebas/caja"
            />
          </div>
          <div className={`text-lg font-bold ${
            producto.pruebasPorCajaDefault !== undefined && producto.pruebasPorCajaDefault > 0 
              ? 'text-blue-600' 
              : 'text-gray-400'
          }`}>
            {producto.pruebasPorCajaDefault !== undefined && producto.pruebasPorCajaDefault > 0 
              ? `Default: ${producto.pruebasPorCajaDefault}` 
              : 'N/A'}
          </div>
          {producto.pruebasPorCajaDefault !== undefined && producto.pruebasPorCajaDefault > 0 && (
            <button
              onClick={() => onApplyPruebasPorCaja(index)}
              className="mt-1 text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            >
              Aplicar Default
            </button>
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        <span className="font-medium">{producto.cantidadOrdenada}</span>
        <div className="text-xs text-gray-500">
          {producto.pruebasPorCaja && producto.pruebasPorCaja > 0 
            ? `${producto.cantidadOrdenada * producto.pruebasPorCaja} pruebas (total)`
            : 'unidades'}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAdjust(index, -1)}
            className="p-1 rounded hover:bg-gray-200"
            disabled={producto.cantidadRecibida <= 0}
            type="button"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            ref={cantidadRef}
            type="number"
            min="0"
            value={producto.cantidadRecibida}
            onChange={(e) => handleUpdateDebounced('cantidadRecibida', parseInt(e.target.value) || 0)}
            onBlur={(e) => {
              const value = parseInt(e.target.value) || 0;
              onUpdate(index, 'cantidadRecibida', value);
            }}
            className="w-16 p-1 border border-gray-300 rounded text-center text-sm"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={() => onAdjust(index, 1)}
            className="p-1 rounded hover:bg-gray-200"
            type="button"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        {producto.pruebasPorCaja && producto.pruebasPorCaja > 0 && (
          <div className="text-xs text-blue-600 mt-1">
            Pruebas: {totalPruebasFila}
          </div>
        )}
      </td>

      <td className="px-4 py-3">
        <span className="text-xs text-gray-400">—</span>
      </td>

      <td className="px-4 py-3">
        <input
          ref={loteRef}
          type="text"
          value={producto.numeroLote}
          onChange={(e) => handleUpdateDebounced('numeroLote', e.target.value)}
          onBlur={(e) => onUpdate(index, 'numeroLote', e.target.value)}
          className="w-full p-1 border border-gray-300 rounded text-sm"
          placeholder="Lote-001"
          onFocus={(e) => e.target.select()}
        />
      </td>

      <td className="px-4 py-3">
        <input
          ref={vencimientoRef}
          type="date"
          value={producto.fechaVencimiento}
          onChange={(e) => handleUpdateDebounced('fechaVencimiento', e.target.value)}
          onBlur={(e) => onUpdate(index, 'fechaVencimiento', e.target.value)}
          className="w-full p-1 border border-gray-300 rounded text-sm"
          onFocus={(e) => e.target.select()}
        />
      </td>

      <td className="px-4 py-3">
        <input
          ref={observacionesRef}
          type="text"
          value={producto.observaciones}
          onChange={(e) => handleUpdateDebounced('observaciones', e.target.value)}
          onBlur={(e) => onUpdate(index, 'observaciones', e.target.value)}
          className="w-full p-1 border border-gray-300 rounded text-sm"
          placeholder="Observaciones..."
          onFocus={(e) => e.target.select()}
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAgregarLote(index)}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title="Agregar otro lote para este producto"
          >
            <Copy className="w-4 h-4" />
          </button>
          {puedeEliminar && (
            <button
              onClick={() => onEliminarLote(index)}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="Eliminar este lote"
            >
              <Trash className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

ProductoRecepcionRow.displayName = 'ProductoRecepcionRow';

// Catálogo de productos (puedes ajustarlo según los datos reales de Tíber)
const catalogoProductos = {
  hematologia: [
    { nombre: 'Reactivo A', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'Reactivo B', fabricante: 'DESEGO', proveedor: 'DESEGO', pruebas: 24 },
  ],
};

// Componente de formulario de recepción optimizado con barra de navegación
const FormularioRecepcion = React.memo(({ 
  ordenSeleccionada,
  recepcionProductos: initialRecepcionProductos,
  fechaRecepcion: initialFechaRecepcion,
  numeroFactura: initialNumeroFactura,
  observacionesGenerales: initialObservacionesGenerales,
  evaluacion: initialEvaluacion,
  onRecepcionChange,
  onClose,
  onRegistrar,
  procesando,
  usuarioActual,
  refrescarDatosModalRecepcion
}: {
  ordenSeleccionada: OrdenCompra;
  recepcionProductos: RecepcionProducto[];
  fechaRecepcion: string;
  numeroFactura: string;
  observacionesGenerales: string;
  evaluacion: EvaluacionProveedor;
  onRecepcionChange: (updates: {
    recepcionProductos?: RecepcionProducto[];
    fechaRecepcion?: string;
    numeroFactura?: string;
    observacionesGenerales?: string;
    evaluacion?: EvaluacionProveedor;
  }) => void;
  onClose: () => void;
  onRegistrar: () => Promise<void>;
  procesando: boolean;
  usuarioActual: { nombre: string; departamento: string };
  refrescarDatosModalRecepcion: () => void;
}) => {
  const [recepcionProductos, setRecepcionProductos] = useState<RecepcionProducto[]>(initialRecepcionProductos);
  const [fechaRecepcion, setFechaRecepcion] = useState(initialFechaRecepcion);
  const [numeroFactura, setNumeroFactura] = useState(initialNumeroFactura);
  const [observacionesGenerales, setObservacionesGenerales] = useState(initialObservacionesGenerales);
  const [evaluacion, setEvaluacion] = useState<EvaluacionProveedor>(initialEvaluacion);
  const [localProcesando, setLocalProcesando] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState('facturacion');

  useEffect(() => {
    setRecepcionProductos(initialRecepcionProductos);
  }, [initialRecepcionProductos]);

  useEffect(() => {
    setFechaRecepcion(initialFechaRecepcion);
  }, [initialFechaRecepcion]);

  useEffect(() => {
    setNumeroFactura(initialNumeroFactura);
  }, [initialNumeroFactura]);

  useEffect(() => {
    setObservacionesGenerales(initialObservacionesGenerales);
  }, [initialObservacionesGenerales]);

  useEffect(() => {
    setEvaluacion(initialEvaluacion);
  }, [initialEvaluacion]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onRecepcionChange({
        recepcionProductos,
        fechaRecepcion,
        numeroFactura,
        observacionesGenerales,
        evaluacion
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [recepcionProductos, fechaRecepcion, numeroFactura, observacionesGenerales, evaluacion]);

  const resumen = useMemo(() => {
    const totalFilas = recepcionProductos.length;
    const productosAgrupados = new Map<string, { cantidadRecibida: number; pruebasPorCaja: number }>();
    recepcionProductos.forEach(p => {
      const key = p.productoId;
      const existente = productosAgrupados.get(key) || { cantidadRecibida: 0, pruebasPorCaja: p.pruebasPorCaja || 0 };
      existente.cantidadRecibida += p.cantidadRecibida;
      if (p.pruebasPorCaja !== undefined) existente.pruebasPorCaja = p.pruebasPorCaja;
      productosAgrupados.set(key, existente);
    });

    const totalProductos = productosAgrupados.size;
    const productosConRecepcion = Array.from(productosAgrupados.values()).filter(p => p.cantidadRecibida > 0).length;
    const cantidadTotalRecibida = Array.from(productosAgrupados.values()).reduce((sum, p) => sum + p.cantidadRecibida, 0);
    const productosConLote = recepcionProductos.filter(p => p.numeroLote.trim() !== '').length;
    const productosConPruebasPorCaja = recepcionProductos.filter(p => p.pruebasPorCaja !== undefined && p.pruebasPorCaja > 0).length;
    const totalPruebasRecibidas = Array.from(productosAgrupados.entries()).reduce((sum, [_, p]) => {
      return sum + (p.cantidadRecibida * (p.pruebasPorCaja || 1));
    }, 0);
    
    const productosExcedidos: string[] = [];
    recepcionProductos.forEach(p => {
      const totalRecibidoProducto = Array.from(productosAgrupados.entries())
        .find(([id]) => id === p.productoId)?.[1].cantidadRecibida || 0;
      if (totalRecibidoProducto > p.cantidadOrdenada) {
        if (!productosExcedidos.includes(p.productoNombre)) {
          productosExcedidos.push(p.productoNombre);
        }
      }
    });

    return {
      totalFilas,
      totalProductos,
      productosConRecepcion,
      cantidadTotalRecibida,
      productosConLote,
      productosConPruebasPorCaja,
      totalPruebasRecibidas,
      productosExcedidos
    };
  }, [recepcionProductos]);

  const agregarLote = useCallback((index: number) => {
    setRecepcionProductos(prev => {
      const nuevos = [...prev];
      const original = nuevos[index];
      const nuevoLote: RecepcionProducto = {
        ...original,
        cantidadRecibida: 0,
        numeroLote: '',
        fechaVencimiento: '',
        observaciones: '',
        diferencia: 0,
        nuevoStock: original.stockActual,
        totalPruebasRecibidas: 0
      };
      nuevos.splice(index + 1, 0, nuevoLote);
      return nuevos;
    });
  }, []);

  const eliminarLote = useCallback((index: number) => {
    setRecepcionProductos(prev => {
      if (prev.length <= 1) return prev;
      const nuevos = [...prev];
      nuevos.splice(index, 1);
      return nuevos;
    });
  }, []);

  const actualizarRecepcionProducto = useCallback((index: number, campo: string, valor: any) => {
    setRecepcionProductos(prev => {
      const nuevosProductos = [...prev];
      if (index < nuevosProductos.length) {
        const productoActualizado = { ...nuevosProductos[index] };
        (productoActualizado as any)[campo] = valor;
        
        if (campo === 'cantidadRecibida' || campo === 'pruebasPorCaja') {
          const pruebas = productoActualizado.pruebasPorCaja || 1;
          const totalPruebasFila = productoActualizado.cantidadRecibida * pruebas;
          productoActualizado.totalPruebasRecibidas = totalPruebasFila;
          productoActualizado.nuevoStock = productoActualizado.stockActual + totalPruebasFila;
        }
        
        nuevosProductos[index] = productoActualizado;
      }
      return nuevosProductos;
    });
  }, []);

  const ajustarCantidadRecibida = useCallback((index: number, incremento: number) => {
    setRecepcionProductos(prev => {
      const nuevosProductos = [...prev];
      if (index < nuevosProductos.length) {
        const producto = nuevosProductos[index];
        const nuevaCantidad = producto.cantidadRecibida + incremento;
        
        if (nuevaCantidad >= 0) {
          producto.cantidadRecibida = nuevaCantidad;
          const pruebas = producto.pruebasPorCaja || 1;
          producto.totalPruebasRecibidas = nuevaCantidad * pruebas;
          producto.nuevoStock = producto.stockActual + producto.totalPruebasRecibidas;
        }
      }
      return nuevosProductos;
    });
  }, []);

  const aplicarPruebasPorCaja = useCallback((index: number) => {
    setRecepcionProductos(prev => {
      const nuevosProductos = [...prev];
      if (index < nuevosProductos.length && 
          nuevosProductos[index].pruebasPorCajaDefault !== undefined && 
          nuevosProductos[index].pruebasPorCajaDefault! > 0) {
        
        const producto = nuevosProductos[index];
        producto.pruebasPorCaja = producto.pruebasPorCajaDefault;
        const pruebas = producto.pruebasPorCajaDefault!;
        producto.totalPruebasRecibidas = producto.cantidadRecibida * pruebas;
        producto.nuevoStock = producto.stockActual + producto.totalPruebasRecibidas;
      }
      return nuevosProductos;
    });
  }, []);

  const reiniciarRecepcion = useCallback(() => {
    const productosUnicos = new Map<string, RecepcionProducto>();
    initialRecepcionProductos.forEach(p => {
      if (!productosUnicos.has(p.productoId)) {
        productosUnicos.set(p.productoId, { ...p, cantidadRecibida: p.cantidadOrdenada, numeroLote: '', fechaVencimiento: '' });
      }
    });
    const nuevosProductos = Array.from(productosUnicos.values());
    setRecepcionProductos(nuevosProductos);
  }, [initialRecepcionProductos]);

  const actualizarEvaluacion = useCallback((campo: keyof EvaluacionProveedor, valor: any) => {
    setEvaluacion(prev => ({
      ...prev,
      [campo]: valor
    }));
  }, []);

  const calcularPuntuacionActual = useCallback(() => {
    let puntuacion = 0;
    
    switch(evaluacion.productosTotales) {
      case '100%': puntuacion += 2; break;
      case '≥80%': puntuacion += 1; break;
      case '≤50%': puntuacion += 0; break;
    }
    
    switch(evaluacion.presentacion) {
      case 'Conforme': puntuacion += 2; break;
      case 'No Conforme': puntuacion += 0; break;
    }
    
    switch(evaluacion.caducidad) {
      case '≥1 año': puntuacion += 2; break;
      case '≥6 meses': puntuacion += 1; break;
      case '≥1 mes': puntuacion += 0; break;
      case 'Por Caducar': puntuacion += 0; break;
    }
    
    switch(evaluacion.integridadProducto) {
      case 'Conforme': puntuacion += 2; break;
      case 'No Conforme': puntuacion += 0; break;
    }
    
    switch(evaluacion.tiempoEntrega) {
      case 'Mismo día': puntuacion += 2; break;
      case '2 días': puntuacion += 1; break;
      case '3 días': puntuacion += 0; break;
    }
    
    const porcentaje = (puntuacion / 10) * 100;
    return { puntuacion, porcentaje };
  }, [evaluacion]);

  const { puntuacion, porcentaje } = useMemo(() => calcularPuntuacionActual(), [
    evaluacion.productosTotales,
    evaluacion.presentacion,
    evaluacion.caducidad,
    evaluacion.integridadProducto,
    evaluacion.tiempoEntrega
  ]);

  useEffect(() => {
    setEvaluacion(prev => {
      if (prev.puntuacionTotal === puntuacion && prev.porcentajeTotal === porcentaje) return prev;
      return { ...prev, puntuacionTotal: puntuacion, porcentajeTotal: porcentaje };
    });
  }, [puntuacion, porcentaje]);

  const handleRegistrar = async () => {
    setLocalProcesando(true);
    try {
      await onRegistrar();
    } finally {
      setLocalProcesando(false);
    }
  };

  const obtenerPruebasPorCaja = (nombre: string, fabricante: string, proveedor: string) => {
    for (const disciplina of Object.keys(catalogoProductos)) {
      const productosDisciplina = catalogoProductos[disciplina as keyof typeof catalogoProductos];
      const producto = productosDisciplina.find(p => 
        p.nombre === nombre && 
        p.fabricante === fabricante && 
        p.proveedor === proveedor
      );
      if (producto) {
        return producto.pruebas;
      }
    }
    return 0;
  };

  const puedeEliminarFila = (index: number): boolean => {
    const productoId = recepcionProductos[index]?.productoId;
    if (!productoId) return false;
    const count = recepcionProductos.filter(p => p.productoId === productoId).length;
    return count > 1;
  };

  const totalFilasPorProducto = (productoId: string): number => {
    return recepcionProductos.filter(p => p.productoId === productoId).length;
  };

  const scrollToSeccion = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSeccionActiva(id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-green-50 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Receipt className="w-6 h-6" />
                Recepción de Orden: {ordenSeleccionada.numero}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center">
                  <Building className="w-4 h-4 mr-1" />
                  {ordenSeleccionada.proveedor}
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  Recepción en proceso
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Fecha recepción: {fechaRecepcion}
                </span>
              </div>
              <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                <span>Los datos se actualizan automáticamente cada 13 minutos</span>
              </div>
              {resumen.productosConPruebasPorCaja > 0 && (
                <div className="mt-1 text-sm text-blue-600 flex items-center gap-1">
                  <TestTube className="w-4 h-4" />
                  <span>{resumen.productosConPruebasPorCaja} productos tienen valor predefinido de pruebas por caja</span>
                </div>
              )}
              {resumen.productosExcedidos.length > 0 && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>Atención: los siguientes productos exceden la cantidad ordenada: {resumen.productosExcedidos.join(', ')}</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-lg"
            >
              ✕
            </button>
          </div>
          {/* Barra de navegación interna */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
            <button onClick={() => scrollToSeccion('facturacion')} className={`px-3 py-1 text-sm rounded-full ${seccionActiva === 'facturacion' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Facturación</button>
            <button onClick={() => scrollToSeccion('evaluacion')} className={`px-3 py-1 text-sm rounded-full ${seccionActiva === 'evaluacion' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Evaluación LAPCI</button>
            <button onClick={() => scrollToSeccion('productos')} className={`px-3 py-1 text-sm rounded-full ${seccionActiva === 'productos' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Productos</button>
            <button onClick={() => scrollToSeccion('observaciones')} className={`px-3 py-1 text-sm rounded-full ${seccionActiva === 'observaciones' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Observaciones</button>
            <button onClick={() => scrollToSeccion('resumen')} className={`px-3 py-1 text-sm rounded-full ${seccionActiva === 'resumen' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Resumen</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Sección Facturación */}
          <div id="facturacion" className="scroll-mt-20 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Información de Facturación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Factura *
                </label>
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="FAC-2024-001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Recepción
                </label>
                <input
                  type="date"
                  value={fechaRecepcion}
                  onChange={(e) => setFechaRecepcion(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recibido por
                </label>
                <input
                  type="text"
                  value={usuarioActual.nombre}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Sección Evaluación */}
          <div id="evaluacion" className="scroll-mt-20 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                EVALUACIÓN DE INSUMOS, EQUIPOS Ó SERVICIOS (EXCLUSIVO LAPCI)
              </h3>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-300">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-blue-700">
                  {evaluacion.puntuacionTotal}/10 ({evaluacion.porcentajeTotal.toFixed(1)}%)
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div className="border border-blue-200 rounded-lg p-3 bg-white">
                <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                  <Percent className="w-4 h-4" />
                  % Productos Totales
                </label>
                <div className="space-y-1">
                  {['100%', '≥80%', '≤50%'].map((opcion) => (
                    <label key={opcion} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="productosTotales"
                        checked={evaluacion.productosTotales === opcion}
                        onChange={() => actualizarEvaluacion('productosTotales', opcion)}
                        className="mr-2 h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">{opcion}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500 italic">
                  Se calcula automáticamente según cantidades recibidas
                </div>
              </div>

              <div className="border border-blue-200 rounded-lg p-3 bg-white">
                <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                  <PackageCheck className="w-4 h-4" />
                  Presentación
                </label>
                <div className="space-y-1">
                  {['Conforme', 'No Conforme'].map((opcion) => (
                    <label key={opcion} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="presentacion"
                        checked={evaluacion.presentacion === opcion}
                        onChange={() => actualizarEvaluacion('presentacion', opcion)}
                        className="mr-2 h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">{opcion}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-blue-200 rounded-lg p-3 bg-white">
                <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  Caducidad
                </label>
                <div className="space-y-1">
                  {['≥1 año', '≥6 meses', '≥1 mes', 'Por Caducar'].map((opcion) => (
                    <label key={opcion} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="caducidad"
                        checked={evaluacion.caducidad === opcion}
                        onChange={() => actualizarEvaluacion('caducidad', opcion)}
                        className="mr-2 h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">{opcion}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-blue-200 rounded-lg p-3 bg-white">
                <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  Integridad del Producto
                </label>
                <div className="space-y-1">
                  {['Conforme', 'No Conforme'].map((opcion) => (
                    <label key={opcion} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="integridad"
                        checked={evaluacion.integridadProducto === opcion}
                        onChange={() => actualizarEvaluacion('integridadProducto', opcion)}
                        className="mr-2 h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">{opcion}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-blue-200 rounded-lg p-3 bg-white">
                <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Tiempo de Entrega
                </label>
                <div className="space-y-1">
                  {['Mismo día', '2 días', '3 días'].map((opcion) => (
                    <label key={opcion} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="tiempoEntrega"
                        checked={evaluacion.tiempoEntrega === opcion}
                        onChange={() => actualizarEvaluacion('tiempoEntrega', opcion)}
                        className="mr-2 h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">{opcion}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones de la Evaluación
              </label>
              <textarea
                value={evaluacion.observacionesEvaluacion}
                onChange={(e) => actualizarEvaluacion('observacionesEvaluacion', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                rows={2}
                placeholder="Observaciones adicionales sobre la entrega..."
              />
            </div>

            <div className={`p-3 rounded-lg ${evaluacion.porcentajeTotal >= 80 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {evaluacion.porcentajeTotal >= 80 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`font-semibold ${evaluacion.porcentajeTotal >= 80 ? 'text-green-700' : 'text-red-700'}`}>
                    {evaluacion.porcentajeTotal >= 80 ? '✓ EVALUACIÓN APROBADA' : '✗ EVALUACIÓN NO APROBADA'}
                  </span>
                </div>
                <span className={`text-sm ${evaluacion.porcentajeTotal >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                  Mínimo requerido: 80% (Actual: {evaluacion.porcentajeTotal.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Sección Productos */}
          <div id="productos" className="scroll-mt-20">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Productos a Recepcionar ({resumen.totalFilas} lotes de {resumen.totalProductos} productos)
            </h3>
            
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PRODUCTO</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-blue-50">PRUEBAS/CAJA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CANT. ORDENADA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CANT. RECIBIDA (este lote)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DIF.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NÚMERO DE LOTE</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FECHA VENCIMIENTO</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OBSERVACIONES</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recepcionProductos.map((producto, index) => (
                    <ProductoRecepcionRow
                      key={`${producto.productoId}-${index}`}
                      producto={producto}
                      index={index}
                      onUpdate={actualizarRecepcionProducto}
                      onAdjust={ajustarCantidadRecibida}
                      onApplyPruebasPorCaja={aplicarPruebasPorCaja}
                      onAgregarLote={agregarLote}
                      onEliminarLote={eliminarLote}
                      puedeEliminar={puedeEliminarFila(index)}
                      totalFilasProducto={totalFilasPorProducto(producto.productoId)}
                    />
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 font-medium">TOTALES</td>
                    <td className="px-4 py-3 font-medium bg-blue-50">
                      {resumen.productosConPruebasPorCaja} con valor
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {resumen.cantidadTotalRecibida} cajas
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {resumen.cantidadTotalRecibida} cajas
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">—</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{resumen.productosConLote} con lote</td>
                    <td className="px-4 py-3">-</td>
                    <td className="px-4 py-3">-</td>
                    <td className="px-4 py-3">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Sección Observaciones */}
          <div id="observaciones" className="scroll-mt-20">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Observaciones Generales de la Recepción
            </h3>
            <textarea
              value={observacionesGenerales}
              onChange={(e) => setObservacionesGenerales(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Observaciones sobre la recepción, condiciones del producto, etc..."
            />
          </div>

          {/* Sección Resumen */}
          <div id="resumen" className="scroll-mt-20">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Resumen de la Recepción</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Productos</div>
                <div className="text-2xl font-bold text-blue-600">{resumen.totalProductos}</div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Lotes</div>
                <div className="text-2xl font-bold text-blue-600">{resumen.totalFilas}</div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Con valor predef.</div>
                <div className="text-2xl font-bold text-blue-600">{resumen.productosConPruebasPorCaja}</div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Cajas recibidas</div>
                <div className="text-2xl font-bold text-green-600">{resumen.cantidadTotalRecibida}</div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Pruebas recibidas</div>
                <div className="text-2xl font-bold text-purple-600">
                  {resumen.totalPruebasRecibidas}
                </div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Lotes con lote</div>
                <div className="text-2xl font-bold text-yellow-600">{resumen.productosConLote}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={reiniciarRecepcion}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                disabled={localProcesando}
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar a una fila por producto
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={localProcesando}
              >
                Cancelar
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => refrescarDatosModalRecepcion()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                disabled={localProcesando}
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar Datos
              </button>
              <button
                onClick={handleRegistrar}
                disabled={localProcesando}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                  localProcesando
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {localProcesando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Registrar Recepción ({resumen.totalPruebasRecibidas} pruebas)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

FormularioRecepcion.displayName = 'FormularioRecepcion';

const TiberGestionSuministros = () => {
  // Estados principales
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'nombre' | 'stock_actual' | 'disciplina'>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Estados para el carrito
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [comentarioSolicitud, setComentarioSolicitud] = useState('');
  
  // Estados para solicitudes, órdenes y proveedores
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  
  // Estados para recepción
  const [recepcionProductos, setRecepcionProductos] = useState<RecepcionProducto[]>([]);
  const [fechaRecepcion, setFechaRecepcion] = useState(new Date().toISOString().split('T')[0]);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [evaluacion, setEvaluacion] = useState<EvaluacionProveedor>({
    productosTotales: '',
    presentacion: '',
    caducidad: '',
    integridadProducto: '',
    tiempoEntrega: '',
    puntuacionTotal: 0,
    porcentajeTotal: 0,
    observacionesEvaluacion: '',
    evaluadoPor: '',
    fechaEvaluacion: new Date()
  });
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<'productos' | 'solicitudes' | 'ordenes' | 'recepcion' | 'recibidas'>('productos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error' | 'info', texto: string, detalle?: string } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<Solicitud | null>(null);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenCompra | null>(null);
  const [mostrarDetalleSolicitud, setMostrarDetalleSolicitud] = useState(false);
  const [mostrarDetalleOrden, setMostrarDetalleOrden] = useState(false);
  const [mostrarFormularioRecepcion, setMostrarFormularioRecepcion] = useState(false);
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);

  // Obtener usuario autenticado
  const { user, loading: authLoading } = useAuth();

  const usuarioActual = useMemo(() => {
    if (!user || !user.email) return null;
    const emailLocalPart = user.email.split('@')[0];
    const nombre = emailLocalPart.charAt(0).toUpperCase() + emailLocalPart.slice(1).toLowerCase();
    return {
      id: user.uid,
      nombre: nombre,
      email: user.email,
      departamento: 'Sin departamento',
      rol: 'usuario'
    };
  }, [user]);

  useEffect(() => {
    if (usuarioActual) {
      setEvaluacion(prev => ({
        ...prev,
        evaluadoPor: usuarioActual.nombre
      }));
    }
  }, [usuarioActual]);

  const obtenerPruebasPorCaja = (nombre: string, fabricante: string, proveedor: string) => {
    for (const disciplina of Object.keys(catalogoProductos)) {
      const productosDisciplina = catalogoProductos[disciplina as keyof typeof catalogoProductos];
      const producto = productosDisciplina.find(p => 
        p.nombre === nombre && 
        p.fabricante === fabricante && 
        p.proveedor === proveedor
      );
      if (producto) return producto.pruebas;
    }
    return 0;
  };

  const buscarProveedorPorNombre = useCallback((nombreCorto: string): Proveedor | undefined => {
    const nombreCortoNorm = nombreCorto.toLowerCase().trim();
    return proveedores.find(p => {
      const nombreLargoNorm = p.nombre.toLowerCase().trim();
      if (nombreCortoNorm.length >= 4 && nombreLargoNorm.includes(nombreCortoNorm)) return true;
      if (nombreLargoNorm.length <= 5 && nombreCortoNorm.includes(nombreLargoNorm)) return true;
      return false;
    });
  }, [proveedores]);

  const updatesRef = useRef<Map<number, Map<string, any>>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervaloRefrescoRef = useRef<NodeJS.Timeout | null>(null);

  const actualizarRecepcionProductoOptimizada = useCallback((index: number, campo: string, valor: any) => {
    if (!updatesRef.current.has(index)) updatesRef.current.set(index, new Map());
    updatesRef.current.get(index)!.set(campo, valor);
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      const updates = updatesRef.current;
      if (updates.size === 0) return;
      setRecepcionProductos(prev => {
        const nuevosProductos = [...prev];
        updates.forEach((campos, idx) => {
          if (idx < nuevosProductos.length) {
            const productoActualizado = { ...nuevosProductos[idx] };
            campos.forEach((valor, campo) => {
              (productoActualizado as any)[campo] = valor;
              if (campo === 'cantidadRecibida') {
                productoActualizado.nuevoStock = productoActualizado.stockActual + valor;
                productoActualizado.totalPruebasRecibidas = valor;
              }
            });
            nuevosProductos[idx] = productoActualizado;
          }
        });
        updatesRef.current.clear();
        return nuevosProductos;
      });
    }, 100);
  }, []);

  const aplicarPruebasPorCaja = useCallback((index: number) => {
    setRecepcionProductos(prev => {
      const nuevosProductos = [...prev];
      if (index < nuevosProductos.length && 
          nuevosProductos[index].pruebasPorCajaDefault !== undefined && 
          nuevosProductos[index].pruebasPorCajaDefault! > 0) {
        const producto = nuevosProductos[index];
        producto.pruebasPorCaja = producto.pruebasPorCajaDefault;
      }
      return nuevosProductos;
    });
  }, []);

  const ajustarCantidadRecibidaOptimizada = useCallback((index: number, incremento: number) => {
    setRecepcionProductos(prev => {
      const nuevosProductos = [...prev];
      if (index < nuevosProductos.length) {
        const producto = nuevosProductos[index];
        const nuevaCantidad = producto.cantidadRecibida + incremento;
        if (nuevaCantidad >= 0) {
          producto.cantidadRecibida = nuevaCantidad;
          producto.nuevoStock = producto.stockActual + nuevaCantidad;
          producto.totalPruebasRecibidas = nuevaCantidad;
        }
      }
      return nuevosProductos;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      if (intervaloRefrescoRef.current) clearInterval(intervaloRefrescoRef.current);
    };
  }, []);

  const convertirFecha = (fecha: any): Date => {
    if (!fecha) return new Date();
    if (fecha instanceof Date) return fecha;
    if (fecha.toDate && typeof fecha.toDate === 'function') return fecha.toDate();
    if (fecha.seconds && fecha.nanoseconds) return new Date(fecha.seconds * 1000 + fecha.nanoseconds / 1000000);
    if (typeof fecha === 'string') return new Date(fecha);
    return new Date();
  };

  // Cargar todos los datos usando colecciones Tíber
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Productos Tíber
        const productosRef = collection(db, COLECCIONES.productos);
        const qProductos = query(productosRef, orderBy(sortField, sortDirection));
        const productosSnapshot = await getDocs(qProductos);
        const productosData = productosSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nombre: data.nombre || 'Sin nombre',
            disciplina: data.disciplina || 'Sin disciplina',
            stock_actual: Number(data.stock_actual) || 0,
            alerta_minima: Number(data.alerta_minima) || 10,
            unidad_medida: data.unidad_medida || 'unidades',
            codigo: data.codigo || '',
            proveedor: data.proveedor || 'Sin proveedor',
            proveedor_id: data.proveedor_id || '',
            precio_unitario: Number(data.precio_unitario) || 0,
            categoria: data.categoria || '',
            fabricante: data.fabricante || '',
            pruebas_por_caja: Number(data.pruebas_por_caja) || 0,
            lote: data.lote || '',
            fecha_vencimiento: data.fecha_vencimiento || ''
          } as Producto;
        });
        setProductos(productosData);
        
        // Proveedores Tíber
        const proveedoresRef = collection(db, COLECCIONES.proveedores);
        const qProveedores = query(proveedoresRef, orderBy('razonSocial'));
        const proveedoresSnapshot = await getDocs(qProveedores);
        const proveedoresData = proveedoresSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nombre: data.razonSocial || 'Sin nombre',
            contacto: data.contacto || '',
            telefono: data.telefono || '',
            correo: data.correo || '',
            direccion: data.direccion || '',
            pruebas_por_caja_default: Number(data.pruebas_por_caja_default) || 0
          } as Proveedor;
        });
        setProveedores(proveedoresData);
        
        // Solicitudes Tíber
        const solicitudesRef = collection(db, COLECCIONES.solicitudes);
        const qSolicitudes = query(solicitudesRef, orderBy('numero', 'desc'), limit(50));
        const solicitudesSnapshot = await getDocs(qSolicitudes);
        const solicitudesData = solicitudesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            numero: data.numero || `SOL-${doc.id.slice(0, 8)}`,
            fecha: data.fecha || Timestamp.now(),
            productos: (data.productos || []).map((p: any) => ({
              productoId: p.productoId || '',
              nombre: p.nombre || 'Sin nombre',
              cantidadSolicitada: Number(p.cantidadSolicitada) || 0,
              cantidadAprobada: Number(p.cantidadAprobada) || 0,
              stockDisponible: Number(p.stockDisponible) || 0,
              unidad_medida: p.unidad_medida || 'unidades',
              precio_unitario: Number(p.precio_unitario) || 0,
              proveedor: p.proveedor || 'Sin proveedor',
              proveedor_id: p.proveedor_id || '',
              fabricante: p.fabricante || '',
              estado: p.estado || 'pendiente',
              comentario: p.comentario || '',
              pruebas_por_caja: Number(p.pruebas_por_caja) || 0
            })),
            estado: data.estado as Solicitud['estado'] || 'pendiente',
            solicitante: data.solicitante || 'Usuario desconocido',
            departamento: data.departamento || 'Sin departamento',
            aprobador: data.aprobador || '',
            fechaAprobacion: data.fechaAprobacion || undefined,
            comentarios: data.comentarios || '',
            totalProductos: Number(data.totalProductos) || 0,
            totalUnidadesSolicitadas: Number(data.totalUnidadesSolicitadas) || 0,
            totalUnidadesAprobadas: Number(data.totalUnidadesAprobadas) || 0,
            ordenesCompra: data.ordenesCompra || [],
            totalPruebasSolicitadas: Number(data.totalPruebasSolicitadas) || 0
          } as Solicitud;
        });
        setSolicitudes(solicitudesData);
        
        // Órdenes de compra Tíber
        const ordenesRef = collection(db, COLECCIONES.ordenesCompra);
        const qOrdenes = query(ordenesRef, orderBy('numero', 'desc'), limit(50));
        const ordenesSnapshot = await getDocs(qOrdenes);
        const ordenesData = ordenesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            numero: data.numero || `OC-${doc.id.slice(0, 8)}`,
            fecha: data.fecha || Timestamp.now(),
            solicitudId: data.solicitudId || '',
            solicitudNumero: data.solicitudNumero || '',
            proveedor: data.proveedor || 'Sin proveedor',
            proveedor_id: data.proveedor_id || '',
            proveedor_contacto: data.proveedor_contacto || '',
            proveedor_telefono: data.proveedor_telefono || '',
            proveedor_email: data.proveedor_email || '',
            productos: (data.productos || []).map((p: any) => ({
              id: p.id || '',
              productoId: p.productoId || '',
              nombre: p.nombre || 'Sin nombre',
              cantidad: Number(p.cantidad) || 0,
              precioUnitario: Number(p.precioUnitario) || 0,
              subtotal: Number(p.subtotal) || 0,
              unidad_medida: p.unidad_medida || 'unidades',
              pruebas_por_caja: Number(p.pruebas_por_caja) || 0,
              fabricante: p.fabricante || '',
              proveedor: p.proveedor || ''
            })),
            subtotal: Number(data.subtotal) || 0,
            iva: Number(data.iva) || 0,
            total: Number(data.total) || 0,
            estado: data.estado as OrdenCompra['estado'] || 'pendiente',
            fechaEntrega: data.fechaEntrega || undefined,
            fechaRecepcion: data.fechaRecepcion || undefined,
            numeroFactura: data.numeroFactura || '',
            observaciones: data.observaciones || '',
            creadaPor: data.creadaPor || 'Sistema',
            totalPruebas: Number(data.totalPruebas) || 0,
            evaluacionPorcentaje: data.evaluacionPorcentaje,
            evaluacionEvaluadoPor: data.evaluacionEvaluadoPor,
            evaluacionAprobada: data.evaluacionAprobada
          } as OrdenCompra;
        });
        setOrdenesCompra(ordenesData);
        
      } catch (error: any) {
        console.error("Error cargando datos Tíber:", error);
        mostrarMensaje('error', 'Error al cargar los datos', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [sortField, sortDirection]);

  useEffect(() => {
    if (mostrarFormularioRecepcion) {
      if (intervaloRefrescoRef.current) clearInterval(intervaloRefrescoRef.current);
      intervaloRefrescoRef.current = setInterval(() => {
        refrescarDatosModalRecepcion();
      }, 790000);
      return () => {
        if (intervaloRefrescoRef.current) clearInterval(intervaloRefrescoRef.current);
      };
    }
  }, [mostrarFormularioRecepcion]);

  const refrescarDatosModalRecepcion = async () => {
    if (!ordenSeleccionada || recepcionProductos.length === 0) return;
    try {
      setMensaje({ tipo: 'info', texto: 'Actualizando datos de recepción...' });
      const productosActualizados = await Promise.all(
        recepcionProductos.map(async (producto) => {
          try {
            const productoRef = doc(db, COLECCIONES.productos, producto.productoId);
            const productoDoc = await getDoc(productoRef);
            if (productoDoc.exists()) {
              const productoData = productoDoc.data();
              const stockActual = productoData.stock_actual || 0;
              return {
                ...producto,
                stockActual: stockActual,
                nuevoStock: stockActual + (producto.cantidadRecibida * (producto.pruebasPorCaja || 1))
              };
            }
          } catch (error) { console.warn(error); }
          return producto;
        })
      );
      setRecepcionProductos(productosActualizados);
      const ordenRef = doc(db, COLECCIONES.ordenesCompra, ordenSeleccionada.id);
      const ordenDoc = await getDoc(ordenRef);
      if (ordenDoc.exists()) {
        const ordenData = ordenDoc.data();
        setOrdenSeleccionada(prev => ({
          ...prev!,
          estado: ordenData.estado || prev!.estado,
          fechaRecepcion: ordenData.fechaRecepcion || prev!.fechaRecepcion,
          numeroFactura: ordenData.numeroFactura || prev!.numeroFactura
        }));
      }
      setMensaje({ tipo: 'exito', texto: 'Datos de recepción actualizados automáticamente' });
    } catch (error: any) {
      console.error('Error refrescando:', error);
      setMensaje({ tipo: 'error', texto: 'Error al actualizar datos', detalle: error.message });
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    const itemExistente = carrito.find(item => item.producto.id === producto.id);
    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { producto, cantidad: 1 }]);
    }
    mostrarMensaje('exito', `${producto.nombre} agregado al carrito`);
  };

  const quitarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter(item => item.producto.id !== productoId));
  };

  const actualizarCantidad = (productoId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) {
      quitarDelCarrito(productoId);
      return;
    }
    setCarrito(carrito.map(item =>
      item.producto.id === productoId ? { ...item, cantidad: nuevaCantidad } : item
    ));
  };

  const crearSolicitud = async () => {
    if (!usuarioActual) {
      mostrarMensaje('error', 'Debe iniciar sesión para crear una solicitud');
      return;
    }
    if (carrito.length === 0) {
      mostrarMensaje('error', 'El carrito está vacío');
      return;
    }
    try {
      setProcesando(true);
      const productosSolicitud: ProductoSolicitud[] = carrito.map(item => {
        const pruebasPorCaja = obtenerPruebasPorCaja(
          item.producto.nombre, 
          item.producto.fabricante || '', 
          item.producto.proveedor
        );
        return {
          productoId: item.producto.id,
          nombre: item.producto.nombre,
          cantidadSolicitada: item.cantidad,
          stockDisponible: item.producto.stock_actual || 0,
          unidad_medida: item.producto.unidad_medida,
          precio_unitario: item.producto.precio_unitario || 0,
          proveedor: item.producto.proveedor,
          proveedor_id: item.producto.proveedor_id || '',
          fabricante: item.producto.fabricante || '',
          estado: 'pendiente',
          comentario: '',
          pruebas_por_caja: pruebasPorCaja
        };
      });

      let ultimoNumero = 'SOL-00000';
      try {
        const solicitudesRef = collection(db, COLECCIONES.solicitudes);
        const q = query(solicitudesRef, orderBy('numero', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          ultimoNumero = snapshot.docs[0].data().numero || 'SOL-00000';
        }
      } catch (error) { console.warn(error); }

      const match = ultimoNumero.match(/SOL-(\d+)/);
      const numeroActual = match ? parseInt(match[1]) : 0;
      const nuevoNumero = `SOL-${(numeroActual + 1).toString().padStart(5, '0')}`;

      const totalPruebasSolicitadas = productosSolicitud.reduce((sum, p) => 
        sum + (p.pruebas_por_caja && p.pruebas_por_caja > 0 ? p.cantidadSolicitada * p.pruebas_por_caja : 0), 0);

      const nuevaSolicitud = {
        numero: nuevoNumero,
        fecha: Timestamp.now(),
        productos: productosSolicitud,
        estado: 'pendiente',
        solicitante: usuarioActual.nombre,
        departamento: usuarioActual.departamento,
        comentarios: comentarioSolicitud || '',
        totalProductos: carrito.length,
        totalUnidadesSolicitadas: carrito.reduce((total, item) => total + item.cantidad, 0),
        totalUnidadesAprobadas: 0,
        totalPruebasSolicitadas,
        aprobador: '',
        fechaAprobacion: null,
        ordenesCompra: [],
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now()
      };

      const solicitudValidada = JSON.parse(JSON.stringify(nuevaSolicitud));
      const solicitudesRef = collection(db, COLECCIONES.solicitudes);
      const docRef = await addDoc(solicitudesRef, solicitudValidada);

      await addDoc(collection(db, COLECCIONES.historial), {
        tipo: 'solicitud_creada',
        solicitudId: docRef.id,
        solicitudNumero: nuevoNumero,
        fecha: Timestamp.now(),
        usuario: usuarioActual.nombre,
        detalles: `Solicitud creada con ${carrito.length} productos`,
        productos: productosSolicitud.map(p => ({
          nombre: p.nombre,
          cantidad: p.cantidadSolicitada,
          proveedor: p.proveedor,
          pruebas_por_caja: p.pruebas_por_caja || 0
        }))
      });

      const solicitudLocal: Solicitud = {
        id: docRef.id,
        numero: nuevoNumero,
        fecha: nuevaSolicitud.fecha,
        productos: productosSolicitud,
        estado: 'pendiente',
        solicitante: usuarioActual.nombre,
        departamento: usuarioActual.departamento,
        comentarios: comentarioSolicitud,
        totalProductos: carrito.length,
        totalUnidadesSolicitadas: nuevaSolicitud.totalUnidadesSolicitadas,
        totalUnidadesAprobadas: 0,
        totalPruebasSolicitadas
      };

      setSolicitudes(prev => [solicitudLocal, ...prev].sort((a, b) => b.numero.localeCompare(a.numero)));
      setCarrito([]);
      setComentarioSolicitud('');
      mostrarMensaje('exito', `Solicitud ${nuevoNumero} creada exitosamente`);
      setTimeout(() => setActiveTab('solicitudes'), 1000);
    } catch (error: any) {
      console.error(error);
      mostrarMensaje('error', 'Error al crear la solicitud', error.message);
    } finally {
      setProcesando(false);
    }
  };

  const eliminarSolicitud = async (solicitudId: string, solicitudNumero: string) => {
    if (!usuarioActual) {
      mostrarMensaje('error', 'Debe iniciar sesión');
      return;
    }
    if (!window.confirm(`¿Eliminar solicitud ${solicitudNumero}?`)) return;
    try {
      setProcesando(true);
      const solicitud = solicitudes.find(s => s.id === solicitudId);
      if (solicitud?.ordenesCompra?.length) {
        if (!window.confirm(`Esta solicitud tiene ${solicitud.ordenesCompra.length} órdenes asociadas. ¿Eliminar también?`)) {
          setProcesando(false);
          return;
        }
        for (const ordenId of solicitud.ordenesCompra) {
          await deleteDoc(doc(db, COLECCIONES.ordenesCompra, ordenId));
          await addDoc(collection(db, COLECCIONES.historial), {
            tipo: 'orden_eliminada',
            ordenCompraId: ordenId,
            fecha: Timestamp.now(),
            usuario: usuarioActual.nombre,
            detalles: `Orden eliminada por eliminación de solicitud ${solicitudNumero}`,
            relacionSolicitud: solicitudNumero
          });
        }
      }
      await deleteDoc(doc(db, COLECCIONES.solicitudes, solicitudId));
      await addDoc(collection(db, COLECCIONES.historial), {
        tipo: 'solicitud_eliminada',
        solicitudId,
        solicitudNumero,
        fecha: Timestamp.now(),
        usuario: usuarioActual.nombre,
        detalles: `Solicitud ${solicitudNumero} eliminada`
      });
      setSolicitudes(prev => prev.filter(s => s.id !== solicitudId));
      if (solicitud?.ordenesCompra) {
        setOrdenesCompra(prev => prev.filter(o => !solicitud.ordenesCompra?.includes(o.id)));
      }
      mostrarMensaje('exito', `Solicitud ${solicitudNumero} eliminada`);
      setMenuAbiertoId(null);
    } catch (error: any) {
      console.error(error);
      mostrarMensaje('error', 'Error al eliminar', error.message);
    } finally {
      setProcesando(false);
    }
  };

  const eliminarOrdenCompra = async (ordenId: string, ordenNumero: string, solicitudNumero: string) => {
    if (!usuarioActual) {
      mostrarMensaje('error', 'Debe iniciar sesión');
      return;
    }
    if (!window.confirm(`¿Eliminar orden ${ordenNumero}?`)) return;
    try {
      setProcesando(true);
      await deleteDoc(doc(db, COLECCIONES.ordenesCompra, ordenId));
      await addDoc(collection(db, COLECCIONES.historial), {
        tipo: 'orden_eliminada',
        ordenCompraId: ordenId,
        ordenCompraNumero: ordenNumero,
        fecha: Timestamp.now(),
        usuario: usuarioActual.nombre,
        detalles: `Orden ${ordenNumero} eliminada`,
        relacionSolicitud: solicitudNumero
      });
      setOrdenesCompra(prev => prev.filter(o => o.id !== ordenId));
      const solicitud = solicitudes.find(s => s.ordenesCompra?.includes(ordenId));
      if (solicitud) {
        const solicitudRef = doc(db, COLECCIONES.solicitudes, solicitud.id);
        const nuevasOrdenes = solicitud.ordenesCompra?.filter(id => id !== ordenId) || [];
        const nuevoEstado = nuevasOrdenes.length === 0 ? 'aprobada' : solicitud.estado;
        await updateDoc(solicitudRef, { ordenesCompra: nuevasOrdenes, estado: nuevoEstado, actualizadoEn: Timestamp.now() });
        setSolicitudes(prev => prev.map(s => s.id === solicitud.id ? { ...s, ordenesCompra: nuevasOrdenes, estado: nuevoEstado } : s));
      }
      mostrarMensaje('exito', `Orden ${ordenNumero} eliminada`);
      setMenuAbiertoId(null);
    } catch (error: any) {
      console.error(error);
      mostrarMensaje('error', 'Error al eliminar orden', error.message);
    } finally {
      setProcesando(false);
    }
  };

  const procesarProductoSolicitud = async (
    solicitudId: string,
    productoId: string,
    aprobar: boolean,
    cantidadAprobada?: number,
    comentario?: string
  ) => {
    if (!usuarioActual) {
      mostrarMensaje('error', 'Debe iniciar sesión para realizar esta acción');
      return;
    }
  
    try {
      const solicitud = solicitudes.find(s => s.id === solicitudId);
      if (!solicitud) return;
  
      const productosActualizados = solicitud.productos.map(p => {
        if (p.productoId !== productoId) return p;
        const nuevoEstado: 'aprobado' | 'rechazado' = aprobar ? 'aprobado' : 'rechazado';
        return {
          ...p,
          estado: nuevoEstado,
          cantidadAprobada: aprobar ? (cantidadAprobada || p.cantidadSolicitada) : 0,
          comentario: comentario || ''
        };
      });
  
      const productosAprobados = productosActualizados.filter(p => p.estado === 'aprobado');
      const productosRechazados = productosActualizados.filter(p => p.estado === 'rechazado');
      const productosPendientes = productosActualizados.filter(p => p.estado === 'pendiente');
  
      let nuevoEstado: Solicitud['estado'] = 'pendiente';
      if (productosPendientes.length === 0) {
        nuevoEstado = productosRechazados.length === solicitud.productos.length ? 'rechazada' : 'aprobada';
      } else if (productosAprobados.length > 0) {
        nuevoEstado = 'parcial';
      }
  
      const totalUnidadesAprobadas = productosAprobados.reduce((sum, p) => sum + (p.cantidadAprobada || 0), 0);
  
      // Preparar datos para Firestore (sin actualizadoEn si no está en la interfaz)
      const datosActualizacion: any = {
        productos: productosActualizados,
        estado: nuevoEstado,
        totalUnidadesAprobadas
      };
  
      if (nuevoEstado === 'aprobada') {
        datosActualizacion.aprobador = usuarioActual.nombre;
        datosActualizacion.fechaAprobacion = Timestamp.now();
      }
  
      const solicitudRef = doc(db, COLECCIONES.solicitudes, solicitudId);
      await updateDoc(solicitudRef, datosActualizacion);
  
      // Historial
      const producto = solicitud.productos.find(p => p.productoId === productoId);
      if (producto) {
        await addDoc(collection(db, COLECCIONES.historial), {
          tipo: aprobar ? 'producto_aprobado' : 'producto_rechazado',
          solicitudId,
          solicitudNumero: solicitud.numero,
          productoId,
          productoNombre: producto.nombre,
          fecha: Timestamp.now(),
          usuario: usuarioActual.nombre,
          detalles: aprobar 
            ? `Producto aprobado: ${cantidadAprobada || producto.cantidadSolicitada} unidades`
            : `Producto rechazado: ${comentario || 'Sin comentario'}`,
          cantidadSolicitada: producto.cantidadSolicitada,
          cantidadAprobada: aprobar ? (cantidadAprobada || producto.cantidadSolicitada) : 0,
          comentario: comentario || '',
          pruebas_por_caja: producto.pruebas_por_caja || 0
        });
      }
  
      // Actualizar estado local
      setSolicitudes(prev =>
        prev.map(s => {
          if (s.id !== solicitudId) return s;
          // Construir objeto explícitamente
          const updated: Solicitud = {
            ...s,
            productos: productosActualizados,
            estado: nuevoEstado,
            totalUnidadesAprobadas
          };
          if (nuevoEstado === 'aprobada') {
            updated.aprobador = usuarioActual.nombre;
            updated.fechaAprobacion = Timestamp.now();
          }
          return updated;
        }).sort((a, b) => b.numero.localeCompare(a.numero))
      );
  
      mostrarMensaje('exito', `Producto ${aprobar ? 'aprobado' : 'rechazado'} correctamente`);
    } catch (error: any) {
      console.error('Error al procesar producto:', error);
      mostrarMensaje('error', 'Error al procesar el producto', error.message);
    }
  };

  const generarOrdenesPorProveedor = async (solicitudId: string) => {
    if (!usuarioActual) {
      mostrarMensaje('error', 'Debe iniciar sesión');
      return;
    }
    try {
      setProcesando(true);
      const solicitud = solicitudes.find(s => s.id === solicitudId);
      if (!solicitud || solicitud.estado !== 'aprobada') {
        mostrarMensaje('error', 'La solicitud debe estar completamente aprobada');
        return;
      }
  
      const productosAprobados = solicitud.productos.filter(p => p.estado === 'aprobado');
      const productosPorProveedor: { [key: string]: ProductoSolicitud[] } = {};
      productosAprobados.forEach(producto => {
        const proveedorKey = producto.proveedor_id || producto.proveedor;
        if (!productosPorProveedor[proveedorKey]) productosPorProveedor[proveedorKey] = [];
        productosPorProveedor[proveedorKey].push(producto);
      });
  
      const ordenesExistentes = ordenesCompra.filter(o => o.solicitudId === solicitudId);
      const ordenesGeneradas: OrdenCompra[] = [];
      const ordenIds: string[] = [];
      const proveedoresKeys = Object.keys(productosPorProveedor);
      
      for (let i = 0; i < proveedoresKeys.length; i++) {
        const proveedorKey = proveedoresKeys[i];
        const productos = productosPorProveedor[proveedorKey];
        let proveedorInfo = proveedores.find(p => p.id === proveedorKey);
        if (!proveedorInfo) {
          const nombreCorto = productos[0]?.proveedor;
          if (nombreCorto) proveedorInfo = buscarProveedorPorNombre(nombreCorto);
        }
        if (proveedorInfo) {
          const batch = writeBatch(db);
          for (const producto of productos) {
            if (producto.productoId) {
              const productoRef = doc(db, COLECCIONES.productos, producto.productoId);
              batch.update(productoRef, { proveedor_id: proveedorInfo.id });
            }
          }
          await batch.commit();
        }
        const nombreProveedorOrden = proveedorInfo?.nombre || productos[0]?.proveedor || 'Sin proveedor';
        const proveedorIdOrden = proveedorInfo?.id || proveedorKey || '';
        const proveedorContacto = proveedorInfo?.contacto || '';
        const proveedorTelefono = proveedorInfo?.telefono || '';
        const proveedorEmail = proveedorInfo?.correo || '';
  
        // Extraer número base (ej: "00123" de "SOL-00123")
        const numeroBase = solicitud.numero.match(/SOL-(\d+)/)?.[1] || '00000';
        // 🔹 MODIFICACIÓN: se agrega una 't' entre el número base y el sufijo letra
        const sufijoLetra = generarSufijoLetra(ordenesExistentes.length + i);
        const nuevoNumero = `OC-${numeroBase}t${sufijoLetra}`;  // Ejemplo: OC-00123t-A
  
        const productosOrden = productos.map(producto => {
          const precioUnitario = producto.precio_unitario || 0;
          const cantidad = producto.cantidadAprobada || producto.cantidadSolicitada || 0;
          const subtotal = precioUnitario * cantidad;
          return {
            id: `${producto.productoId}-${Date.now()}`,
            productoId: producto.productoId || '',
            nombre: producto.nombre,
            cantidad,
            precioUnitario,
            subtotal,
            unidad_medida: producto.unidad_medida,
            pruebas_por_caja: producto.pruebas_por_caja || 0,
            fabricante: producto.fabricante || '',
            proveedor: producto.proveedor || ''
          };
        });
  
        const subtotal = productosOrden.reduce((sum, prod) => sum + (prod.subtotal || 0), 0);
        const iva = subtotal * 0.19;
        const total = subtotal + iva;
        const totalPruebas = productosOrden.reduce((sum, prod) => 
          sum + (prod.pruebas_por_caja && prod.pruebas_por_caja > 0 ? prod.cantidad * prod.pruebas_por_caja : 0), 0);
  
        const nuevaOrden: Omit<OrdenCompra, 'id'> = {
          numero: nuevoNumero,
          fecha: Timestamp.now(),
          solicitudId: solicitud.id,
          solicitudNumero: solicitud.numero,
          proveedor: nombreProveedorOrden,
          proveedor_id: proveedorIdOrden,
          proveedor_contacto: proveedorContacto,
          proveedor_telefono: proveedorTelefono,
          proveedor_email: proveedorEmail,
          productos: productosOrden,
          subtotal,
          iva,
          total,
          estado: 'generada',
          observaciones: `Generada desde solicitud ${solicitud.numero} - Proveedor: ${nombreProveedorOrden}`,
          creadaPor: usuarioActual.nombre,
          totalPruebas
        };
  
        const ordenValidada = JSON.parse(JSON.stringify(nuevaOrden));
        const ordenesRef = collection(db, COLECCIONES.ordenesCompra);
        const docRef = await addDoc(ordenesRef, ordenValidada);
        ordenIds.push(docRef.id);
        const ordenLocal: OrdenCompra = { id: docRef.id, ...nuevaOrden };
        ordenesGeneradas.push(ordenLocal);
  
        await addDoc(collection(db, COLECCIONES.historial), {
          tipo: 'orden_generada',
          ordenCompraId: docRef.id,
          ordenCompraNumero: nuevoNumero,
          solicitudId,
          solicitudNumero: solicitud.numero,
          fecha: Timestamp.now(),
          usuario: usuarioActual.nombre,
          detalles: `Orden ${nuevoNumero} generada para ${productos.length} productos`,
          proveedor: nuevaOrden.proveedor,
          total,
          totalPruebas,
          relacionSolicitud: `Orden derivada de solicitud ${solicitud.numero}`
        });
      }
  
      const solicitudRef = doc(db, COLECCIONES.solicitudes, solicitudId);
      await updateDoc(solicitudRef, {
        ordenesCompra: [...(solicitud.ordenesCompra || []), ...ordenIds],
        estado: 'procesada',
        actualizadoEn: Timestamp.now()
      });
  
      setOrdenesCompra(prev => [...ordenesGeneradas, ...prev].sort((a, b) => b.numero.localeCompare(a.numero)));
      setSolicitudes(prev => 
        prev.map(s => {
          if (s.id !== solicitudId) return s;
          const updated: Solicitud = {
            ...s,
            ordenesCompra: [...(s.ordenesCompra || []), ...ordenIds],
            estado: 'procesada' as const
          };
          return updated;
        }).sort((a, b) => b.numero.localeCompare(a.numero))
      );
  
      mostrarMensaje('exito', `Se generaron ${ordenesGeneradas.length} órdenes de compra`);
    } catch (error: any) {
      console.error(error);
      mostrarMensaje('error', 'Error al generar órdenes', error.message);
    } finally {
      setProcesando(false);
    }
  };
  
  // Función auxiliar para generar sufijo con letras (ej: -A, -B, ..., -Z, -AA, ...)
  const generarSufijoLetra = (indice: number): string => {
    let resultado = '';
    let n = indice;
    while (n >= 0) {
      resultado = String.fromCharCode(65 + (n % 26)) + resultado;
      n = Math.floor(n / 26) - 1;
    }
    return `-${resultado}`;
  };
  
  const iniciarRecepcion = async (orden: OrdenCompra) => {
    if (!usuarioActual) {
      mostrarMensaje('error', 'Debe iniciar sesión');
      return;
    }
    try {
      setOrdenSeleccionada(orden);
      setEvaluacion({
        productosTotales: '',
        presentacion: '',
        caducidad: '',
        integridadProducto: '',
        tiempoEntrega: '',
        puntuacionTotal: 0,
        porcentajeTotal: 0,
        observacionesEvaluacion: '',
        evaluadoPor: usuarioActual.nombre,
        fechaEvaluacion: new Date()
      });
      
      const productosRecepcion: RecepcionProducto[] = await Promise.all(
        orden.productos.map(async (producto) => {
          let stockActual = 0;
          let codigoProducto = '';
          let fabricante = '';
          let pruebasPorCaja = producto.pruebas_por_caja || 0;
          try {
            const productoRef = doc(db, COLECCIONES.productos, producto.productoId);
            const productoDoc = await getDoc(productoRef);
            if (productoDoc.exists()) {
              const productoData = productoDoc.data();
              stockActual = productoData.stock_actual || 0;
              codigoProducto = productoData.codigo || '';
              fabricante = productoData.fabricante || '';
              if (!pruebasPorCaja) pruebasPorCaja = productoData.pruebas_por_caja || 0;
            }
          } catch (error) { console.warn(error); }
          if (!pruebasPorCaja || pruebasPorCaja === 0) {
            pruebasPorCaja = obtenerPruebasPorCaja(producto.nombre, producto.fabricante || fabricante, producto.proveedor || orden.proveedor);
          }
          const totalPruebasRecibidas = pruebasPorCaja > 0 ? producto.cantidad * pruebasPorCaja : producto.cantidad;
          return {
            productoId: producto.productoId,
            productoNombre: producto.nombre,
            codigoProducto,
            cantidadOrdenada: producto.cantidad,
            cantidadRecibida: producto.cantidad,
            diferencia: 0,
            numeroLote: '',
            fechaVencimiento: '',
            observaciones: '',
            fabricante,
            unidadMedida: producto.unidad_medida,
            precioUnitario: producto.precioUnitario,
            stockActual,
            nuevoStock: stockActual + totalPruebasRecibidas,
            pruebasPorCaja,
            totalPruebasRecibidas,
            pruebasPorCajaDefault: pruebasPorCaja,
            proveedor: producto.proveedor || orden.proveedor
          };
        })
      );
      setRecepcionProductos(productosRecepcion);
      setMostrarFormularioRecepcion(true);
    } catch (error: any) {
      console.error(error);
      mostrarMensaje('error', 'Error al preparar la recepción');
    }
  };

  const reiniciarRecepcion = useCallback(() => {
    const nuevosProductos = recepcionProductos.map(producto => ({
      ...producto,
      cantidadRecibida: producto.cantidadOrdenada,
      diferencia: 0,
      nuevoStock: producto.stockActual + (producto.cantidadOrdenada * (producto.pruebasPorCaja || 1))
    }));
    setRecepcionProductos(nuevosProductos);
    mostrarMensaje('exito', 'Cantidades reiniciadas');
  }, [recepcionProductos]);

  const resumen = useMemo(() => {
    const totalProductos = recepcionProductos.length;
    const productosConRecepcion = recepcionProductos.filter(p => p.cantidadRecibida > 0).length;
    const cantidadTotalRecibida = recepcionProductos.reduce((sum, p) => sum + p.cantidadRecibida, 0);
    const valorTotalRecibido = recepcionProductos.reduce((sum, p) => sum + (p.cantidadRecibida * p.precioUnitario), 0);
    const productosConLote = recepcionProductos.filter(p => p.numeroLote.trim() !== '').length;
    const productosConPruebasPorCaja = recepcionProductos.filter(p => p.pruebasPorCaja !== undefined && p.pruebasPorCaja > 0).length;
    const totalPruebasRecibidas = recepcionProductos.reduce((sum, p) => 
      sum + (p.pruebasPorCaja && p.pruebasPorCaja > 0 ? p.cantidadRecibida * p.pruebasPorCaja : p.cantidadRecibida), 0);
    return { totalProductos, productosConRecepcion, cantidadTotalRecibida, valorTotalRecibido, productosConLote, productosConPruebasPorCaja, totalPruebasRecibidas };
  }, [recepcionProductos]);

  const validarRecepcion = useCallback(() => {
    if (!numeroFactura.trim()) {
      mostrarMensaje('error', 'El número de factura es obligatorio');
      return false;
    }
    return true;
  }, [numeroFactura]);

  const registrarRecepcion = async () => {
    if (!usuarioActual) {
      mostrarMensaje('error', 'Debe iniciar sesión');
      return;
    }
    if (!validarRecepcion() || !ordenSeleccionada) return;
    try {
      setProcesando(true);
      const recepcionBatch = writeBatch(db);
      const timestamp = Timestamp.now();
  
      const ordenRef = doc(db, COLECCIONES.ordenesCompra, ordenSeleccionada.id);
      recepcionBatch.update(ordenRef, {
        estado: 'completada',
        fechaRecepcion: timestamp,
        numeroFactura,
        recepcionCompletadaPor: usuarioActual.nombre,
        totalPruebasRecibidas: resumen.totalPruebasRecibidas,
        evaluacionPorcentaje: evaluacion.porcentajeTotal,
        evaluacionEvaluadoPor: usuarioActual.nombre,
        evaluacionAprobada: evaluacion.porcentajeTotal >= 80,
        actualizadoEn: timestamp
      });
  
      const recepcionRef = doc(collection(db, COLECCIONES.recepciones));
      recepcionBatch.set(recepcionRef, {
        ordenCompraId: ordenSeleccionada.id,
        ordenCompraNumero: ordenSeleccionada.numero,
        fechaRecepcion: timestamp,
        numeroFactura,
        productos: recepcionProductos.map(p => ({
          ...p,
          totalPruebasRecibidas: p.pruebasPorCaja && p.pruebasPorCaja > 0 ? p.cantidadRecibida * p.pruebasPorCaja : p.cantidadRecibida
        })),
        observaciones: observacionesGenerales,
        recibidoPor: usuarioActual.nombre,
        departamento: usuarioActual.departamento,
        fechaRegistro: timestamp,
        estado: 'completada',
        totalPruebas: resumen.totalPruebasRecibidas
      });
  
      const evaluacionRef = doc(collection(db, COLECCIONES.evaluaciones));
      recepcionBatch.set(evaluacionRef, {
        ...evaluacion,
        fechaEvaluacion: timestamp,
        ordenCompraId: ordenSeleccionada.id,
        ordenCompraNumero: ordenSeleccionada.numero,
        proveedor: ordenSeleccionada.proveedor,
        proveedor_id: ordenSeleccionada.proveedor_id,
        puntuacionTotal: evaluacion.puntuacionTotal,
        porcentajeTotal: evaluacion.porcentajeTotal,
        evaluacionAprobada: evaluacion.porcentajeTotal >= 80
      });
  
      // Actualizar stock (sumando PRUEBAS, agrupando por producto)
      const acumulado = new Map<string, { totalPruebas: number; lote?: string; fechaVencimiento?: string; pruebasPorCaja: number }>();
      for (const producto of recepcionProductos) {
        const pruebas = producto.pruebasPorCaja || 1;
        const totalPruebas = producto.cantidadRecibida * pruebas;
        const existente = acumulado.get(producto.productoId) || { totalPruebas: 0, pruebasPorCaja: pruebas };
        existente.totalPruebas += totalPruebas;
        if (producto.numeroLote) existente.lote = producto.numeroLote;
        if (producto.fechaVencimiento) existente.fechaVencimiento = producto.fechaVencimiento;
        acumulado.set(producto.productoId, existente);
      }
  
      for (const [productoId, data] of acumulado.entries()) {
        const productoRef = doc(db, COLECCIONES.productos, productoId);
        const productoSnap = await getDoc(productoRef);
        if (productoSnap.exists()) {
          const currentStock = productoSnap.data().stock_actual || 0;
          const nuevoStock = currentStock + data.totalPruebas;
          const updateData: any = {
            stock_actual: nuevoStock,
            ultimaActualizacion: timestamp,
            ultimaRecepcion: {
              fecha: timestamp,
              cantidad: data.totalPruebas,
              pruebas_por_caja: data.pruebasPorCaja,
              total_pruebas_recibidas: data.totalPruebas,
              ordenCompra: ordenSeleccionada.numero
            }
          };
          if (data.pruebasPorCaja && data.pruebasPorCaja > 0) updateData.pruebas_por_caja = data.pruebasPorCaja;
          if (data.lote) updateData.lote = data.lote;
          if (data.fechaVencimiento) updateData.fecha_vencimiento = data.fechaVencimiento;
          recepcionBatch.update(productoRef, updateData);
  
          const movimientoRef = doc(collection(db, COLECCIONES.movimientos));
          recepcionBatch.set(movimientoRef, {
            productoId,
            productoNombre: productoSnap.data().nombre || 'Producto',
            tipo: 'recepcion',
            cantidad: data.totalPruebas,
            pruebas_por_caja: data.pruebasPorCaja,
            total_unidades: data.totalPruebas,
            stockAnterior: currentStock,
            stockNuevo: nuevoStock,
            referencia: ordenSeleccionada.numero,
            numeroFactura,
            usuario: usuarioActual.nombre,
            fecha: timestamp,
            observaciones: `Recepción orden ${ordenSeleccionada.numero}`,
            lote: data.lote || '',
            fecha_vencimiento: data.fechaVencimiento || ''
          });
        }
      }
  
      await recepcionBatch.commit();
  
      // Actualizar proveedor
      try {
        const proveedorRef = doc(db, COLECCIONES.proveedores, ordenSeleccionada.proveedor_id);
        const proveedorSnap = await getDoc(proveedorRef);
        if (proveedorSnap.exists()) {
          const proveedorData = proveedorSnap.data();
          const totalRecepciones = (proveedorData.totalRecepciones || 0) + 1;
          const promedioEvaluacion = proveedorData.promedioEvaluacion 
            ? (proveedorData.promedioEvaluacion * proveedorData.totalRecepciones + evaluacion.porcentajeTotal) / totalRecepciones
            : evaluacion.porcentajeTotal;
          const proveedorBatch = writeBatch(db);
          proveedorBatch.update(proveedorRef, {
            totalRecepciones,
            promedioEvaluacion,
            ultimaRecepcion: timestamp,
            ultimaEvaluacion: evaluacion.porcentajeTotal,
            actualizadoEn: timestamp
          });
          await proveedorBatch.commit();
        }
      } catch (proveedorError) {
        console.warn(proveedorError);
      }
  
      mostrarMensaje('exito', `Recepción registrada. Evaluación: ${evaluacion.porcentajeTotal.toFixed(1)}% | Pruebas: ${resumen.totalPruebasRecibidas}`);
      if (intervaloRefrescoRef.current) clearInterval(intervaloRefrescoRef.current);
      setMostrarFormularioRecepcion(false);
      setOrdenSeleccionada(null);
      setRecepcionProductos([]);
      setNumeroFactura('');
      setObservacionesGenerales('');
  
      // Recargar datos
      const fetchData = async () => {
        try {
          const ordenesRef = collection(db, COLECCIONES.ordenesCompra);
          const qOrdenes = query(ordenesRef, orderBy('numero', 'desc'), limit(50));
          const ordenesSnapshot = await getDocs(qOrdenes);
          const ordenesData = ordenesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrdenCompra));
          setOrdenesCompra(ordenesData);
  
          const productosRef = collection(db, COLECCIONES.productos);
          const qProductos = query(productosRef, orderBy(sortField, sortDirection));
          const productosSnapshot = await getDocs(qProductos);
          const productosData = productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto));
          setProductos(productosData);
        } catch (fetchError) {
          console.error(fetchError);
        }
      };
      await fetchData();
    } catch (error: any) {
      console.error(error);
      mostrarMensaje('error', `Error: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };
  
  const mostrarMensaje = (tipo: 'exito' | 'error' | 'info', texto: string, detalle?: string) => {
    setMensaje({ tipo, texto, detalle });
    setTimeout(() => setMensaje(null), 5000);
  };

  const handleSort = (field: 'nombre' | 'stock_actual' | 'disciplina') => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const filteredProductos = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const solicitudesFiltradas = (filtroEstado === 'todos' ? solicitudes : solicitudes.filter(s => s.estado === filtroEstado))
    .sort((a, b) => b.numero.localeCompare(a.numero));
  const ordenesFiltradas = (filtroEstado === 'todos' ? ordenesCompra : ordenesCompra.filter(o => o.estado === filtroEstado))
    .sort((a, b) => b.numero.localeCompare(a.numero));
  const ordenesParaRecepcion = ordenesCompra.filter(o => o.estado === 'generada');
  const ordenesRecibidas = ordenesCompra.filter(o => o.estado === 'completada').sort((a, b) => b.numero.localeCompare(a.numero));
  const totalCarrito = carrito.reduce((total, item) => total + item.cantidad, 0);
  const totalItemsCarrito = carrito.length;

  const verDetallesSolicitud = (solicitud: Solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setMostrarDetalleSolicitud(true);
  };

  const obtenerProveedoresSolicitud = (solicitud: Solicitud) => {
    const proveedoresSet = new Set(solicitud.productos.map(p => p.proveedor));
    return Array.from(proveedoresSet);
  };

  const MenuOpcionesSolicitud = ({ solicitudId, solicitudNumero }: { solicitudId: string, solicitudNumero: string }) => (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setMenuAbiertoId(menuAbiertoId === solicitudId ? null : solicitudId); }} className="p-1 hover:bg-gray-200 rounded">
        <MoreVertical className="w-5 h-5 text-gray-500" />
      </button>
      {menuAbiertoId === solicitudId && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
          <div className="py-1">
            <button onClick={() => eliminarSolicitud(solicitudId, solicitudNumero)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar Solicitud
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const MenuOpcionesOrden = ({ ordenId, ordenNumero, solicitudNumero }: { ordenId: string, ordenNumero: string, solicitudNumero: string }) => (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setMenuAbiertoId(menuAbiertoId === ordenId ? null : ordenId); }} className="p-1 hover:bg-gray-200 rounded">
        <MoreVertical className="w-5 h-5 text-gray-500" />
      </button>
      {menuAbiertoId === ordenId && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
          <div className="py-1">
            <button onClick={() => eliminarOrdenCompra(ordenId, ordenNumero, solicitudNumero)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar Orden
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const DetalleOrdenModal = React.memo(() => {
    if (!ordenSeleccionada || !mostrarDetalleOrden) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Detalle de Orden: {ordenSeleccionada.numero}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" />{convertirFecha(ordenSeleccionada.fecha).toLocaleDateString()}</span>
                  <span className="flex items-center"><Building className="w-4 h-4 mr-1" />{ordenSeleccionada.proveedor}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${ordenSeleccionada.estado === 'generada' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{ordenSeleccionada.estado}</span>
                </div>
                {ordenSeleccionada.totalPruebas && ordenSeleccionada.totalPruebas > 0 && <div className="mt-2 text-sm text-blue-600"><TestTube className="w-4 h-4 inline mr-1" />Total pruebas: {ordenSeleccionada.totalPruebas}</div>}
                {ordenSeleccionada.evaluacionPorcentaje !== undefined && <div className="mt-2 text-sm"><span className={`px-2 py-0.5 rounded-full ${ordenSeleccionada.evaluacionAprobada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Evaluación: {ordenSeleccionada.evaluacionPorcentaje.toFixed(1)}%</span></div>}
              </div>
              <div className="flex gap-2">
                {ordenSeleccionada.estado === 'generada' && <button onClick={() => { setMostrarDetalleOrden(false); iniciarRecepcion(ordenSeleccionada); }} className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm">Recibir</button>}
                <MenuOpcionesOrden ordenId={ordenSeleccionada.id} ordenNumero={ordenSeleccionada.numero} solicitudNumero={ordenSeleccionada.solicitudNumero} />
                <button onClick={() => { setMostrarDetalleOrden(false); setOrdenSeleccionada(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div><h3 className="font-medium">Información</h3><div className="space-y-2 text-sm"><div><span className="font-medium">Solicitud origen:</span> {ordenSeleccionada.solicitudNumero}</div><div><span className="font-medium">Proveedor:</span> {ordenSeleccionada.proveedor}</div><div><span className="font-medium">Contacto:</span> {ordenSeleccionada.proveedor_contacto || 'N/A'}</div><div><span className="font-medium">Teléfono:</span> {ordenSeleccionada.proveedor_telefono || 'N/A'}</div><div><span className="font-medium">Email:</span> {ordenSeleccionada.proveedor_email || 'N/A'}</div></div></div>
              <div><h3 className="font-medium">Totales</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal:</span><span>${ordenSeleccionada.subtotal.toLocaleString()}</span></div><div className="flex justify-between"><span>IVA (19%):</span><span>${ordenSeleccionada.iva.toLocaleString()}</span></div><div className="flex justify-between border-t pt-2"><span className="font-bold">Total:</span><span className="font-bold text-lg text-blue-600">${ordenSeleccionada.total.toLocaleString()}</span></div></div></div>
            </div>
            {ordenSeleccionada.observaciones && <div className="mb-6 p-4 bg-gray-50 rounded-lg"><h3 className="font-medium">Observaciones:</h3><p>{ordenSeleccionada.observaciones}</p></div>}
            <div><h3 className="font-semibold text-lg mb-4">Productos</h3><div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Producto</th><th className="px-4 py-3 text-left">Pruebas/Caja</th><th className="px-4 py-3 text-left">Cantidad</th><th className="px-4 py-3 text-left">Precio</th><th className="px-4 py-3 text-left">Subtotal</th></tr></thead><tbody>{ordenSeleccionada.productos.map((p, idx) => (<tr key={idx}><td className="px-4 py-3">{p.nombre}</td><td className="px-4 py-3">{p.pruebas_por_caja || 'N/A'}</td><td className="px-4 py-3">{p.cantidad}</td><td className="px-4 py-3">${p.precioUnitario.toLocaleString()}</td><td className="px-4 py-3">${p.subtotal.toLocaleString()}</td></tr>))}</tbody></table></div></div>
          </div>
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <button onClick={() => generarPDFOrdenCompra(ordenSeleccionada)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Download className="w-4 h-4" /> Descargar PDF</button>
            <button onClick={() => { setMostrarDetalleOrden(false); setOrdenSeleccionada(null); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cerrar</button>
          </div>
        </div>
      </div>
    );
  });
  DetalleOrdenModal.displayName = 'DetalleOrdenModal';

  const generarPDFOrdenCompra = (orden: OrdenCompra) => {
    if (!orden) return;
    try {
      const contenidoHTML = `...`; // (el contenido del PDF es el mismo que ya tenías, lo omito por brevedad)
      const ventana = window.open('', '_blank');
      if (ventana) {
        ventana.document.write(contenidoHTML);
        ventana.document.close();
        ventana.onload = () => { ventana.print(); ventana.onafterprint = () => ventana.close(); };
        mostrarMensaje('exito', `Preparando impresión de orden ${orden.numero}`);
      } else {
        mostrarMensaje('error', 'No se pudo abrir la ventana');
      }
    } catch (error) {
      mostrarMensaje('error', 'Error al generar el documento');
    }
  };

  const estadisticas = useMemo(() => {
    const productosConPruebas = productos.filter(p => p.pruebas_por_caja && p.pruebas_por_caja > 0);
    return {
      productosBajoStock: productos.filter(p => p.stock_actual <= p.alerta_minima).length,
      solicitudesPendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
      ordenesPendientesRecepcion: ordenesCompra.filter(o => o.estado === 'generada').length,
      ordenesCompletadas: ordenesCompra.filter(o => o.estado === 'completada').length,
      valorTotalOrdenes: ordenesCompra.reduce((sum, o) => sum + o.total, 0),
      productosConPruebasPorCaja: productosConPruebas.length,
      totalPruebasSolicitadas: solicitudes.reduce((sum, s) => sum + (s.totalPruebasSolicitadas || 0), 0),
      totalPruebasEnInventario: productosConPruebas.reduce((sum, p) => sum + (p.stock_actual * (p.pruebas_por_caja || 1)), 0)
    };
  }, [productos, solicitudes, ordenesCompra]);

  if (loading || authLoading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div><p className="ml-3">Cargando datos Tíber...</p></div>;

  return (
    <div className="p-4 sm:p-6">
      {mensaje && (<div className={`mb-4 p-4 rounded-lg ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800' : mensaje.tipo === 'error' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}><div className="flex items-start"><div className="flex-1"><p className="font-medium">{mensaje.texto}</p>{mensaje.detalle && <p className="text-sm">{mensaje.detalle}</p>}</div><button onClick={() => setMensaje(null)} className="ml-4">✕</button></div></div>)}
      
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-800">Gestión de Inventario y Compras - Tíber</h1><p className="text-gray-600">Sistema independiente para sucursal Tíber</p></div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4"><div className="flex justify-between"><div><p className="text-sm text-gray-600">Productos</p><p className="text-2xl font-bold">{productos.length}</p><p className="text-xs text-red-600">{estadisticas.productosBajoStock} bajo stock</p></div><div className="p-2 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div></div></div>
        <div className="bg-white rounded-lg shadow p-4"><div className="flex justify-between"><div><p className="text-sm text-gray-600">Solicitudes</p><p className="text-2xl font-bold text-yellow-600">{solicitudes.length}</p><p className="text-xs text-yellow-600">{estadisticas.solicitudesPendientes} pendientes</p><p className="text-xs text-blue-600">{estadisticas.totalPruebasSolicitadas} pruebas</p></div><div className="p-2 bg-yellow-100 rounded-lg"><FileText className="w-6 h-6 text-yellow-600" /></div></div></div>
        <div className="bg-white rounded-lg shadow p-4"><div className="flex justify-between"><div><p className="text-sm text-gray-600">Órdenes</p><p className="text-2xl font-bold text-blue-600">{ordenesCompra.length}</p><p className="text-xs text-blue-600">{estadisticas.ordenesPendientesRecepcion} por recibir</p><p className="text-xs text-green-600">{estadisticas.ordenesCompletadas} completadas</p></div><div className="p-2 bg-blue-100 rounded-lg"><Truck className="w-6 h-6 text-blue-600" /></div></div></div>
        <div className="bg-white rounded-lg shadow p-4"><div className="flex justify-between"><div><p className="text-sm text-gray-600">Pruebas/Caja</p><p className="text-2xl font-bold text-purple-600">{estadisticas.productosConPruebasPorCaja}</p><p className="text-xs text-purple-600">productos con valor</p></div><div className="p-2 bg-purple-100 rounded-lg"><TestTube className="w-6 h-6 text-purple-600" /></div></div></div>
        <div className="bg-white rounded-lg shadow p-4"><div className="flex justify-between"><div><p className="text-sm text-gray-600">Valor total OC</p><p className="text-2xl font-bold text-green-600">${estadisticas.valorTotalOrdenes.toLocaleString()}</p></div><div className="p-2 bg-green-100 rounded-lg"><DollarSign className="w-6 h-6 text-green-600" /></div></div></div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-4">
          <button onClick={() => setActiveTab('productos')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'productos' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500'}`}><Package className="w-4 h-4 inline mr-2" />Productos ({productos.length}){totalItemsCarrito > 0 && activeTab !== 'productos' && <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{totalItemsCarrito}</span>}</button>
          <button onClick={() => setActiveTab('solicitudes')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'solicitudes' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500'}`}><FileText className="w-4 h-4 inline mr-2" />Solicitudes ({solicitudes.length}){estadisticas.solicitudesPendientes > 0 && <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{estadisticas.solicitudesPendientes} pendientes</span>}</button>
          <button onClick={() => setActiveTab('ordenes')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'ordenes' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500'}`}><Truck className="w-4 h-4 inline mr-2" />Órdenes Compra ({ordenesCompra.length})</button>
          <button onClick={() => setActiveTab('recepcion')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'recepcion' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500'}`}><ClipboardCheck className="w-4 h-4 inline mr-2" />Recepción{ordenesParaRecepcion.length > 0 && <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{ordenesParaRecepcion.length} por recibir</span>}</button>
          <button onClick={() => setActiveTab('recibidas')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'recibidas' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500'}`}><Archive className="w-4 h-4 inline mr-2" />Recibidas ({ordenesRecibidas.length})</button>
        </nav>
      </div>

      {activeTab === 'productos' && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-lg px-4 py-2 w-64"
            />
            <div className="text-sm text-gray-500">
              Mostrando {filteredProductos.length} de {productos.length} productos
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('nombre')}>
                    Producto {sortField === 'nombre' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('stock_actual')}>
                    Stock / Alerta {sortField === 'stock_actual' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('disciplina')}>
                    Disciplina {sortField === 'disciplina' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pruebas/Caja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProductos.map(producto => {
                  const enCarrito = carrito.find(item => item.producto.id === producto.id);
                  const pruebasPorCaja = producto.pruebas_por_caja || 0;
                  const stockEnPruebas = pruebasPorCaja > 0 ? producto.stock_actual * pruebasPorCaja : producto.stock_actual;
                  return (
                    <tr key={producto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{producto.nombre}</div>
                        {producto.codigo && <div className="text-sm text-gray-500">Código: {producto.codigo}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            producto.stock_actual === 0 ? 'bg-red-100 text-red-800' :
                            producto.stock_actual <= producto.alerta_minima ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {producto.stock_actual} {producto.unidad_medida}
                            {pruebasPorCaja > 0 && <span className="ml-1 text-xs">({stockEnPruebas} pruebas)</span>}
                          </div>
                          {enCarrito && <span className="ml-2 text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center">{enCarrito.cantidad}</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Alerta: {producto.alerta_minima} {producto.unidad_medida}</div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">{producto.disciplina}</span></td>
                      <td className="px-6 py-4"><div className="flex items-center text-sm text-gray-700"><Building className="w-4 h-4 mr-2 text-gray-400" />{producto.proveedor}</div></td>
                      <td className="px-6 py-4">
                        <button onClick={() => agregarAlCarrito(producto)} disabled={procesando} className={`px-4 py-2 rounded-lg text-sm font-medium ${procesando ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                          {enCarrito ? 'Agregar más' : 'Solicitar'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {pruebasPorCaja > 0 ? (
                          <div className="flex items-center gap-1">
                            <TestTube className="w-4 h-4 text-blue-500" />
                            <div>
                              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">{pruebasPorCaja} pruebas</span>
                              <div className="text-xs text-gray-500 mt-1">1 caja = {pruebasPorCaja} pruebas</div>
                            </div>
                          </div>
                        ) : <span className="text-xs text-gray-400">N/A</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {carrito.length > 0 && (
            <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border p-4 w-80 z-50">
              <div className="flex justify-between mb-3"><h3 className="font-semibold"><ShoppingCart className="w-5 h-5 inline mr-2" />Carrito ({totalItemsCarrito})</h3><button onClick={() => setCarrito([])} className="text-sm text-red-600">Vaciar</button></div>
              <div className="max-h-48 overflow-y-auto mb-3 space-y-2">{carrito.map(item => (<div key={item.producto.id} className="flex justify-between text-sm"><div className="truncate">{item.producto.nombre}</div><div className="flex items-center gap-2"><button onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)} className="w-6 h-6 bg-gray-200 rounded">-</button><span>{item.cantidad}</span><button onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)} className="w-6 h-6 bg-gray-200 rounded">+</button><button onClick={() => quitarDelCarrito(item.producto.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div></div>))}</div>
              <textarea value={comentarioSolicitud} onChange={e => setComentarioSolicitud(e.target.value)} className="w-full p-2 text-sm border rounded mb-3" placeholder="Comentarios..." rows={2} />
              <button onClick={crearSolicitud} disabled={procesando || carrito.length === 0 || !usuarioActual} className="w-full bg-green-600 text-white py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">{procesando ? "Creando..." : "Crear Solicitud"}</button>
            </div>
          )}
        </>
      )}

      {activeTab === 'solicitudes' && (
        <>
          <div className="mb-6 flex gap-4"><Filter className="w-5 h-5 text-gray-400" /><select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border rounded-lg px-3 py-2"><option value="todos">Todos</option><option value="pendiente">Pendientes</option><option value="aprobada">Aprobadas</option><option value="rechazada">Rechazadas</option><option value="parcial">Parcial</option><option value="procesada">Procesadas</option></select><div className="text-sm text-gray-600">Mostrando {solicitudesFiltradas.length} de {solicitudes.length}</div></div>
          <div className="bg-white rounded-lg border overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr><th>Número</th><th>Fecha</th><th>Solicitante</th><th>Productos</th><th>Proveedores</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{solicitudesFiltradas.map(s => (<tr key={s.id}><td className="px-6 py-4 font-medium">{s.numero}{s.totalPruebasSolicitadas ? <div className="text-xs text-blue-600">{s.totalPruebasSolicitadas} pruebas</div> : null}</td><td className="px-6 py-4">{convertirFecha(s.fecha).toLocaleDateString()}</td><td className="px-6 py-4">{s.solicitante}<div className="text-xs text-gray-500">{s.departamento}</div></td><td className="px-6 py-4">{s.productos.length} productos<br/><span className="text-xs">{s.totalUnidadesSolicitadas} uds</span></td><td className="px-6 py-4">{obtenerProveedoresSolicitud(s).slice(0,2).map(p => <span key={p} className="inline-block bg-blue-100 text-xs px-2 py-1 rounded mr-1">{p}</span>)}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${s.estado === 'pendiente' ? 'bg-yellow-100' : s.estado === 'aprobada' ? 'bg-green-100' : 'bg-red-100'}`}>{s.estado}</span></td><td className="px-6 py-4"><button onClick={() => verDetallesSolicitud(s)} className="px-3 py-1 bg-gray-100 rounded text-sm">Detalles</button> <MenuOpcionesSolicitud solicitudId={s.id} solicitudNumero={s.numero} /></td></tr>))}</tbody></table></div></div>
        </>
      )}

      {activeTab === 'ordenes' && (
        <div className="bg-white rounded-lg border overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr><th>Número OC</th><th>Fecha</th><th>Proveedor</th><th>Productos</th><th>Pruebas</th><th>Solicitud</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{ordenesFiltradas.map(o => (<tr key={o.id}><td className="px-6 py-4 font-medium">{o.numero}</td><td className="px-6 py-4">{convertirFecha(o.fecha).toLocaleDateString()}</td><td className="px-6 py-4">{o.proveedor}</td><td className="px-6 py-4">{o.productos.length} prod<br/>${o.total.toLocaleString()}</td><td className="px-6 py-4">{o.totalPruebas || 'N/A'}</td><td className="px-6 py-4">{o.solicitudNumero}</td><td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-blue-100">{o.estado}</span></td><td className="px-6 py-4"><button onClick={() => { setOrdenSeleccionada(o); setMostrarDetalleOrden(true); }} className="px-2 py-1 bg-gray-100 rounded">Ver</button> {o.estado === 'generada' && <button onClick={() => iniciarRecepcion(o)} className="ml-2 px-2 py-1 bg-green-100 rounded">Recibir</button>} <button onClick={() => generarPDFOrdenCompra(o)} className="ml-2 px-2 py-1 bg-blue-100 rounded">PDF</button> <MenuOpcionesOrden ordenId={o.id} ordenNumero={o.numero} solicitudNumero={o.solicitudNumero} /></td></tr>))}</tbody></table></div></div>
      )}

      {activeTab === 'recepcion' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6"><div className="bg-white p-4 rounded shadow"><div className="text-sm text-gray-600">Por recibir</div><div className="text-2xl font-bold text-blue-600">{ordenesParaRecepcion.length}</div></div><div className="bg-white p-4 rounded shadow"><div className="text-sm text-gray-600">Productos pendientes</div><div className="text-2xl font-bold text-yellow-600">{ordenesParaRecepcion.reduce((s,o)=>s+o.productos.length,0)}</div></div><div className="bg-white p-4 rounded shadow"><div className="text-sm text-gray-600">Pruebas pendientes</div><div className="text-2xl font-bold text-purple-600">{ordenesParaRecepcion.reduce((s,o)=>s+(o.totalPruebas||0),0)}</div></div><div className="bg-white p-4 rounded shadow"><div className="text-sm text-gray-600">Valor pendiente</div><div className="text-2xl font-bold text-green-600">${ordenesParaRecepcion.reduce((s,o)=>s+o.total,0).toLocaleString()}</div></div></div>
          <div className="bg-white rounded-lg border"><div className="p-4 border-b"><h2 className="text-lg font-semibold">Órdenes para Recepción</h2></div>{ordenesParaRecepcion.length === 0 ? <div className="text-center py-10">No hay órdenes pendientes</div> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr><th>Número</th><th>Proveedor</th><th>Productos</th><th>Pruebas</th><th>Total</th><th>Acciones</th></tr></thead><tbody>{ordenesParaRecepcion.map(o => (<tr key={o.id}><td className="px-6 py-4">{o.numero}</td><td className="px-6 py-4">{o.proveedor}</td><td className="px-6 py-4">{o.productos.length} productos</td><td className="px-6 py-4">{o.totalPruebas || 'N/A'}</td><td className="px-6 py-4">${o.total.toLocaleString()}</td><td className="px-6 py-4"><button onClick={() => iniciarRecepcion(o)} className="px-3 py-1 bg-green-100 rounded">Recibir</button></td></tr>))}</tbody></table></div>}</div>
        </>
      )}

      {activeTab === 'recibidas' && (
        <div className="bg-white rounded-lg border"><div className="p-4 border-b"><h2 className="text-lg font-semibold">Órdenes Completadas</h2></div>{ordenesRecibidas.length === 0 ? <div className="text-center py-10">No hay órdenes recibidas</div> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr><th>Número</th><th>Proveedor</th><th>Total</th><th>Pruebas</th><th>Fecha Recepción</th><th>Factura</th><th>Evaluación</th><th>Acciones</th></tr></thead><tbody>{ordenesRecibidas.map(o => (<tr key={o.id}><td className="px-6 py-4">{o.numero}</td><td className="px-6 py-4">{o.proveedor}</td><td className="px-6 py-4">${o.total.toLocaleString()}</td><td className="px-6 py-4">{o.totalPruebas || 'N/A'}</td><td className="px-6 py-4">{o.fechaRecepcion ? convertirFecha(o.fechaRecepcion).toLocaleDateString() : 'N/A'}</td><td className="px-6 py-4">{o.numeroFactura || 'N/A'}</td><td className="px-6 py-4">{o.evaluacionPorcentaje ? `${o.evaluacionPorcentaje.toFixed(1)}%` : 'N/A'}</td><td className="px-6 py-4"><button onClick={() => { setOrdenSeleccionada(o); setMostrarDetalleOrden(true); }} className="px-2 py-1 bg-gray-100 rounded">Ver</button> <button onClick={() => generarPDFOrdenCompra(o)} className="ml-2 px-2 py-1 bg-blue-100 rounded">PDF</button></td></tr>))}</tbody></table></div>}</div>
      )}

      {/* Modales */}
      {mostrarDetalleSolicitud && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"><div className="p-6 border-b"><div className="flex justify-between"><h2 className="text-xl font-bold">Detalle Solicitud: {solicitudSeleccionada.numero}</h2><button onClick={() => setMostrarDetalleSolicitud(false)}>✕</button></div></div><div className="p-6">{solicitudSeleccionada.productos.map((p, idx) => (<div key={idx} className="border rounded p-4 mb-3"><div className="font-medium">{p.nombre}</div><div>Cantidad solicitada: {p.cantidadSolicitada} {p.unidad_medida}</div><div>Proveedor: {p.proveedor}</div><div>Estado: {p.estado}</div>{p.estado === 'pendiente' && (<div className="mt-3 flex gap-2"><button onClick={() => procesarProductoSolicitud(solicitudSeleccionada.id, p.productoId, true, p.cantidadSolicitada)} className="px-3 py-1 bg-green-100 rounded">Aprobar</button><button onClick={() => { const cant = prompt('Cantidad a aprobar', p.cantidadSolicitada.toString()); if(cant) procesarProductoSolicitud(solicitudSeleccionada.id, p.productoId, true, parseInt(cant)); }} className="px-3 py-1 bg-blue-100 rounded">Aprobar parcial</button><button onClick={() => { const motivo = prompt('Motivo de rechazo'); if(motivo !== null) procesarProductoSolicitud(solicitudSeleccionada.id, p.productoId, false, 0, motivo); }} className="px-3 py-1 bg-red-100 rounded">Rechazar</button></div>)}</div>))}</div><div className="p-6 border-t bg-gray-50 flex justify-end"><button onClick={() => { if(solicitudSeleccionada.estado === 'aprobada') generarOrdenesPorProveedor(solicitudSeleccionada.id); setMostrarDetalleSolicitud(false); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Generar Órdenes</button></div></div></div>
      )}

      <DetalleOrdenModal />

      {mostrarFormularioRecepcion && ordenSeleccionada && usuarioActual && (
        <FormularioRecepcion
          ordenSeleccionada={ordenSeleccionada}
          recepcionProductos={recepcionProductos}
          fechaRecepcion={fechaRecepcion}
          numeroFactura={numeroFactura}
          observacionesGenerales={observacionesGenerales}
          evaluacion={evaluacion}
          onRecepcionChange={(updates) => { if (updates.recepcionProductos) setRecepcionProductos(updates.recepcionProductos); if (updates.fechaRecepcion) setFechaRecepcion(updates.fechaRecepcion); if (updates.numeroFactura) setNumeroFactura(updates.numeroFactura); if (updates.observacionesGenerales) setObservacionesGenerales(updates.observacionesGenerales); if (updates.evaluacion) setEvaluacion(updates.evaluacion); }}
          onClose={() => { if (intervaloRefrescoRef.current) clearInterval(intervaloRefrescoRef.current); setMostrarFormularioRecepcion(false); setOrdenSeleccionada(null); }}
          onRegistrar={registrarRecepcion}
          procesando={procesando}
          usuarioActual={usuarioActual}
          refrescarDatosModalRecepcion={refrescarDatosModalRecepcion}
        />
      )}
    </div>
  );
};

export default TiberGestionSuministros;