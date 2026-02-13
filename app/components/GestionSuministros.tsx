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
  pruebas_por_caja?: number; // Nuevo campo
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
  pruebas_por_caja?: number; // Nuevo campo
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
  totalPruebasSolicitadas?: number; // Nuevo campo
}

interface ProductoOrden {
  id: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad_medida: string;
  pruebas_por_caja?: number; // Nuevo campo
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
  totalPruebas?: number; // Nuevo campo
  // Campos de evaluación guardados en la orden al completar recepción
  evaluacionPorcentaje?: number;
  evaluacionEvaluadoPor?: string;
  evaluacionAprobada?: boolean;
}

interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  pruebas_por_caja_default?: number; // Nuevo campo
}

interface RecepcionProducto {
  productoId: string;
  productoNombre: string;
  codigoProducto: string;
  cantidadOrdenada: number; // cantidad total ordenada para este producto (se mantiene igual en todas las filas del mismo producto)
  cantidadRecibida: number; // cantidad recibida en esta fila (lote)
  diferencia: number; // ya no se usa, pero se mantiene por compatibilidad
  numeroLote: string;
  fechaVencimiento: string;
  observaciones: string;
  fabricante: string;
  unidadMedida: string;
  precioUnitario: number;
  stockActual: number; // stock actual antes de la recepción (igual para todas las filas)
  nuevoStock: number; // se recalculará al final sumando todas las filas
  pruebasPorCaja?: number; // pruebas por caja para este producto
  totalPruebasRecibidas?: number; // Total de pruebas recibidas en esta fila (cantidadRecibida * pruebasPorCaja)
  proveedor?: string;
  pruebasPorCajaDefault?: number; // Para referencia
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

  // Calcular total de pruebas recibidas en esta fila
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
        {/* Indicador de que hay múltiples lotes */}
        {totalFilasProducto > 1 && (
          <div className="text-xs text-blue-600 mt-1">
            Lote {index + 1} de {totalFilasProducto}
          </div>
        )}
      </td>
      
      {/* Pruebas por Caja */}
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

      {/* Cantidad Ordenada (solo se muestra para la primera fila del producto, pero todas tienen el mismo valor) */}
      <td className="px-4 py-3">
        <span className="font-medium">{producto.cantidadOrdenada}</span>
        <div className="text-xs text-gray-500">
          {producto.pruebasPorCaja && producto.pruebasPorCaja > 0 
            ? `${producto.cantidadOrdenada * producto.pruebasPorCaja} pruebas (total)`
            : 'unidades'}
        </div>
      </td>

      {/* Cantidad Recibida en esta fila */}
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

      {/* Diferencia (ya no es relevante por fila, pero lo mantenemos para compatibilidad) */}
      <td className="px-4 py-3">
        <span className="text-xs text-gray-400">—</span>
      </td>

      {/* Número de Lote */}
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

      {/* Fecha Vencimiento */}
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

      {/* Observaciones */}
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

      {/* Acciones para lotes */}
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

// Catálogo de productos (debe ser importado o definido en otro lugar)
const catalogoProductos = {
  // Ejemplo de estructura
  hematologia: [
    { nombre: 'Reactivo A', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
    { nombre: 'Reactivo B', fabricante: 'DESEGO', proveedor: 'DESEGO', pruebas: 24 },
  ],
  // Agrega más disciplinas según sea necesario
};

// Componente de formulario de recepción optimizado
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
  // Estados locales para el formulario
  const [recepcionProductos, setRecepcionProductos] = useState<RecepcionProducto[]>(initialRecepcionProductos);
  const [fechaRecepcion, setFechaRecepcion] = useState(initialFechaRecepcion);
  const [numeroFactura, setNumeroFactura] = useState(initialNumeroFactura);
  const [observacionesGenerales, setObservacionesGenerales] = useState(initialObservacionesGenerales);
  const [evaluacion, setEvaluacion] = useState<EvaluacionProveedor>(initialEvaluacion);
  const [localProcesando, setLocalProcesando] = useState(false);

  // Sincronizar con props cuando cambian
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

  // Actualizar estado padre con debounce
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

  // Calcular resumen agrupado por producto
  const resumen = useMemo(() => {
    const totalFilas = recepcionProductos.length;
    const productosAgrupados = new Map<string, { cantidadRecibida: number; pruebasPorCaja: number }>();
    recepcionProductos.forEach(p => {
      const key = p.productoId;
      const existente = productosAgrupados.get(key) || { cantidadRecibida: 0, pruebasPorCaja: p.pruebasPorCaja || 0 };
      existente.cantidadRecibida += p.cantidadRecibida;
      // Usamos el pruebasPorCaja de la primera fila que encontramos (asumimos igual)
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
    
    // Verificar si algún producto excede la cantidad ordenada
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

  // Función para agregar un nuevo lote (duplicar fila)
  const agregarLote = useCallback((index: number) => {
    setRecepcionProductos(prev => {
      const nuevos = [...prev];
      const original = nuevos[index];
      // Crear una copia con cantidad 0 y sin lote/vencimiento
      const nuevoLote: RecepcionProducto = {
        ...original,
        cantidadRecibida: 0,
        numeroLote: '',
        fechaVencimiento: '',
        observaciones: '',
        // Recalcular diferencia (no se usa)
        diferencia: 0,
        // El nuevo stock se recalculará después
        nuevoStock: original.stockActual, // temporal, se recalculará al actualizar cantidades
        totalPruebasRecibidas: 0
      };
      // Insertar después del original
      nuevos.splice(index + 1, 0, nuevoLote);
      return nuevos;
    });
  }, []);

  // Función para eliminar un lote
  const eliminarLote = useCallback((index: number) => {
    setRecepcionProductos(prev => {
      if (prev.length <= 1) return prev; // No eliminar si es la única fila
      const nuevos = [...prev];
      nuevos.splice(index, 1);
      return nuevos;
    });
  }, []);

  // Función para actualizar un campo de una fila
  const actualizarRecepcionProducto = useCallback((index: number, campo: string, valor: any) => {
    setRecepcionProductos(prev => {
      const nuevosProductos = [...prev];
      if (index < nuevosProductos.length) {
        const productoActualizado = { ...nuevosProductos[index] };
        productoActualizado[campo as keyof RecepcionProducto] = valor;
        
        // Si se actualiza cantidadRecibida o pruebasPorCaja, recalcular totalPruebasRecibidas de la fila y nuevoStock (provisional)
        if (campo === 'cantidadRecibida' || campo === 'pruebasPorCaja') {
          const pruebas = productoActualizado.pruebasPorCaja || 1;
          const totalPruebasFila = productoActualizado.cantidadRecibida * pruebas;
          productoActualizado.totalPruebasRecibidas = totalPruebasFila;
          // El nuevoStock se recalculará globalmente al final, aquí lo dejamos como referencia
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
    // Reiniciar a una fila por producto con cantidad ordenada
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

  // Función para calcular puntuación actual
  const calcularPuntuacionActual = useCallback(() => {
    let puntuacion = 0;
    
    switch(evaluacion.productosTotales) {
      case '100%': puntuacion += 2; break;
      case '≥80%': puntuacion += 1; break;
      case '≤50%': puntuacion += 0; break;
      case '': puntuacion += 0; break;
    }
    
    switch(evaluacion.presentacion) {
      case 'Conforme': puntuacion += 2; break;
      case 'No Conforme': puntuacion += 0; break;
      case '': puntuacion += 0; break;
    }
    
    switch(evaluacion.caducidad) {
      case '≥1 año': puntuacion += 2; break;
      case '≥6 meses': puntuacion += 1; break;
      case '≥1 mes': puntuacion += 0; break;
      case 'Por Caducar': puntuacion += 0; break;
      case '': puntuacion += 0; break;
    }
    
    switch(evaluacion.integridadProducto) {
      case 'Conforme': puntuacion += 2; break;
      case 'No Conforme': puntuacion += 0; break;
      case '': puntuacion += 0; break;
    }
    
    switch(evaluacion.tiempoEntrega) {
      case 'Mismo día': puntuacion += 2; break;
      case '2 días': puntuacion += 1; break;
      case '3 días': puntuacion += 0; break;
      case '': puntuacion += 0; break;
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

  // Función para obtener el valor de pruebas por caja del catálogo
  const obtenerPruebasPorCaja = (nombre: string, fabricante: string, proveedor: string) => {
    // Buscar en todas las disciplinas
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

  // Determinar si una fila puede eliminarse (si hay más de una fila para el mismo producto)
  const puedeEliminarFila = (index: number): boolean => {
    const productoId = recepcionProductos[index]?.productoId;
    if (!productoId) return false;
    const count = recepcionProductos.filter(p => p.productoId === productoId).length;
    return count > 1;
  };

  // Obtener total de filas para un producto (para mostrar numeración)
  const totalFilasPorProducto = (productoId: string): number => {
    return recepcionProductos.filter(p => p.productoId === productoId).length;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-green-50">
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
                <span>Los datos se actualizan automáticamente cada 90 segundos</span>
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
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información de factura */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
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

          {/* EVALUACIÓN DE INSUMOS */}
          <div className="mb-8 p-4 border border-blue-200 rounded-lg bg-blue-50">
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
              {/* Productos Totales */}
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

              {/* Presentación */}
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

              {/* Caducidad */}
              <div className="border border-blue-200 rounded-lg p-3 bg-white">
                <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  Caducidad
                </label>
                <div className="space-y-1">
                  {['≥1 año', '<6 meses', '<1 mes', 'Por Caducar'].map((opcion) => (
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

              {/* Integridad del Producto */}
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

              {/* Tiempo de Entrega */}
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

            {/* Observaciones de evaluación */}
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

            {/* Indicador de aprobación */}
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

          {/* Tabla de productos */}
          <div className="mb-8">
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

          {/* Observaciones generales */}
          <div className="mb-8">
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

          {/* Resumen de recepción */}
          <div className="mb-6">
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
        
        <div className="p-6 border-t bg-gray-50">
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

const ReporteStockActual = () => {
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
    evaluadoPor: 'Ana López',
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

  // Usuario actual
  const usuarioActual = {
    id: 'user_001',
    nombre: 'Ana López',
    departamento: 'Laboratorio Clínico',
    rol: 'aprobador'
  };

  // Refs para tracking de updates
  const updatesRef = useRef<Map<number, Map<string, any>>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervaloRefrescoRef = useRef<NodeJS.Timeout | null>(null);

  // Función para obtener el valor de pruebas por caja del catálogo
  const obtenerPruebasPorCaja = (nombre: string, fabricante: string, proveedor: string) => {
    // Buscar en todas las disciplinas
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

  // Función optimizada para actualizar productos en batch
  const actualizarRecepcionProductoOptimizada = useCallback((index: number, campo: string, valor: any) => {
    if (!updatesRef.current.has(index)) {
      updatesRef.current.set(index, new Map());
    }
    updatesRef.current.get(index)!.set(campo, valor);
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      const updates = updatesRef.current;
      if (updates.size === 0) return;
      
      setRecepcionProductos(prev => {
        const nuevosProductos = [...prev];
        updates.forEach((campos, idx) => {
          if (idx < nuevosProductos.length) {
            const productoActualizado = { ...nuevosProductos[idx] };
            campos.forEach((valor, campo) => {
              productoActualizado[campo as keyof RecepcionProducto] = valor;
              
              if (campo === 'cantidadRecibida') {
                productoActualizado.diferencia = valor - productoActualizado.cantidadOrdenada;
                // Calcular nuevo stock basado en pruebas por caja
                const unidadesAAgregar = productoActualizado.pruebasPorCaja && productoActualizado.pruebasPorCaja > 0 
                  ? valor * productoActualizado.pruebasPorCaja 
                  : valor;
                productoActualizado.nuevoStock = productoActualizado.stockActual + unidadesAAgregar;
                productoActualizado.totalPruebasRecibidas = productoActualizado.pruebasPorCaja && productoActualizado.pruebasPorCaja > 0 
                  ? valor * productoActualizado.pruebasPorCaja 
                  : valor;
              }
              
              if (campo === 'pruebasPorCaja') {
                // Recalcular cuando cambian las pruebas por caja
                const unidadesAAgregar = valor && valor > 0 
                  ? productoActualizado.cantidadRecibida * valor 
                  : productoActualizado.cantidadRecibida;
                productoActualizado.nuevoStock = productoActualizado.stockActual + unidadesAAgregar;
                productoActualizado.totalPruebasRecibidas = valor && valor > 0 
                  ? productoActualizado.cantidadRecibida * valor 
                  : productoActualizado.cantidadRecibida;
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

  // Función para aplicar pruebas por caja
  const aplicarPruebasPorCaja = useCallback((index: number) => {
    setRecepcionProductos(prev => {
      const nuevosProductos = [...prev];
      if (index < nuevosProductos.length && 
          nuevosProductos[index].pruebasPorCajaDefault !== undefined && 
          nuevosProductos[index].pruebasPorCajaDefault! > 0) {
        
        const producto = nuevosProductos[index];
        producto.pruebasPorCaja = producto.pruebasPorCajaDefault;
        // Recalcular nuevo stock y total de pruebas
        const unidadesAAgregar = producto.cantidadRecibida * producto.pruebasPorCajaDefault!;
        producto.nuevoStock = producto.stockActual + unidadesAAgregar;
        producto.totalPruebasRecibidas = unidadesAAgregar;
      }
      return nuevosProductos;
    });
  }, []);

  // Función optimizada para ajustar cantidad
  const ajustarCantidadRecibidaOptimizada = useCallback((index: number, incremento: number) => {
    setRecepcionProductos(prev => {
      const nuevosProductos = [...prev];
      if (index < nuevosProductos.length) {
        const producto = nuevosProductos[index];
        const nuevaCantidad = producto.cantidadRecibida + incremento;
        
        if (nuevaCantidad >= 0) {
          producto.cantidadRecibida = nuevaCantidad;
          producto.diferencia = nuevaCantidad - producto.cantidadOrdenada;
          
          // Calcular unidades a agregar basado en pruebas por caja
          const unidadesAAgregar = producto.pruebasPorCaja && producto.pruebasPorCaja > 0 
            ? nuevaCantidad * producto.pruebasPorCaja 
            : nuevaCantidad;
          producto.nuevoStock = producto.stockActual + unidadesAAgregar;
          producto.totalPruebasRecibidas = producto.pruebasPorCaja && producto.pruebasPorCaja > 0 
            ? nuevaCantidad * producto.pruebasPorCaja 
            : nuevaCantidad;
        }
      }
      return nuevosProductos;
    });
  }, []);

  // Cleanup timeout en unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (intervaloRefrescoRef.current) {
        clearInterval(intervaloRefrescoRef.current);
      }
    };
  }, []);

  // Función para convertir fechas
  const convertirFecha = (fecha: any): Date => {
    if (!fecha) return new Date();
    
    if (fecha instanceof Date) return fecha;
    if (fecha.toDate && typeof fecha.toDate === 'function') return fecha.toDate();
    if (fecha.seconds && fecha.nanoseconds) return new Date(fecha.seconds * 1000 + fecha.nanoseconds / 1000000);
    if (typeof fecha === 'string') return new Date(fecha);
    
    return new Date();
  };

  // Cargar todos los datos
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Cargar productos
        const productosRef = collection(db, 'productos');
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
        
        // Cargar proveedores
        const proveedoresRef = collection(db, 'proveedores');
        const qProveedores = query(proveedoresRef, orderBy('nombre'));
        const proveedoresSnapshot = await getDocs(qProveedores);
        
        const proveedoresData = proveedoresSnapshot.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre || 'Sin nombre',
          contacto: doc.data().contacto || '',
          telefono: doc.data().telefono || '',
          email: doc.data().email || '',
          direccion: doc.data().direccion || '',
          pruebas_por_caja_default: Number(doc.data().pruebas_por_caja_default) || 0
        } as Proveedor));
        setProveedores(proveedoresData);
        
        // Cargar solicitudes
        const solicitudesRef = collection(db, 'solicitudes');
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
              estado: (p.estado as 'pendiente' | 'aprobado' | 'rechazado') || 'pendiente',
              comentario: p.comentario || '',
              pruebas_por_caja: Number(p.pruebas_por_caja) || 0
            })) as ProductoSolicitud[],
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
        
        // Cargar órdenes de compra
        const ordenesRef = collection(db, 'ordenes_compra');
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
            // Estos campos se llenarán al completar recepción
            evaluacionPorcentaje: data.evaluacionPorcentaje,
            evaluacionEvaluadoPor: data.evaluacionEvaluadoPor,
            evaluacionAprobada: data.evaluacionAprobada
          } as OrdenCompra;
        });
        setOrdenesCompra(ordenesData);
        
      } catch (error: any) {
        console.error("Error cargando datos:", error);
        mostrarMensaje('error', 'Error al cargar los datos', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [sortField, sortDirection]);

  // Configurar refresco automático cada 90 segundos cuando el modal de recepción esté abierto
  useEffect(() => {
    if (mostrarFormularioRecepcion) {
      // Limpiar intervalo anterior si existe
      if (intervaloRefrescoRef.current) {
        clearInterval(intervaloRefrescoRef.current);
      }
      
      // Crear nuevo intervalo de 90 segundos
      intervaloRefrescoRef.current = setInterval(() => {
        refrescarDatosModalRecepcion();
      }, 90000); // 90 segundos = 90,000 milisegundos
      
      return () => {
        if (intervaloRefrescoRef.current) {
          clearInterval(intervaloRefrescoRef.current);
        }
      };
    }
  }, [mostrarFormularioRecepcion]);

  // Función para refrescar datos en el modal de recepción
  const refrescarDatosModalRecepcion = async () => {
    if (!ordenSeleccionada || recepcionProductos.length === 0) return;
    
    try {
      // Mostrar mensaje de actualización
      setMensaje({ tipo: 'info', texto: 'Actualizando datos de recepción...' });
      
      // Actualizar stock actual de cada producto
      const productosActualizados = await Promise.all(
        recepcionProductos.map(async (producto) => {
          try {
            const productoRef = doc(db, 'productos', producto.productoId);
            const productoDoc = await getDoc(productoRef);
            
            if (productoDoc.exists()) {
              const productoData = productoDoc.data();
              const stockActual = productoData.stock_actual || 0;
              
              // Conservar las modificaciones del usuario pero actualizar el stock
              return {
                ...producto,
                stockActual: stockActual,
                nuevoStock: stockActual + (producto.cantidadRecibida * (producto.pruebasPorCaja || 1))
              };
            }
          } catch (error) {
            console.warn('Error actualizando producto:', error);
          }
          return producto;
        })
      );
      
      setRecepcionProductos(productosActualizados);
      
      // Actualizar información de la orden
      const ordenRef = doc(db, 'ordenes_compra', ordenSeleccionada.id);
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
      console.error('Error refrescando datos del modal:', error);
      setMensaje({ tipo: 'error', texto: 'Error al actualizar datos', detalle: error.message });
    }
  };

  // Funciones para el carrito
  const agregarAlCarrito = (producto: Producto) => {
    const itemExistente = carrito.find(item => item.producto.id === producto.id);
    
    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.producto.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
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
      item.producto.id === productoId
        ? { ...item, cantidad: nuevaCantidad }
        : item
    ));
  };

  // Función para crear solicitud
  const crearSolicitud = async () => {
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
          nombre: item.producto.nombre || 'Sin nombre',
          cantidadSolicitada: item.cantidad,
          stockDisponible: item.producto.stock_actual || 0,
          unidad_medida: item.producto.unidad_medida || 'unidades',
          precio_unitario: item.producto.precio_unitario || 0,
          proveedor: item.producto.proveedor || 'Sin proveedor',
          proveedor_id: item.producto.proveedor_id || '',
          fabricante: item.producto.fabricante || '',
          estado: 'pendiente',
          comentario: '',
          pruebas_por_caja: pruebasPorCaja
        };
      });

      let ultimoNumero = 'SOL-00000';
      try {
        const solicitudesRef = collection(db, 'solicitudes');
        const q = query(solicitudesRef, orderBy('numero', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const ultimaSolicitud = snapshot.docs[0].data();
          ultimoNumero = ultimaSolicitud.numero || 'SOL-00000';
        }
      } catch (error) {
        console.warn('No se pudo obtener el último número');
      }

      const match = ultimoNumero.match(/SOL-(\d+)/);
      const numeroActual = match ? parseInt(match[1]) : 0;
      const nuevoNumero = `SOL-${(numeroActual + 1).toString().padStart(5, '0')}`;

      const totalPruebasSolicitadas = productosSolicitud.reduce((sum, p) => {
        if (p.pruebas_por_caja && p.pruebas_por_caja > 0) {
          return sum + (p.cantidadSolicitada * p.pruebas_por_caja);
        }
        return sum;
      }, 0);

      const nuevaSolicitud = {
        numero: nuevoNumero,
        fecha: Timestamp.now(),
        productos: productosSolicitud,
        estado: 'pendiente',
        solicitante: usuarioActual.nombre,
        departamento: usuarioActual.departamento || '',
        comentarios: comentarioSolicitud || '',
        totalProductos: carrito.length,
        totalUnidadesSolicitadas: carrito.reduce((total, item) => total + item.cantidad, 0),
        totalUnidadesAprobadas: 0,
        totalPruebasSolicitadas: totalPruebasSolicitadas,
        aprobador: '',
        fechaAprobacion: null,
        ordenesCompra: [],
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now()
      };

      const solicitudValidada = JSON.parse(JSON.stringify(nuevaSolicitud));

      const solicitudesRef = collection(db, 'solicitudes');
      const docRef = await addDoc(solicitudesRef, solicitudValidada);

      await addDoc(collection(db, 'historial'), {
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
        departamento: usuarioActual.departamento || '',
        comentarios: comentarioSolicitud || '',
        totalProductos: carrito.length,
        totalUnidadesSolicitadas: nuevaSolicitud.totalUnidadesSolicitadas,
        totalUnidadesAprobadas: 0,
        totalPruebasSolicitadas: totalPruebasSolicitadas
      };

      setSolicitudes(prev => [solicitudLocal, ...prev].sort((a, b) => b.numero.localeCompare(a.numero)));
      setCarrito([]);
      setComentarioSolicitud('');
      
      mostrarMensaje('exito', `Solicitud ${nuevoNumero} creada exitosamente`);
      
      setTimeout(() => {
        setActiveTab('solicitudes');
      }, 1000);

    } catch (error: any) {
      console.error('Error al crear solicitud:', error);
      mostrarMensaje('error', 'Error al crear la solicitud', error.message);
    } finally {
      setProcesando(false);
    }
  };

  // Función para eliminar una solicitud
  const eliminarSolicitud = async (solicitudId: string, solicitudNumero: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la solicitud ${solicitudNumero}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setProcesando(true);
      
      const solicitud = solicitudes.find(s => s.id === solicitudId);
      if (solicitud?.ordenesCompra && solicitud.ordenesCompra.length > 0) {
        if (!window.confirm(`Esta solicitud tiene ${solicitud.ordenesCompra.length} orden(es) de compra asociada(s). ¿Deseas eliminar también las órdenes de compra?`)) {
          setProcesando(false);
          return;
        }
        
        for (const ordenId of solicitud.ordenesCompra) {
          await deleteDoc(doc(db, 'ordenes_compra', ordenId));
          await addDoc(collection(db, 'historial'), {
            tipo: 'orden_eliminada',
            ordenCompraId: ordenId,
            fecha: Timestamp.now(),
            usuario: usuarioActual.nombre,
            detalles: `Orden de compra eliminada por eliminación de solicitud ${solicitudNumero}`,
            relacionSolicitud: solicitudNumero
          });
        }
      }

      await deleteDoc(doc(db, 'solicitudes', solicitudId));

      await addDoc(collection(db, 'historial'), {
        tipo: 'solicitud_eliminada',
        solicitudId: solicitudId,
        solicitudNumero: solicitudNumero,
        fecha: Timestamp.now(),
        usuario: usuarioActual.nombre,
        detalles: `Solicitud ${solicitudNumero} eliminada`,
        productos: solicitud?.productos?.map(p => ({
          nombre: p.nombre,
          cantidad: p.cantidadSolicitada,
          proveedor: p.proveedor,
          pruebas_por_caja: p.pruebas_por_caja || 0
        })) || []
      });

      setSolicitudes(prev => prev.filter(s => s.id !== solicitudId));
      
      if (solicitud?.ordenesCompra && solicitud.ordenesCompra.length > 0) {
        setOrdenesCompra(prev => prev.filter(o => !solicitud.ordenesCompra?.includes(o.id)));
      }

      mostrarMensaje('exito', `Solicitud ${solicitudNumero} eliminada exitosamente`);
      setMenuAbiertoId(null);

    } catch (error: any) {
      console.error('Error al eliminar solicitud:', error);
      mostrarMensaje('error', 'Error al eliminar la solicitud', error.message);
    } finally {
      setProcesando(false);
    }
  };

  // Función para eliminar una orden de compra
  const eliminarOrdenCompra = async (ordenId: string, ordenNumero: string, solicitudNumero: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la orden de compra ${ordenNumero}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setProcesando(true);
      
      await deleteDoc(doc(db, 'ordenes_compra', ordenId));

      await addDoc(collection(db, 'historial'), {
        tipo: 'orden_eliminada',
        ordenCompraId: ordenId,
        ordenCompraNumero: ordenNumero,
        fecha: Timestamp.now(),
        usuario: usuarioActual.nombre,
        detalles: `Orden de compra ${ordenNumero} eliminada`,
        relacionSolicitud: solicitudNumero
      });

      setOrdenesCompra(prev => prev.filter(o => o.id !== ordenId));

      const solicitud = solicitudes.find(s => s.ordenesCompra?.includes(ordenId));
      if (solicitud) {
        const solicitudRef = doc(db, 'solicitudes', solicitud.id);
        const nuevasOrdenes = solicitud.ordenesCompra?.filter(id => id !== ordenId) || [];
        const nuevoEstado = nuevasOrdenes.length === 0 ? 'aprobada' : solicitud.estado;
        
        await updateDoc(solicitudRef, {
          ordenesCompra: nuevasOrdenes,
          estado: nuevoEstado,
          actualizadoEn: Timestamp.now()
        });

        setSolicitudes(prev => prev.map(s => {
          if (s.id !== solicitud.id) return s;
          return {
            ...s,
            ordenesCompra: nuevasOrdenes,
            estado: nuevoEstado
          };
        }));
      }

      mostrarMensaje('exito', `Orden de compra ${ordenNumero} eliminada exitosamente`);
      setMenuAbiertoId(null);

    } catch (error: any) {
      console.error('Error al eliminar orden de compra:', error);
      mostrarMensaje('error', 'Error al eliminar la orden de compra', error.message);
    } finally {
      setProcesando(false);
    }
  };

  // Función para aprobar/rechazar producto individual
  const procesarProductoSolicitud = async (
    solicitudId: string, 
    productoId: string, 
    aprobar: boolean, 
    cantidadAprobada?: number, 
    comentario?: string
  ) => {
    try {
      const solicitud = solicitudes.find(s => s.id === solicitudId);
      if (!solicitud) return;

      const productosActualizados = solicitud.productos.map(p => {
        if (p.productoId === productoId) {
          const nuevoEstado: 'aprobado' | 'rechazado' = aprobar ? 'aprobado' : 'rechazado';
          return {
            ...p,
            estado: nuevoEstado,
            cantidadAprobada: aprobar ? (cantidadAprobada || p.cantidadSolicitada) : 0,
            comentario: comentario || ''
          } as ProductoSolicitud;
        }
        return p;
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

      const datosActualizacion: any = {
        productos: productosActualizados,
        estado: nuevoEstado,
        totalUnidadesAprobadas,
        actualizadoEn: Timestamp.now()
      };

      if (nuevoEstado === 'aprobada') {
        datosActualizacion.aprobador = usuarioActual.nombre;
        datosActualizacion.fechaAprobacion = Timestamp.now();
      }

      const datosValidados = JSON.parse(JSON.stringify(datosActualizacion));

      const solicitudRef = doc(db, 'solicitudes', solicitudId);
      await updateDoc(solicitudRef, datosValidados);

      const producto = solicitud.productos.find(p => p.productoId === productoId);
      if (producto) {
        await addDoc(collection(db, 'historial'), {
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

      setSolicitudes(prev => prev.map(s => {
        if (s.id !== solicitudId) return s;
        
        const solicitudActualizada: Solicitud = {
          ...s,
          productos: productosActualizados,
          estado: nuevoEstado,
          totalUnidadesAprobadas: totalUnidadesAprobadas,
          ...(nuevoEstado === 'aprobada' && {
            aprobador: usuarioActual.nombre,
            fechaAprobacion: Timestamp.now()
          })
        };
        
        return solicitudActualizada;
      }).sort((a, b) => b.numero.localeCompare(a.numero)));

      mostrarMensaje('exito', `Producto ${aprobar ? 'aprobado' : 'rechazado'} correctamente`);

    } catch (error: any) {
      console.error('Error al procesar producto:', error);
      mostrarMensaje('error', 'Error al procesar el producto', error.message);
    }
  };

  // Función para generar órdenes de compra agrupadas por proveedor
  const generarOrdenesPorProveedor = async (solicitudId: string) => {
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
        if (!productosPorProveedor[proveedorKey]) {
          productosPorProveedor[proveedorKey] = [];
        }
        productosPorProveedor[proveedorKey].push(producto);
      });

      const ordenesExistentes = ordenesCompra.filter(o => o.solicitudId === solicitudId);
      
      const ordenesGeneradas: OrdenCompra[] = [];
      const ordenIds: string[] = [];
      const proveedoresKeys = Object.keys(productosPorProveedor);
      
      for (let i = 0; i < proveedoresKeys.length; i++) {
        const proveedorKey = proveedoresKeys[i];
        const productos = productosPorProveedor[proveedorKey];
        
        const proveedorInfo = proveedores.find(p => p.id === proveedorKey) || 
                            proveedores.find(p => p.nombre === proveedorKey);
        
        const numeroBase = obtenerNumeroBaseSolicitud(solicitud.numero);
        const sufijoLetra = generarSufijoLetra(ordenesExistentes.length + i);
        const nuevoNumero = `OC-${numeroBase}${sufijoLetra}`;

        const productosOrden = productos.map(producto => {
          const precioUnitario = producto.precio_unitario || 0;
          const cantidad = producto.cantidadAprobada || producto.cantidadSolicitada || 0;
          const subtotal = precioUnitario * cantidad;
          
          return {
            id: `${producto.productoId}-${Date.now()}`,
            productoId: producto.productoId || '',
            nombre: producto.nombre || 'Sin nombre',
            cantidad: cantidad,
            precioUnitario: precioUnitario,
            subtotal: subtotal,
            unidad_medida: producto.unidad_medida || 'unidades',
            pruebas_por_caja: producto.pruebas_por_caja || 0,
            fabricante: producto.fabricante || '',
            proveedor: producto.proveedor || ''
          } as ProductoOrden;
        });

        const subtotal = productosOrden.reduce((sum, prod) => sum + (prod.subtotal || 0), 0);
        const iva = subtotal * 0.19;
        const total = subtotal + iva;

        const totalPruebas = productosOrden.reduce((sum, prod) => {
          if (prod.pruebas_por_caja && prod.pruebas_por_caja > 0) {
            return sum + (prod.cantidad * prod.pruebas_por_caja);
          }
          return sum;
        }, 0);

        const nuevaOrden: Omit<OrdenCompra, 'id'> = {
          numero: nuevoNumero,
          fecha: Timestamp.now(),
          solicitudId: solicitud.id || '',
          solicitudNumero: solicitud.numero || '',
          proveedor: proveedorInfo?.nombre || productos[0]?.proveedor || 'Sin proveedor',
          proveedor_id: proveedorInfo?.id || proveedorKey || '',
          productos: productosOrden,
          subtotal: subtotal || 0,
          iva: iva || 0,
          total: total || 0,
          estado: 'generada',
          observaciones: `Generada desde solicitud ${solicitud.numero} - Proveedor: ${proveedorInfo?.nombre || proveedorKey}`,
          creadaPor: usuarioActual.nombre,
          totalPruebas: totalPruebas
        };

        const ordenValidada = JSON.parse(JSON.stringify(nuevaOrden));

        const ordenesRef = collection(db, 'ordenes_compra');
        const docRef = await addDoc(ordenesRef, ordenValidada);
        ordenIds.push(docRef.id);

        const ordenLocal: OrdenCompra = {
          id: docRef.id,
          ...nuevaOrden
        };
        ordenesGeneradas.push(ordenLocal);

        await addDoc(collection(db, 'historial'), {
          tipo: 'orden_generada',
          ordenCompraId: docRef.id,
          ordenCompraNumero: nuevoNumero,
          solicitudId,
          solicitudNumero: solicitud.numero,
          fecha: Timestamp.now(),
          usuario: usuarioActual.nombre,
          detalles: `Orden ${nuevoNumero} generada para ${productos.length} productos del proveedor ${nuevaOrden.proveedor}`,
          proveedor: nuevaOrden.proveedor,
          total: total,
          totalPruebas: totalPruebas,
          relacionSolicitud: `Orden derivada de solicitud ${solicitud.numero}`
        });
      }

      const solicitudRef = doc(db, 'solicitudes', solicitudId);
      await updateDoc(solicitudRef, {
        ordenesCompra: [...(solicitud.ordenesCompra || []), ...ordenIds],
        estado: 'procesada',
        actualizadoEn: Timestamp.now()
      });

      const nuevasOrdenes = [...ordenesGeneradas, ...ordenesCompra].sort((a, b) => b.numero.localeCompare(a.numero));
      setOrdenesCompra(nuevasOrdenes);
      
      setSolicitudes(prev => prev.map(s => {
        if (s.id !== solicitudId) return s;
        
        return {
          ...s,
          ordenesCompra: [...(s.ordenesCompra || []), ...ordenIds],
          estado: 'procesada'
        } as Solicitud;
      }).sort((a, b) => b.numero.localeCompare(a.numero)));

      mostrarMensaje('exito', `Se generaron ${ordenesGeneradas.length} órdenes de compra`);

    } catch (error: any) {
      console.error('Error al generar órdenes:', error);
      mostrarMensaje('error', 'Error al generar las órdenes de compra', error.message);
    } finally {
      setProcesando(false);
    }
  };

  // Función para generar letras del alfabeto
  const generarSufijoLetra = (indice: number): string => {
    return `-${String.fromCharCode(65 + indice)}`;
  };

  // Función para obtener el número base de la solicitud
  const obtenerNumeroBaseSolicitud = (solicitudNumero: string): string => {
    const numeroBaseMatch = solicitudNumero.match(/SOL-(\d+)/);
    return numeroBaseMatch ? numeroBaseMatch[1] : solicitudNumero.split('-').pop() || '00001';
  };

  // Iniciar recepción de orden
  const iniciarRecepcion = async (orden: OrdenCompra) => {
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
            const productoRef = doc(db, 'productos', producto.productoId);
            const productoDoc = await getDoc(productoRef);
            if (productoDoc.exists()) {
              const productoData = productoDoc.data();
              stockActual = productoData.stock_actual || 0;
              codigoProducto = productoData.codigo || '';
              fabricante = productoData.fabricante || '';
              
              // Si no tiene pruebas_por_caja en la orden, buscarlo en el producto
              if (!pruebasPorCaja) {
                pruebasPorCaja = productoData.pruebas_por_caja || 0;
              }
            }
          } catch (error) {
            console.warn('No se pudo cargar información del producto:', producto.productoId);
          }
          
          // Si aún no hay valor, buscar en el catálogo
          if (!pruebasPorCaja || pruebasPorCaja === 0) {
            pruebasPorCaja = obtenerPruebasPorCaja(
              producto.nombre,
              producto.fabricante || fabricante,
              producto.proveedor || orden.proveedor
            );
          }
          
          // Calcular total de pruebas que se van a recibir (para la primera fila)
          const totalPruebasRecibidas = pruebasPorCaja > 0 ? producto.cantidad * pruebasPorCaja : producto.cantidad;
          
          return {
            productoId: producto.productoId,
            productoNombre: producto.nombre,
            codigoProducto: codigoProducto,
            cantidadOrdenada: producto.cantidad,
            cantidadRecibida: producto.cantidad, // Por defecto, se recibe lo ordenado
            diferencia: 0,
            numeroLote: '',
            fechaVencimiento: '',
            observaciones: '',
            fabricante: fabricante,
            unidadMedida: producto.unidad_medida,
            precioUnitario: producto.precioUnitario,
            stockActual: stockActual,
            nuevoStock: stockActual + totalPruebasRecibidas,
            pruebasPorCaja: pruebasPorCaja,
            totalPruebasRecibidas: totalPruebasRecibidas,
            pruebasPorCajaDefault: pruebasPorCaja, // Para referencia
            proveedor: producto.proveedor || orden.proveedor
          } as RecepcionProducto;
        })
      );
      
      setRecepcionProductos(productosRecepcion);
      setMostrarFormularioRecepcion(true);
      
    } catch (error: any) {
      console.error('Error iniciando recepción:', error);
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

  // Resumen memoizado
  const resumen = useMemo(() => {
    const totalProductos = recepcionProductos.length;
    const productosConRecepcion = recepcionProductos.filter(p => p.cantidadRecibida > 0).length;
    const cantidadTotalRecibida = recepcionProductos.reduce((sum, p) => sum + p.cantidadRecibida, 0);
    const valorTotalRecibido = recepcionProductos.reduce((sum, p) => sum + (p.cantidadRecibida * p.precioUnitario), 0);
    const productosConLote = recepcionProductos.filter(p => p.numeroLote.trim() !== '').length;
    const productosConPruebasPorCaja = recepcionProductos.filter(p => p.pruebasPorCaja !== undefined && p.pruebasPorCaja > 0).length;
    const totalPruebasRecibidas = recepcionProductos.reduce((sum, p) => {
      if (p.pruebasPorCaja !== undefined && p.pruebasPorCaja > 0) {
        return sum + (p.cantidadRecibida * p.pruebasPorCaja);
      }
      return sum + p.cantidadRecibida;
    }, 0);
    
    return {
      totalProductos,
      productosConRecepcion,
      cantidadTotalRecibida,
      valorTotalRecibido,
      productosConLote,
      productosConPruebasPorCaja,
      totalPruebasRecibidas
    };
  }, [recepcionProductos]);

  const validarRecepcion = useCallback(() => {
    if (!numeroFactura.trim()) {
      mostrarMensaje('error', 'El número de factura es obligatorio');
      return false;
    }

    return true;
  }, [numeroFactura]);

  // Registrar recepción - AHORA GUARDA EVALUACIÓN EN LA ORDEN Y PERMITE NO APROBADAS
  const registrarRecepcion = async () => {
    if (!validarRecepcion() || !ordenSeleccionada) return;

    try {
      setProcesando(true);
      
      // Crear un primer batch para la recepción principal
      const recepcionBatch = writeBatch(db);
      const timestamp = Timestamp.now();
      
      // 1. Actualizar estado de la orden de compra y guardar evaluación
      const ordenRef = doc(db, 'ordenes_compra', ordenSeleccionada.id);
      recepcionBatch.update(ordenRef, {
        estado: 'completada',
        fechaRecepcion: timestamp,
        numeroFactura: numeroFactura,
        recepcionCompletadaPor: usuarioActual.nombre,
        totalPruebasRecibidas: resumen.totalPruebasRecibidas,
        evaluacionPorcentaje: evaluacion.porcentajeTotal,
        evaluacionEvaluadoPor: usuarioActual.nombre,
        evaluacionAprobada: evaluacion.porcentajeTotal >= 80,
        actualizadoEn: timestamp
      });
      
      // 2. Registrar documento de recepción
      const recepcionRef = doc(collection(db, 'recepciones'));
      const recepcionData = {
        ordenCompraId: ordenSeleccionada.id,
        ordenCompraNumero: ordenSeleccionada.numero,
        fechaRecepcion: timestamp,
        numeroFactura: numeroFactura,
        productos: recepcionProductos.map(p => ({
          ...p,
          totalPruebasRecibidas: p.pruebasPorCaja !== undefined && p.pruebasPorCaja > 0 
            ? p.cantidadRecibida * p.pruebasPorCaja 
            : p.cantidadRecibida
        })),
        observaciones: observacionesGenerales,
        recibidoPor: usuarioActual.nombre,
        departamento: usuarioActual.departamento,
        fechaRegistro: timestamp,
        estado: 'completada',
        totalPruebas: resumen.totalPruebasRecibidas
      };
      recepcionBatch.set(recepcionRef, recepcionData);
      
      // 3. Registrar evaluación del proveedor
      const evaluacionRef = doc(collection(db, 'evaluaciones_proveedores'));
      const evaluacionData = {
        ...evaluacion,
        fechaEvaluacion: timestamp,
        ordenCompraId: ordenSeleccionada.id,
        ordenCompraNumero: ordenSeleccionada.numero,
        proveedor: ordenSeleccionada.proveedor,
        proveedor_id: ordenSeleccionada.proveedor_id,
        puntuacionTotal: evaluacion.puntuacionTotal,
        porcentajeTotal: evaluacion.porcentajeTotal,
        evaluacionAprobada: evaluacion.porcentajeTotal >= 80
      };
      recepcionBatch.set(evaluacionRef, evaluacionData);
      
      // 4. Actualizar stock de cada producto considerando pruebas por caja
      for (const producto of recepcionProductos) {
        const productoRef = doc(db, 'productos', producto.productoId);
        const productoSnap = await getDoc(productoRef);
        
        if (productoSnap.exists()) {
          const currentStock = productoSnap.data().stock_actual || 0;
          
          const unidadesAAgregar = producto.pruebasPorCaja !== undefined && producto.pruebasPorCaja > 0 
            ? producto.cantidadRecibida * producto.pruebasPorCaja 
            : producto.cantidadRecibida;
          
          const nuevoStock = currentStock + unidadesAAgregar;
          
          const updateData: any = {
            stock_actual: nuevoStock,
            ultimaActualizacion: timestamp,
            ultimaRecepcion: {
              fecha: timestamp,
              cantidad: producto.cantidadRecibida,
              pruebas_por_caja: producto.pruebasPorCaja || 0,
              total_pruebas_recibidas: unidadesAAgregar,
              ordenCompra: ordenSeleccionada.numero
            }
          };
          
          if (producto.pruebasPorCaja !== undefined && producto.pruebasPorCaja > 0) {
            updateData.pruebas_por_caja = producto.pruebasPorCaja;
          }
          
          if (producto.numeroLote.trim() !== '') {
            updateData.lote = producto.numeroLote;
          }
          if (producto.fechaVencimiento.trim() !== '') {
            updateData.fecha_vencimiento = producto.fechaVencimiento;
          }
          
          recepcionBatch.update(productoRef, updateData);
          
          const movimientoRef = doc(collection(db, 'movimientos_inventario'));
          recepcionBatch.set(movimientoRef, {
            productoId: producto.productoId,
            productoNombre: producto.productoNombre,
            tipo: 'recepcion',
            cantidad: producto.cantidadRecibida,
            pruebas_por_caja: producto.pruebasPorCaja || 0,
            total_unidades: unidadesAAgregar,
            stockAnterior: currentStock,
            stockNuevo: nuevoStock,
            referencia: ordenSeleccionada.numero,
            numeroFactura: numeroFactura,
            usuario: usuarioActual.nombre,
            fecha: timestamp,
            observaciones: `Recepción de orden ${ordenSeleccionada.numero}${producto.pruebasPorCaja !== undefined && producto.pruebasPorCaja > 0 ? ` (${producto.cantidadRecibida} cajas x ${producto.pruebasPorCaja} pruebas = ${unidadesAAgregar} pruebas)` : ''}`,
            lote: producto.numeroLote || '',
            fecha_vencimiento: producto.fechaVencimiento || ''
          });
        }
      }
      
      // EJECUTAR EL PRIMER BATCH
      await recepcionBatch.commit();
      
      // 5. Actualizar estadísticas de proveedor con un SEGUNDO BATCH INDEPENDIENTE
      try {
        const proveedorRef = doc(db, 'proveedores', ordenSeleccionada.proveedor_id);
        const proveedorSnap = await getDoc(proveedorRef);
        
        if (proveedorSnap.exists()) {
          const proveedorData = proveedorSnap.data();
          const totalRecepciones = (proveedorData.totalRecepciones || 0) + 1;
          const promedioEvaluacion = proveedorData.promedioEvaluacion 
            ? (proveedorData.promedioEvaluacion * proveedorData.totalRecepciones + evaluacion.porcentajeTotal) / totalRecepciones
            : evaluacion.porcentajeTotal;
          
          const proveedorBatch = writeBatch(db);
          proveedorBatch.update(proveedorRef, {
            totalRecepciones: totalRecepciones,
            promedioEvaluacion: promedioEvaluacion,
            ultimaRecepcion: timestamp,
            ultimaEvaluacion: evaluacion.porcentajeTotal,
            actualizadoEn: timestamp
          });
          
          await proveedorBatch.commit();
        }
      } catch (proveedorError) {
        console.warn('Error actualizando estadísticas del proveedor:', proveedorError);
        // No fallar la recepción principal por este error
      }
      
      mostrarMensaje('exito', `Recepción registrada exitosamente. Evaluación: ${evaluacion.porcentajeTotal.toFixed(1)}% | Pruebas recibidas: ${resumen.totalPruebasRecibidas}`);
      
      // Limpiar intervalo de refresco
      if (intervaloRefrescoRef.current) {
        clearInterval(intervaloRefrescoRef.current);
        intervaloRefrescoRef.current = null;
      }
      
      setMostrarFormularioRecepcion(false);
      setOrdenSeleccionada(null);
      setRecepcionProductos([]);
      setNumeroFactura('');
      setObservacionesGenerales('');
      
      // 6. Recargar datos principales
      const fetchData = async () => {
        try {
          const ordenesRef = collection(db, 'ordenes_compra');
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
          
          const productosRef = collection(db, 'productos');
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
        } catch (fetchError) {
          console.error('Error recargando datos:', fetchError);
        }
      };
      
      await fetchData();
      
    } catch (error: any) {
      console.error('Error registrando recepción:', error);
      mostrarMensaje('error', `Error: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // Helper functions
  const mostrarMensaje = (tipo: 'exito' | 'error' | 'info', texto: string, detalle?: string) => {
    setMensaje({ tipo, texto, detalle });
    setTimeout(() => {
      setMensaje(null);
    }, 5000);
  };

  const handleSort = (field: 'nombre' | 'stock_actual' | 'disciplina') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtros y cálculos
  const filteredProductos = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const solicitudesFiltradas = (filtroEstado === 'todos' 
    ? solicitudes 
    : solicitudes.filter(s => s.estado === filtroEstado)
  ).sort((a, b) => b.numero.localeCompare(a.numero));

  const ordenesFiltradas = (filtroEstado === 'todos'
    ? ordenesCompra
    : ordenesCompra.filter(o => o.estado === filtroEstado)
  ).sort((a, b) => b.numero.localeCompare(a.numero));

  const ordenesParaRecepcion = ordenesCompra.filter(o => o.estado === 'generada');
  const ordenesRecibidas = ordenesCompra.filter(o => o.estado === 'completada').sort((a, b) => b.numero.localeCompare(a.numero));

  const totalCarrito = carrito.reduce((total, item) => total + item.cantidad, 0);
  const totalItemsCarrito = carrito.length;

  // Función para ver detalles de solicitud
  const verDetallesSolicitud = (solicitud: Solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setMostrarDetalleSolicitud(true);
  };

  // Obtener proveedores únicos de una solicitud
  const obtenerProveedoresSolicitud = (solicitud: Solicitud) => {
    const proveedoresSet = new Set(solicitud.productos.map(p => p.proveedor));
    return Array.from(proveedoresSet);
  };

  // Componente de menú de opciones para solicitud
  const MenuOpcionesSolicitud = ({ solicitudId, solicitudNumero }: { solicitudId: string, solicitudNumero: string }) => {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuAbiertoId(menuAbiertoId === solicitudId ? null : solicitudId);
          }}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <MoreVertical className="w-5 h-5 text-gray-500" />
        </button>
        
        {menuAbiertoId === solicitudId && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
            <div className="py-1">
              <button
                onClick={() => {
                  eliminarSolicitud(solicitudId, solicitudNumero);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Solicitud
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Componente de menú de opciones para orden de compra
  const MenuOpcionesOrden = ({ ordenId, ordenNumero, solicitudNumero }: { ordenId: string, ordenNumero: string, solicitudNumero: string }) => {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuAbiertoId(menuAbiertoId === ordenId ? null : ordenId);
          }}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <MoreVertical className="w-5 h-5 text-gray-500" />
        </button>
        
        {menuAbiertoId === ordenId && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
            <div className="py-1">
              <button
                onClick={() => {
                  eliminarOrdenCompra(ordenId, ordenNumero, solicitudNumero);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Orden
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Modal de detalles de orden de compra
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
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {convertirFecha(ordenSeleccionada.fecha).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    {ordenSeleccionada.proveedor}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    ordenSeleccionada.estado === 'generada' ? 'bg-blue-100 text-blue-800' :
                    ordenSeleccionada.estado === 'enviada' ? 'bg-purple-100 text-purple-800' :
                    ordenSeleccionada.estado === 'recibida' ? 'bg-green-100 text-green-800' :
                    ordenSeleccionada.estado === 'completada' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {ordenSeleccionada.estado}
                  </span>
                </div>
                {ordenSeleccionada.totalPruebas && ordenSeleccionada.totalPruebas > 0 && (
                  <div className="mt-2 text-sm text-blue-600 flex items-center gap-1">
                    <TestTube className="w-4 h-4" />
                    <span>Total pruebas ordenadas: {ordenSeleccionada.totalPruebas}</span>
                  </div>
                )}
                {ordenSeleccionada.evaluacionPorcentaje !== undefined && (
                  <div className="mt-2 text-sm">
                    <span className={`px-2 py-0.5 rounded-full ${ordenSeleccionada.evaluacionAprobada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      Evaluación: {ordenSeleccionada.evaluacionPorcentaje.toFixed(1)}% ({ordenSeleccionada.evaluacionAprobada ? 'Aprobada' : 'No Aprobada'}) por {ordenSeleccionada.evaluacionEvaluadoPor}
                    </span>
                  </div>
                )}
                <div className="mt-2 text-sm text-blue-600">
                  <strong>Relación con solicitud:</strong> {ordenSeleccionada.solicitudNumero}
                </div>
              </div>
              <div className="flex gap-2">
                {ordenSeleccionada.estado === 'generada' && (
                  <button
                    onClick={() => {
                      setMostrarDetalleOrden(false);
                      iniciarRecepcion(ordenSeleccionada);
                    }}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm flex items-center gap-1"
                    title="Iniciar recepción"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Recibir
                  </button>
                )}
                <MenuOpcionesOrden 
                  ordenId={ordenSeleccionada.id} 
                  ordenNumero={ordenSeleccionada.numero}
                  solicitudNumero={ordenSeleccionada.solicitudNumero}
                />
                <button
                  onClick={() => {
                    setMostrarDetalleOrden(false);
                    setOrdenSeleccionada(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Información</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Solicitud origen:</span> {ordenSeleccionada.solicitudNumero}</div>
                  <div><span className="font-medium">Proveedor:</span> {ordenSeleccionada.proveedor}</div>
                  <div><span className="font-medium">Creada por:</span> {ordenSeleccionada.creadaPor}</div>
                  <div><span className="font-medium">Numeración:</span> {ordenSeleccionada.numero} ← {ordenSeleccionada.solicitudNumero}</div>
                  {ordenSeleccionada.fechaRecepcion && (
                    <div><span className="font-medium">Fecha recepción:</span> {convertirFecha(ordenSeleccionada.fechaRecepcion).toLocaleDateString()}</div>
                  )}
                  {ordenSeleccionada.numeroFactura && (
                    <div><span className="font-medium">Factura:</span> {ordenSeleccionada.numeroFactura}</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Totales</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">${ordenSeleccionada.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (19%):</span>
                    <span className="font-medium">${ordenSeleccionada.iva.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-lg text-blue-600">${ordenSeleccionada.total.toLocaleString()}</span>
                  </div>
                  {ordenSeleccionada.totalPruebas && ordenSeleccionada.totalPruebas > 0 && (
                    <div className="flex justify-between">
                      <span className="text-blue-600">Total Pruebas:</span>
                      <span className="font-medium text-blue-600">{ordenSeleccionada.totalPruebas}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {ordenSeleccionada.observaciones && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Observaciones:</h3>
                <p className="text-gray-600">{ordenSeleccionada.observaciones}</p>
              </div>
            )}
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Productos ({ordenSeleccionada.productos.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pruebas/Caja</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Unitario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ordenSeleccionada.productos.map((producto, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{producto.nombre}</div>
                          <div className="text-xs text-gray-500">
                            {producto.unidad_medida}
                            {producto.fabricante && ` • ${producto.fabricante}`}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {producto.pruebas_por_caja && producto.pruebas_por_caja > 0 ? (
                            <div>
                              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                                {producto.pruebas_por_caja} pruebas
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                Total: {producto.cantidad * producto.pruebas_por_caja} pruebas
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{producto.cantidad}</td>
                        <td className="px-4 py-3">${producto.precioUnitario.toLocaleString()}</td>
                        <td className="px-4 py-3">${producto.subtotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-end gap-3">
              <button
                onClick={() => generarPDFOrdenCompra(ordenSeleccionada)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar PDF
              </button>
              <button
                onClick={() => {
                  setMostrarDetalleOrden(false);
                  setOrdenSeleccionada(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  });

  DetalleOrdenModal.displayName = 'DetalleOrdenModal';

  // Función simplificada para generar PDF
  const generarPDFOrdenCompra = (orden: OrdenCompra) => {
    if (!orden) return;

    try {
      const contenidoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Orden de Compra ${orden.numero}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header-container { margin-bottom: 30px; }
            .logo-container { text-align: left; margin-bottom: 10px; }
            .header-content { text-align: center; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .subtitle { font-size: 18px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .section { margin: 20px 0; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
            .logo { max-width: 225px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .info-label { font-weight: bold; width: 200px; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="logo-container">
              <img src="/logo.jpg" alt="Logo" class="logo">
            </div>
            <div class="header-content">
              <div class="title">LABORATORIO DE PATOLOGIA CLINICA INTEGRAL S.A DE C.V</div>
              <div class="subtitle">ORDEN DE COMPRA</div>
              <div>CLAVE: LAP-FOR-ADQ-24 | VERSIÓN: 2</div>
            </div>
          </div>

          <div class="section">
            <div class="info-row">
              <span class="info-label">No. orden de compra:</span>
              <span>${orden.numero}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha de Emisión:</span>
              <span>${convertirFecha(orden.fecha).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nombre del Solicitante:</span>
              <span>${orden.creadaPor}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono:</span>
              <span>5552073380</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">DATOS DEL PROVEEDOR</div>
            <div class="info-row">
              <span class="info-label">Nombre Proveedor:</span>
              <span>${orden.proveedor}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Contacto:</span>
              <span>N/A</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono:</span>
              <span>N/A</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span>N/A</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">DETALLE DE LA ORDEN DE COMPRA</div>
            <table>
              <thead>
                <tr>
                  <th>Cantidad</th>
                  <th>Pruebas/Caja</th>
                  <th>Concepto ó Descripción</th>
                  <th>P. Unitario</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${orden.productos.map(producto => `
                  <tr>
                    <td>${producto.cantidad}</td>
                    <td>${producto.pruebas_por_caja ? producto.pruebas_por_caja + ' pruebas' : 'N/A'}</td>
                    <td>${producto.nombre}</td>
                    <td>$${producto.precioUnitario.toFixed(2)}</td>
                    <td>$${(producto.cantidad * producto.precioUnitario).toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="3" style="border: none;"></td>
                  <td style="font-weight: bold; border-top: 2px solid #000;">Subtotal:</td>
                  <td style="font-weight: bold; border-top: 2px solid #000;">$${orden.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="border: none;"></td>
                  <td style="font-weight: bold;">IVA (19%):</td>
                  <td style="font-weight: bold;">$${orden.iva.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="border: none;"></td>
                  <td style="font-weight: bold; font-size: 1.2em; border-top: 2px solid #000;">TOTAL:</td>
                  <td style="font-weight: bold; font-size: 1.2em; border-top: 2px solid #000;">$${orden.total.toFixed(2)}</td>
                </tr>
                ${orden.totalPruebas && orden.totalPruebas > 0 ? `
                <tr>
                  <td colspan="3" style="border: none;"></td>
                  <td style="font-weight: bold; color: blue;">Total Pruebas:</td>
                  <td style="font-weight: bold; color: blue;">${orden.totalPruebas} pruebas</td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 50px;">
            <div style="float: left; width: 45%;">
              <div style="border-top: 1px solid #000; margin-top: 50px; padding-top: 10px;">
                <strong>Proveedor</strong><br>
                Nombre y Firma
              </div>
            </div>
            <div style="float: right; width: 45%;">
              <div style="border-top: 1px solid #000; margin-top: 50px; padding-top: 10px;">
                <strong>Autorizado por</strong><br>
                Nombre y Firma
              </div>
            </div>
            <div style="clear: both;"></div>
          </div>

          <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
            Documento generado automáticamente el ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
          </div>
        </body>
        </html>
      `;

      const ventana = window.open('', '_blank');
      if (ventana) {
        ventana.document.write(contenidoHTML);
        ventana.document.close();
        
        ventana.onload = () => {
          ventana.focus();
          ventana.print();
          ventana.onafterprint = () => {
            ventana.close();
          };
        };
        
        mostrarMensaje('exito', `Preparando impresión de orden ${orden.numero}`);
      } else {
        mostrarMensaje('error', 'No se pudo abrir la ventana de impresión');
      }

    } catch (error: any) {
      console.error('Error al generar PDF:', error);
      mostrarMensaje('error', 'Error al generar el documento');
    }
  };

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setMenuAbiertoId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Estadísticas para dashboard
  const estadisticas = useMemo(() => {
    const productosConPruebas = productos.filter(p => p.pruebas_por_caja !== undefined && p.pruebas_por_caja > 0);
    
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Mensajes */}
      {mensaje && (
        <div className={`mb-4 p-4 rounded-lg ${mensaje.tipo === 'exito' 
          ? 'bg-green-50 text-green-800 border border-green-200' 
          : mensaje.tipo === 'error' 
          ? 'bg-red-50 text-red-800 border border-red-200'
          : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
          <div className="flex items-start">
            {mensaje.tipo === 'exito' ? (
              <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            ) : mensaje.tipo === 'error' ? (
              <XCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-medium">{mensaje.texto}</p>
              {mensaje.detalle && (
                <p className="text-sm mt-1 opacity-90">{mensaje.detalle}</p>
              )}
            </div>
            <button
              onClick={() => setMensaje(null)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Gestión de Inventario y Compras</h1>
        <p className="text-gray-600">Sistema completo de solicitudes, órdenes de compra y recepción</p>
        <div className="text-sm text-blue-600 mt-1">
          <TestTube className="w-4 h-4 inline mr-1" />
          Sistema actualizado para manejar productos por cajas con número de pruebas
        </div>
      </div>

      {/* Estadísticas del dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Productos</p>
              <p className="text-2xl font-bold text-gray-800">{productos.length}</p>
              <p className="text-xs text-red-600">{estadisticas.productosBajoStock} bajo stock</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Solicitudes</p>
              <p className="text-2xl font-bold text-yellow-600">{solicitudes.length}</p>
              <p className="text-xs text-yellow-600">{estadisticas.solicitudesPendientes} pendientes</p>
              <p className="text-xs text-blue-600">{estadisticas.totalPruebasSolicitadas} pruebas solicitadas</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Órdenes</p>
              <p className="text-2xl font-bold text-blue-600">{ordenesCompra.length}</p>
              <p className="text-xs text-blue-600">{estadisticas.ordenesPendientesRecepcion} por recibir</p>
              <p className="text-xs text-green-600">{estadisticas.ordenesCompletadas} completadas</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pruebas/Caja</p>
              <p className="text-2xl font-bold text-purple-600">{estadisticas.productosConPruebasPorCaja}</p>
              <p className="text-xs text-purple-600">productos con valor</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <TestTube className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pruebas en Inventario</p>
              <p className="text-2xl font-bold text-green-600">
                {estadisticas.totalPruebasEnInventario.toLocaleString()}
              </p>
              <p className="text-xs text-green-600">pruebas totales</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Box className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs principales */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('productos')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'productos' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Productos ({productos.length})
            {totalItemsCarrito > 0 && activeTab !== 'productos' && (
              <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {totalItemsCarrito}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'solicitudes' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Solicitudes ({solicitudes.length})
            {estadisticas.solicitudesPendientes > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {estadisticas.solicitudesPendientes} pendientes
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ordenes')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'ordenes' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            Órdenes Compra ({ordenesCompra.length})
          </button>
          <button
            onClick={() => setActiveTab('recepcion')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'recepcion' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ClipboardCheck className="w-4 h-4 inline mr-2" />
            Recepción
            {ordenesParaRecepcion.length > 0 && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                {ordenesParaRecepcion.length} por recibir
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('recibidas')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'recibidas' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Archive className="w-4 h-4 inline mr-2" />
            Recibidas ({ordenesRecibidas.length})
          </button>
        </nav>
      </div>

      {/* Carrito flotante */}
      {carrito.length > 0 && activeTab === 'productos' && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border p-4 w-80 z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Carrito ({totalItemsCarrito})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCarrito([])}
                className="text-sm text-red-600 hover:text-red-800"
                title="Vaciar carrito"
              >
                Vaciar
              </button>
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto mb-3 space-y-2">
            {carrito.map(item => {
              const pruebasPorCaja = obtenerPruebasPorCaja(
                item.producto.nombre,
                item.producto.fabricante || '',
                item.producto.proveedor
              );
              const totalPruebas = pruebasPorCaja > 0 ? item.cantidad * pruebasPorCaja : 0;
              
              return (
                <div key={item.producto.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                  <div className="truncate flex-1 mr-2">
                    <div className="font-medium">{item.producto.nombre}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {item.producto.proveedor}
                    </div>
                    {pruebasPorCaja > 0 && (
                      <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                        <TestTube className="w-3 h-3" />
                        {pruebasPorCaja} pruebas/caja • Total: {totalPruebas} pruebas
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-500 ml-1">{item.producto.unidad_medida}</span>
                    <button
                      onClick={() => quitarDelCarrito(item.producto.id)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mb-3">
            <textarea
              value={comentarioSolicitud}
              onChange={e => setComentarioSolicitud(e.target.value)}
              className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Comentarios para la solicitud (opcional)..."
              rows={2}
            />
          </div>
          
          <button
            onClick={crearSolicitud}
            disabled={procesando || carrito.length === 0}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {procesando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creando Solicitud...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Crear Solicitud
              </>
            )}
          </button>
        </div>
      )}

      {/* Contenido según tab activo */}
      {activeTab === 'productos' && (
        <>
          {/* Barra de búsqueda */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar productos por nombre, código, disciplina o proveedor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tabla de productos */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {filteredProductos.length === 0 ? (
              <div className="text-center py-10">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
                <p className="mt-1 text-sm text-gray-500">Intenta ajustar tu búsqueda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Stock / Alerta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Disciplina
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Proveedor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pruebas/Caja
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Acción
                      </th>
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
                            <div>
                              <div className="font-medium text-gray-900">{producto.nombre}</div>
                              {producto.codigo && (
                                <div className="text-sm text-gray-500">Código: {producto.codigo}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                producto.stock_actual === 0 
                                  ? 'bg-red-100 text-red-800'
                                  : producto.stock_actual <= producto.alerta_minima
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {producto.stock_actual} {producto.unidad_medida}
                                {pruebasPorCaja > 0 && (
                                  <span className="ml-1 text-xs">({stockEnPruebas} pruebas)</span>
                                )}
                              </div>
                              {enCarrito && (
                                <span className="ml-2 text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                  {enCarrito.cantidad}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Alerta: {producto.alerta_minima} {producto.unidad_medida}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                              {producto.disciplina}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm text-gray-700">
                              <Building className="w-4 h-4 mr-2 text-gray-400" />
                              {producto.proveedor}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {pruebasPorCaja > 0 ? (
                              <div className="flex items-center gap-1">
                                <TestTube className="w-4 h-4 text-blue-500" />
                                <div>
                                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                                    {pruebasPorCaja} pruebas
                                  </span>
                                  <div className="text-xs text-gray-500 mt-1">
                                    1 caja = {pruebasPorCaja} pruebas
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => agregarAlCarrito(producto)}
                              disabled={procesando}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                procesando
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {enCarrito ? 'Agregar más' : 'Solicitar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'solicitudes' && (
        <>
          {/* Filtros */}
          <div className="mb-6 flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select 
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="parcial">Parcialmente aprobadas</option>
                <option value="aprobada">Aprobadas</option>
                <option value="rechazada">Rechazadas</option>
                <option value="procesada">Procesadas</option>
                <option value="completada">Completadas</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-600">
              Mostrando {solicitudesFiltradas.length} de {solicitudes.length} solicitudes
              {estadisticas.totalPruebasSolicitadas > 0 && (
                <span className="ml-2 text-blue-600">
                  • {estadisticas.totalPruebasSolicitadas} pruebas solicitadas
                </span>
              )}
            </div>
          </div>

          {/* Tabla de solicitudes */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {solicitudesFiltradas.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay solicitudes</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filtroEstado === 'todos' 
                    ? 'No se han creado solicitudes aún.'
                    : `No hay solicitudes en estado "${filtroEstado}".`}
                </p>
                <button
                  onClick={() => setActiveTab('productos')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Crear nueva solicitud
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Número
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Solicitante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Productos / Unidades
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Proveedores
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {solicitudesFiltradas.map(solicitud => {
                      const proveedoresUnicos = obtenerProveedoresSolicitud(solicitud);
                      const productosAprobados = solicitud.productos.filter(p => p.estado === 'aprobado').length;
                      
                      return (
                        <tr key={solicitud.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{solicitud.numero}</div>
                            {solicitud.totalPruebasSolicitadas && solicitud.totalPruebasSolicitadas > 0 && (
                              <div className="text-xs text-blue-600">
                                {solicitud.totalPruebasSolicitadas} pruebas
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {convertirFecha(solicitud.fecha).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {convertirFecha(solicitud.fecha).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{solicitud.solicitante}</div>
                            <div className="text-xs text-gray-500">{solicitud.departamento}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              <span className="font-medium">{solicitud.productos.length}</span> productos
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">{solicitud.totalUnidadesSolicitadas}</span> unidades solicitadas
                            </div>
                            {solicitud.totalUnidadesAprobadas && solicitud.totalUnidadesAprobadas > 0 && (
                              <div className="text-xs text-green-600">
                                <span className="font-medium">{solicitud.totalUnidadesAprobadas}</span> unidades aprobadas
                              </div>
                            )}
                            {solicitud.totalPruebasSolicitadas && solicitud.totalPruebasSolicitadas > 0 && (
                              <div className="text-xs text-blue-600 flex items-center gap-1">
                                <TestTube className="w-3 h-3" />
                                <span>{solicitud.totalPruebasSolicitadas} pruebas totales</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {proveedoresUnicos.slice(0, 2).map((proveedor, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                                  <Building className="w-3 h-3 mr-1" />
                                  {proveedor}
                                </span>
                              ))}
                              {proveedoresUnicos.length > 2 && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                                  +{proveedoresUnicos.length - 2} más
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              solicitud.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                              solicitud.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
                              solicitud.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                              solicitud.estado === 'parcial' ? 'bg-blue-100 text-blue-800' :
                              solicitud.estado === 'procesada' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {solicitud.estado}
                              {solicitud.estado === 'parcial' && (
                                <span className="ml-1">({productosAprobados}/{solicitud.productos.length})</span>
                              )}
                            </span>
                            {solicitud.aprobador && (
                              <div className="text-xs text-gray-500 mt-1">
                                Por: {solicitud.aprobador}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => verDetallesSolicitud(solicitud)}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center gap-1"
                                title="Ver detalles"
                              >
                                <Eye className="w-4 h-4" />
                                Detalles
                              </button>
                              {solicitud.estado === 'aprobada' && !solicitud.ordenesCompra?.length && (
                                <button
                                  onClick={() => generarOrdenesPorProveedor(solicitud.id)}
                                  disabled={procesando}
                                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                                  title="Generar órdenes por proveedor"
                                >
                                  <Truck className="w-4 h-4" />
                                </button>
                              )}
                              {solicitud.ordenesCompra && solicitud.ordenesCompra.length > 0 && (
                                <button
                                  onClick={() => setActiveTab('ordenes')}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                                  title="Ver órdenes generadas"
                                >
                                  {solicitud.ordenesCompra.length} órdenes
                                </button>
                              )}
                              <MenuOpcionesSolicitud 
                                solicitudId={solicitud.id} 
                                solicitudNumero={solicitud.numero}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'ordenes' && (
        <>
          {/* Filtros para órdenes */}
          <div className="mb-6 flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select 
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="generada">Generadas</option>
                <option value="enviada">Enviadas</option>
                <option value="recibida">Recibidas</option>
                <option value="completada">Completadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-600">
              {ordenesCompra.length > 0 && (
                <div>
                  <span>Total: ${ordenesCompra.reduce((sum, o) => sum + o.total, 0).toLocaleString()}</span>
                  <span className="ml-2 text-blue-600">
                    • {ordenesCompra.reduce((sum, o) => sum + (o.totalPruebas || 0), 0)} pruebas
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de órdenes de compra */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {ordenesFiltradas.length === 0 ? (
              <div className="text-center py-10">
                <Truck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay órdenes de compra</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filtroEstado === 'todos' 
                    ? 'No se han generado órdenes de compra aún.'
                    : `No hay órdenes de compra en estado "${filtroEstado}".`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Número OC ← SOL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Proveedor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Productos / Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pruebas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Solicitud Origen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ordenesFiltradas.map(orden => (
                      <tr key={orden.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{orden.numero}</div>
                          <div className="text-xs text-blue-600">
                            {orden.numero.includes('-A') || orden.numero.includes('-B') || orden.numero.includes('-C') 
                              ? `Orden múltiple (${orden.solicitudNumero})`
                              : `← ${orden.solicitudNumero}`}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {convertirFecha(orden.fecha).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900">
                            <Building className="w-4 h-4 mr-2 text-gray-400" />
                            {orden.proveedor}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">{orden.productos.length}</span> productos
                          </div>
                          <div className="text-lg font-bold text-blue-600">
                            ${orden.total.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {orden.totalPruebas && orden.totalPruebas > 0 ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <TestTube className="w-4 h-4" />
                              <div>
                                <span className="font-medium">{orden.totalPruebas}</span>
                                <div className="text-xs text-gray-500">
                                  {orden.productos.reduce((sum, p) => sum + p.cantidad, 0)} cajas
                                </div>
                              </div>
                          </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{orden.solicitudNumero}</div>
                          <div className="text-xs text-gray-500">Creada por: {orden.creadaPor}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            orden.estado === 'generada' ? 'bg-blue-100 text-blue-800' :
                            orden.estado === 'enviada' ? 'bg-purple-100 text-purple-800' :
                            orden.estado === 'recibida' ? 'bg-green-100 text-green-800' :
                            orden.estado === 'completada' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {orden.estado}
                          </span>
                          {orden.fechaRecepcion && (
                            <div className="text-xs text-gray-500 mt-1">
                              Recibida: {convertirFecha(orden.fechaRecepcion).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setOrdenSeleccionada(orden);
                                setMostrarDetalleOrden(true);
                              }}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center gap-1"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                              Detalles
                            </button>
                            {orden.estado === 'generada' && (
                              <button
                                onClick={() => iniciarRecepcion(orden)}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm flex items-center gap-1"
                                title="Iniciar recepción"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Recibir
                              </button>
                            )}
                            <button
                              onClick={() => generarPDFOrdenCompra(orden)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm flex items-center gap-1"
                              title="Descargar PDF"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </button>
                            <MenuOpcionesOrden 
                              ordenId={orden.id} 
                              ordenNumero={orden.numero}
                              solicitudNumero={orden.solicitudNumero}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'recepcion' && (
        <>
          {/* Estadísticas de recepción */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Órdenes por Recibir</p>
                  <p className="text-2xl font-bold text-blue-600">{ordenesParaRecepcion.length}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Productos Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {ordenesParaRecepcion.reduce((sum, orden) => sum + orden.productos.length, 0)}
                  </p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Package className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pruebas Pendientes</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {ordenesParaRecepcion.reduce((sum, orden) => sum + (orden.totalPruebas || 0), 0)}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TestTube className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Valor Pendiente</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${ordenesParaRecepcion.reduce((sum, orden) => sum + orden.total, 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de recepción */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Órdenes para Recepción</h2>
                  <p className="text-sm text-gray-600">
                    {ordenesParaRecepcion.length === 0 
                      ? 'Todas las órdenes han sido recibidas' 
                      : `Mostrando ${ordenesParaRecepcion.length} órdenes pendientes de recepción`}
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  Actualizado: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            {ordenesParaRecepcion.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Todas las órdenes han sido recibidas</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No hay órdenes pendientes de recepción en este momento.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Productos</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pruebas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ordenesParaRecepcion.map((orden) => (
                      <tr key={orden.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{orden.numero}</div>
                          <div className="text-xs text-blue-600">Solicitud: {orden.solicitudNumero}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {convertirFecha(orden.fecha).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900">
                            <Building className="w-4 h-4 mr-2 text-gray-400" />
                            {orden.proveedor}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">{orden.productos.length}</span> productos
                          </div>
                          <div className="text-xs text-gray-500">
                            {orden.productos.reduce((sum, p) => sum + p.cantidad, 0)} unidades
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {orden.totalPruebas && orden.totalPruebas > 0 ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <TestTube className="w-4 h-4" />
                              <div>
                                <span className="font-medium">{orden.totalPruebas}</span>
                                <div className="text-xs text-gray-500">
                                  en {orden.productos.reduce((sum, p) => sum + p.cantidad, 0)} cajas
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg font-bold text-blue-600">
                            ${orden.total.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {orden.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setOrdenSeleccionada(orden);
                                setMostrarDetalleOrden(true);
                              }}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </button>
                            <button
                              onClick={() => iniciarRecepcion(orden)}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm flex items-center gap-1"
                            >
                              <ClipboardCheck className="w-4 h-4" />
                              Recibir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Instrucciones */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Instrucciones para Recepción (Sistema actualizado)
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. Seleccione una orden para iniciar el proceso de recepción</li>
              <li>2. <strong>NUEVO:</strong> Los productos con "Pruebas/Caja" se multiplicarán automáticamente al inventario</li>
              <li>3. Ingrese el número de pruebas por caja para cada producto (si aplica)</li>
              <li>4. Use el botón "Aplicar Default" para cargar valores predefinidos del catálogo</li>
              <li>5. Verifique cada producto recibido contra la orden original</li>
              <li>6. Complete la evaluación del proveedor (se guarda incluso si no es aprobada)</li>
              <li>7. Registre números de lote y fechas de vencimiento cuando aplique</li>
              <li>8. <strong>NUEVO:</strong> El sistema actualizará el inventario multiplicando cajas × pruebas/caja</li>
            </ul>
            <div className="mt-3 p-3 bg-white rounded border">
              <h4 className="font-medium text-blue-800 mb-1 flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Información sobre "Pruebas por Caja" (Valores predefinidos):
              </h4>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Productos de BIOMERIEUX (TSH, T3, T4, etc.): 60 pruebas por caja</li>
                <li>• Productos de DESEGO (BNP, hsCRP, etc.): 24 pruebas por caja</li>
                <li>• Otros productos: El usuario debe ingresar manualmente</li>
                <li>• <strong>Fórmula:</strong> Stock final = Stock actual + (Cantidad recibida × Pruebas por caja)</li>
                <li>• Ejemplo: Si recibe 2 cajas de T3 (60 pruebas/caja), se agregarán 120 pruebas al inventario</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* NUEVA PESTAÑA: ÓRDENES RECIBIDAS */}
      {activeTab === 'recibidas' && (
        <>
          {/* Cabecera con total recibido */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Órdenes de Compra Recibidas
              <span className="text-sm font-normal text-gray-500 ml-2">
                Mostrando {ordenesRecibidas.length} órdenes completadas
              </span>
            </h2>
            <div className="text-lg font-bold text-green-600">
              Total recibido: ${ordenesRecibidas.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
            </div>
          </div>

          {/* Tabla de órdenes recibidas */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {ordenesRecibidas.length === 0 ? (
              <div className="text-center py-10">
                <Archive className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay órdenes recibidas</h3>
                <p className="mt-1 text-sm text-gray-500">Las órdenes completadas aparecerán aquí.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NÚMERO OC</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">FECHA EMISIÓN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PROVEEDOR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PRODUCTOS / TOTAL</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PRUEBAS</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">FECHA RECEPCIÓN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">FACTURA</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">EVALUACIÓN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ordenesRecibidas.map(orden => (
                      <tr key={orden.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{orden.numero}</div>
                          <div className="text-xs text-gray-500">{orden.solicitudNumero}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {convertirFecha(orden.fecha).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900">
                            <Building className="w-4 h-4 mr-2 text-gray-400" />
                            {orden.proveedor}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">{orden.productos.length}</span> productos
                          </div>
                          <div className="text-lg font-bold text-blue-600">
                            ${orden.total.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {orden.totalPruebas && orden.totalPruebas > 0 ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <TestTube className="w-4 h-4" />
                              <span className="font-medium">{orden.totalPruebas}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {orden.fechaRecepcion ? (
                            <div className="text-sm text-gray-900">
                              {convertirFecha(orden.fechaRecepcion).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {orden.numeroFactura ? (
                            <span className="text-sm font-medium text-gray-900">{orden.numeroFactura}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {orden.evaluacionPorcentaje !== undefined ? (
                            <div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                orden.evaluacionAprobada ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {orden.evaluacionPorcentaje.toFixed(1)}%
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                Por: {orden.evaluacionEvaluadoPor || 'N/A'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setOrdenSeleccionada(orden);
                                setMostrarDetalleOrden(true);
                              }}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center gap-1"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                              Detalles
                            </button>
                            <button
                              onClick={() => generarPDFOrdenCompra(orden)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm flex items-center gap-1"
                              title="Descargar PDF"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modales */}
      {mostrarDetalleSolicitud && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Detalle de Solicitud: {solicitudSeleccionada.numero}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {convertirFecha(solicitudSeleccionada.fecha).toLocaleDateString()} {convertirFecha(solicitudSeleccionada.fecha).toLocaleTimeString()}
                    </span>
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {solicitudSeleccionada.solicitante}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      solicitudSeleccionada.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      solicitudSeleccionada.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
                      solicitudSeleccionada.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                      solicitudSeleccionada.estado === 'parcial' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {solicitudSeleccionada.estado}
                    </span>
                  </div>
                  {solicitudSeleccionada.totalPruebasSolicitadas && solicitudSeleccionada.totalPruebasSolicitadas > 0 && (
                    <div className="mt-2 text-sm text-blue-600 flex items-center gap-1">
                      <TestTube className="w-4 h-4" />
                      <span>Total pruebas solicitadas: {solicitudSeleccionada.totalPruebasSolicitadas}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <MenuOpcionesSolicitud 
                    solicitudId={solicitudSeleccionada.id} 
                    solicitudNumero={solicitudSeleccionada.numero}
                  />
                  <button
                    onClick={() => {
                      setMostrarDetalleSolicitud(false);
                      setSolicitudSeleccionada(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {solicitudSeleccionada.comentarios && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Comentarios:</h3>
                  <p className="text-gray-600">{solicitudSeleccionada.comentarios}</p>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-4">Productos ({solicitudSeleccionada.productos.length})</h3>
                <div className="space-y-3">
                  {solicitudSeleccionada.productos.map((producto, index) => {
                    const totalPruebas = producto.pruebas_por_caja && producto.pruebas_por_caja > 0 
                      ? (producto.cantidadAprobada || producto.cantidadSolicitada) * producto.pruebas_por_caja 
                      : 0;
                    
                    return (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{producto.nombre}</h4>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center">
                                <Building className="w-4 h-4 mr-1" />
                                {producto.proveedor}
                              </span>
                              <span>Stock disponible: {producto.stockDisponible}</span>
                              <span>Solicitado: {producto.cantidadSolicitada} {producto.unidad_medida}</span>
                              {producto.cantidadAprobada !== undefined && producto.cantidadAprobada > 0 && (
                                <span className="font-medium text-green-600">
                                  Aprobado: {producto.cantidadAprobada} {producto.unidad_medida}
                                </span>
                              )}
                              {producto.pruebas_por_caja && producto.pruebas_por_caja > 0 && (
                                <span className="flex items-center gap-1 text-blue-600">
                                  <TestTube className="w-3 h-3" />
                                  {producto.pruebas_por_caja} pruebas/caja • Total: {totalPruebas} pruebas
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              producto.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                              producto.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {producto.estado}
                            </span>
                          </div>
                        </div>
                        
                        {usuarioActual.rol === 'aprobador' && producto.estado === 'pendiente' && (
                          <div className="flex gap-3 mt-3 pt-3 border-t">
                            <button
                              onClick={() => procesarProductoSolicitud(
                                solicitudSeleccionada.id, 
                                producto.productoId, 
                                true, 
                                producto.cantidadSolicitada
                              )}
                              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium flex items-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Aprobar ({producto.cantidadSolicitada})
                              {producto.pruebas_por_caja && producto.pruebas_por_caja > 0 && (
                                <span className="text-xs">({producto.cantidadSolicitada * producto.pruebas_por_caja} pruebas)</span>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                const cantidad = prompt(`¿Cuántas unidades aprobar para ${producto.nombre}?`, producto.cantidadSolicitada.toString());
                                if (cantidad && !isNaN(parseInt(cantidad))) {
                                  procesarProductoSolicitud(
                                    solicitudSeleccionada.id, 
                                    producto.productoId, 
                                    true, 
                                    parseInt(cantidad)
                                  );
                                }
                              }}
                              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                            >
                              Aprobar cantidad diferente
                            </button>
                            <button
                              onClick={() => {
                                const comentario = prompt(`Razón para rechazar ${producto.nombre}:`, '');
                                if (comentario !== null) {
                                  procesarProductoSolicitud(
                                    solicitudSeleccionada.id, 
                                    producto.productoId, 
                                    false, 
                                    0, 
                                    comentario
                                  );
                                }
                              }}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              Rechazar
                            </button>
                          </div>
                        )}
                        
                        {producto.comentario && (
                          <div className="mt-2 text-sm text-gray-600 italic">
                            <span className="font-medium">Comentario:</span> {producto.comentario}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Total productos:</span> {solicitudSeleccionada.totalProductos}
                    </div>
                    <div>
                      <span className="font-medium">Total solicitado:</span> {solicitudSeleccionada.totalUnidadesSolicitadas} unidades
                    </div>
                    <div>
                      <span className="font-medium">Total aprobado:</span> {solicitudSeleccionada.totalUnidadesAprobadas || 0} unidades
                    </div>
                    <div>
                      <span className="font-medium">Proveedores:</span> {obtenerProveedoresSolicitud(solicitudSeleccionada).length}
                    </div>
                    {solicitudSeleccionada.totalPruebasSolicitadas && solicitudSeleccionada.totalPruebasSolicitadas > 0 && (
                      <div className="col-span-2">
                        <span className="font-medium text-blue-600">Total pruebas solicitadas:</span> {solicitudSeleccionada.totalPruebasSolicitadas} pruebas
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {solicitudSeleccionada.estado === 'aprobada' && !solicitudSeleccionada.ordenesCompra?.length && (
                    <button
                      onClick={() => {
                        generarOrdenesPorProveedor(solicitudSeleccionada.id);
                        setMostrarDetalleSolicitud(false);
                        setSolicitudSeleccionada(null);
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Generar Órdenes por Proveedor
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMostrarDetalleSolicitud(false);
                      setSolicitudSeleccionada(null);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Orden */}
      <DetalleOrdenModal />

      {/* Modal de Formulario de Recepción optimizado */}
      {mostrarFormularioRecepcion && ordenSeleccionada && (
        <FormularioRecepcion
          ordenSeleccionada={ordenSeleccionada}
          recepcionProductos={recepcionProductos}
          fechaRecepcion={fechaRecepcion}
          numeroFactura={numeroFactura}
          observacionesGenerales={observacionesGenerales}
          evaluacion={evaluacion}
          onRecepcionChange={(updates) => {
            if (updates.recepcionProductos) setRecepcionProductos(updates.recepcionProductos);
            if (updates.fechaRecepcion) setFechaRecepcion(updates.fechaRecepcion);
            if (updates.numeroFactura) setNumeroFactura(updates.numeroFactura);
            if (updates.observacionesGenerales) setObservacionesGenerales(updates.observacionesGenerales);
            if (updates.evaluacion) setEvaluacion(updates.evaluacion);
          }}
          onClose={() => {
            if (intervaloRefrescoRef.current) {
              clearInterval(intervaloRefrescoRef.current);
            }
            setMostrarFormularioRecepcion(false);
            setOrdenSeleccionada(null);
          }}
          onRegistrar={registrarRecepcion}
          procesando={procesando}
          usuarioActual={usuarioActual}
          refrescarDatosModalRecepcion={refrescarDatosModalRecepcion}
        />
      )}
    </div>
  );
};

export default ReporteStockActual;