// /app/components/RecepcionOrdenesCompra.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc, 
  updateDoc,
  Timestamp,
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Search, 
  Filter,
  Plus, 
  Minus, 
  Save, 
  RotateCcw, 
  Calendar,
  Building,
  FileText,
  Eye,
  Download,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  ClipboardCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

// Interfaces
interface ProductoOrden {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad_medida: string;
  estado: string;
}

interface OrdenCompra {
  id: string;
  numero: string;
  fecha: Timestamp;
  solicitudId: string;
  solicitudNumero: string;
  proveedor: string;
  proveedor_id?: string;
  productos: ProductoOrden[];
  subtotal: number;
  iva: number;
  total: number;
  estado: 'pendiente' | 'generada' | 'enviada' | 'recibida' | 'cancelada';
  fechaEntrega?: Timestamp;
  observaciones?: string;
  creadaPor: string;
  fechaRecepcion?: Timestamp;
  recibidaPor?: string;
}

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
  alerta_minima: number;
  precio_unitario?: number;
  ubicacion?: string;
}

interface RecepcionProducto {
  productoId: string;
  productoNombre: string;
  codigoProducto?: string;
  cantidadOrdenada: number;
  cantidadRecibida: number;
  diferencia: number;
  numeroLote: string;
  fechaVencimiento: string;
  observaciones: string;
  fabricante?: string;
  unidadMedida: string;
  precioUnitario: number;
  stockActual?: number;
  nuevoStock?: number;
}

export default function RecepcionOrdenesCompra() {
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenCompra[]>([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenCompra | null>(null);
  const [mostrarDetalleOrden, setMostrarDetalleOrden] = useState(false);
  const [mostrarFormularioRecepcion, setMostrarFormularioRecepcion] = useState(false);
  const [recepcionProductos, setRecepcionProductos] = useState<RecepcionProducto[]>([]);
  
  // Estados del formulario de recepción
  const [fechaRecepcion, setFechaRecepcion] = useState(new Date().toISOString().split('T')[0]);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [usuarioActual] = useState({
    id: 'user_001',
    nombre: 'Ana López',
    departamento: 'Recepcion'
  });

  // Cargar órdenes pendientes de recepción
  useEffect(() => {
    cargarOrdenesPendientes();
  }, []);

  const cargarOrdenesPendientes = async () => {
    try {
      setLoading(true);
      
      // Cargar órdenes en estado 'generada' o 'enviada'
      const ordenesRef = collection(db, 'ordenes_compra');
      const q = query(
        ordenesRef,
        where('estado', 'in', ['generada', 'enviada']),
        orderBy('fecha', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const ordenesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          numero: data.numero || '',
          fecha: data.fecha || Timestamp.now(),
          solicitudId: data.solicitudId || '',
          solicitudNumero: data.solicitudNumero || '',
          proveedor: data.proveedor || 'Sin proveedor',
          proveedor_id: data.proveedor_id || '',
          productos: data.productos || [],
          subtotal: Number(data.subtotal) || 0,
          iva: Number(data.iva) || 0,
          total: Number(data.total) || 0,
          estado: data.estado || 'generada',
          fechaEntrega: data.fechaEntrega || undefined,
          observaciones: data.observaciones || '',
          creadaPor: data.creadaPor || 'Sistema'
        } as OrdenCompra;
      });
      
      setOrdenesPendientes(ordenesData);
      
    } catch (error: any) {
      console.error('Error cargando órdenes pendientes:', error);
      toast.error('Error al cargar las órdenes pendientes');
    } finally {
      setLoading(false);
    }
  };

  // Ver detalles de orden
  const verDetallesOrden = (orden: OrdenCompra) => {
    setOrdenSeleccionada(orden);
    setMostrarDetalleOrden(true);
  };

  // Iniciar recepción de orden
  const iniciarRecepcion = async (orden: OrdenCompra) => {
    try {
      setOrdenSeleccionada(orden);
      
      // Preparar datos de recepción para cada producto
      const productosRecepcion: RecepcionProducto[] = await Promise.all(
        orden.productos.map(async (producto) => {
          // Obtener información actual del producto
          let stockActual = 0;
          let codigoProducto = '';
          let fabricante = '';
          
          try {
            const productoRef = doc(db, 'productos', producto.productoId);
            const productoDoc = await getDoc(productoRef);
            if (productoDoc.exists()) {
              const productoData = productoDoc.data();
              stockActual = productoData.stock_actual || 0;
              codigoProducto = productoData.codigo || '';
              fabricante = productoData.fabricante || '';
            }
          } catch (error) {
            console.warn('No se pudo cargar información del producto:', producto.productoId);
          }
          
          return {
            productoId: producto.productoId,
            productoNombre: producto.nombre,
            codigoProducto: codigoProducto,
            cantidadOrdenada: producto.cantidad,
            cantidadRecibida: producto.cantidad, // Por defecto, se recibe la cantidad ordenada
            diferencia: 0,
            numeroLote: '',
            fechaVencimiento: '',
            observaciones: '',
            fabricante: fabricante,
            unidadMedida: producto.unidad_medida,
            precioUnitario: producto.precioUnitario,
            stockActual: stockActual,
            nuevoStock: stockActual + producto.cantidad
          } as RecepcionProducto;
        })
      );
      
      setRecepcionProductos(productosRecepcion);
      setMostrarFormularioRecepcion(true);
      
    } catch (error: any) {
      console.error('Error iniciando recepción:', error);
      toast.error('Error al preparar la recepción');
    }
  };

  // Actualizar valores de recepción
  const actualizarRecepcionProducto = (productoId: string, campo: keyof RecepcionProducto, valor: string | number) => {
    setRecepcionProductos(prev => prev.map(producto => {
      if (producto.productoId !== productoId) return producto;
      
      const productoActualizado = { ...producto, [campo]: valor };
      
      // Calcular diferencia y nuevo stock si se cambia cantidadRecibida
      if (campo === 'cantidadRecibida') {
        const cantidadRecibida = typeof valor === 'string' ? parseInt(valor) || 0 : valor;
        productoActualizado.diferencia = cantidadRecibida - producto.cantidadOrdenada;
        productoActualizado.nuevoStock = (producto.stockActual || 0) + cantidadRecibida;
      }
      
      return productoActualizado;
    }));
  };

  // Incrementar/decrementar cantidad recibida
  const ajustarCantidadRecibida = (productoId: string, incremento: number) => {
    setRecepcionProductos(prev => prev.map(producto => {
      if (producto.productoId !== productoId) return producto;
      
      const nuevaCantidad = Math.max(0, producto.cantidadRecibida + incremento);
      const diferencia = nuevaCantidad - producto.cantidadOrdenada;
      const nuevoStock = (producto.stockActual || 0) + nuevaCantidad;
      
      return {
        ...producto,
        cantidadRecibida: nuevaCantidad,
        diferencia: diferencia,
        nuevoStock: nuevoStock
      };
    }));
  };

  // Validar recepción
  const validarRecepcion = (): { valido: boolean; mensaje: string } => {
    if (!ordenSeleccionada) {
      return { valido: false, mensaje: 'No hay orden seleccionada' };
    }
    
    if (recepcionProductos.length === 0) {
      return { valido: false, mensaje: 'No hay productos para recepcionar' };
    }
    
    // Verificar que al menos un producto tenga cantidad recibida > 0
    const productosConRecepcion = recepcionProductos.filter(p => p.cantidadRecibida > 0);
    if (productosConRecepcion.length === 0) {
      return { valido: false, mensaje: 'Debe recibir al menos un producto' };
    }
    
    // Verificar que todos los productos con cantidad recibida tengan número de lote
    const productosSinLote = productosConRecepcion.filter(p => !p.numeroLote.trim());
    if (productosSinLote.length > 0) {
      return { valido: false, mensaje: 'Debe ingresar número de lote para todos los productos recibidos' };
    }
    
    return { valido: true, mensaje: 'Recepción válida' };
  };

  // Registrar recepción
  const registrarRecepcion = async () => {
    const validacion = validarRecepcion();
    if (!validacion.valido) {
      toast.error(validacion.mensaje);
      return;
    }
    
    try {
      setProcesando(true);
      const batch = writeBatch(db);
      const ahora = Timestamp.now();
      
      // 1. Actualizar orden de compra
      const ordenRef = doc(db, 'ordenes_compra', ordenSeleccionada!.id);
      batch.update(ordenRef, {
        estado: 'recibida',
        fechaRecepcion: ahora,
        recibidaPor: usuarioActual.nombre,
        observaciones: observacionesGenerales.trim() || `Recepción registrada el ${fechaRecepcion}`,
        factura: numeroFactura.trim() || '',
        fechaEntrega: Timestamp.fromDate(new Date(fechaRecepcion)),
        actualizadoEn: serverTimestamp()
      });
      
      // 2. Actualizar productos y registrar movimientos
      for (const productoRecepcion of recepcionProductos) {
        if (productoRecepcion.cantidadRecibida > 0) {
          // Actualizar stock del producto
          const productoRef = doc(db, 'productos', productoRecepcion.productoId);
          const nuevoStock = (productoRecepcion.stockActual || 0) + productoRecepcion.cantidadRecibida;
          
          batch.update(productoRef, {
            stock_actual: nuevoStock,
            lote: productoRecepcion.numeroLote || undefined,
            fecha_vencimiento: productoRecepcion.fechaVencimiento || undefined,
            updated_at: serverTimestamp()
          });
          
          // Registrar movimiento de recepción
          const movimientoRef = doc(collection(db, 'movimientos'));
          batch.set(movimientoRef, {
            id: movimientoRef.id,
            tipo: 'RECEPCION_ORDEN_COMPRA',
            producto_id: productoRecepcion.productoId,
            producto_nombre: productoRecepcion.productoNombre,
            codigo_producto: productoRecepcion.codigoProducto || '',
            disciplina: 'RECEPCION',
            fabricante: productoRecepcion.fabricante || '',
            cantidad: productoRecepcion.cantidadRecibida,
            unidad: productoRecepcion.unidadMedida,
            stock_anterior: productoRecepcion.stockActual || 0,
            stock_nuevo: nuevoStock,
            numero_lote: productoRecepcion.numeroLote || 'N/A',
            fecha_vencimiento: productoRecepcion.fechaVencimiento || 'N/A',
            orden_compra: ordenSeleccionada!.numero,
            factura: numeroFactura.trim() || 'N/A',
            proveedor: ordenSeleccionada!.proveedor,
            usuario: usuarioActual.nombre,
            observaciones: productoRecepcion.observaciones || `Recepción de orden ${ordenSeleccionada!.numero}`,
            created_at: serverTimestamp(),
            fecha: ahora,
            fecha_recepcion: new Date(fechaRecepcion),
            precio_unitario: productoRecepcion.precioUnitario,
            total: productoRecepcion.cantidadRecibida * productoRecepcion.precioUnitario
          });
        }
      }
      
      // 3. Registrar en historial
      const historialRef = doc(collection(db, 'historial'));
      batch.set(historialRef, {
        tipo: 'orden_recibida',
        ordenCompraId: ordenSeleccionada!.id,
        ordenCompraNumero: ordenSeleccionada!.numero,
        solicitudId: ordenSeleccionada!.solicitudId,
        solicitudNumero: ordenSeleccionada!.solicitudNumero,
        fecha: ahora,
        usuario: usuarioActual.nombre,
        detalles: `Orden ${ordenSeleccionada!.numero} recibida con ${recepcionProductos.filter(p => p.cantidadRecibida > 0).length} productos`,
        proveedor: ordenSeleccionada!.proveedor,
        factura: numeroFactura.trim() || '',
        observaciones: observacionesGenerales.trim() || '',
        productos: recepcionProductos.filter(p => p.cantidadRecibida > 0).map(p => ({
          nombre: p.productoNombre,
          cantidadOrdenada: p.cantidadOrdenada,
          cantidadRecibida: p.cantidadRecibida,
          lote: p.numeroLote
        }))
      });
      
      // Ejecutar batch
      await batch.commit();
      
      toast.success(`Orden ${ordenSeleccionada!.numero} recibida exitosamente`);
      
      // Cerrar modales y recargar datos
      setMostrarFormularioRecepcion(false);
      setMostrarDetalleOrden(false);
      setOrdenSeleccionada(null);
      resetFormularioRecepcion();
      
      // Recargar órdenes pendientes
      setTimeout(() => {
        cargarOrdenesPendientes();
      }, 1000);
      
    } catch (error: any) {
      console.error('Error registrando recepción:', error);
      toast.error(`Error al registrar la recepción: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // Resetear formulario de recepción
  const resetFormularioRecepcion = () => {
    setRecepcionProductos([]);
    setFechaRecepcion(new Date().toISOString().split('T')[0]);
    setNumeroFactura('');
    setObservacionesGenerales('');
  };

  // Calcular totales de recepción
  const calcularTotalesRecepcion = () => {
    return recepcionProductos.reduce((totales, producto) => ({
      cantidadOrdenada: totales.cantidadOrdenada + producto.cantidadOrdenada,
      cantidadRecibida: totales.cantidadRecibida + producto.cantidadRecibida,
      diferenciaTotal: totales.diferenciaTotal + producto.diferencia,
      valorTotal: totales.valorTotal + (producto.cantidadRecibida * producto.precioUnitario),
      productosConRecepcion: totales.productosConRecepcion + (producto.cantidadRecibida > 0 ? 1 : 0)
    }), {
      cantidadOrdenada: 0,
      cantidadRecibida: 0,
      diferenciaTotal: 0,
      valorTotal: 0,
      productosConRecepcion: 0
    });
  };

  // Modal de detalles de orden
  const DetalleOrdenModal = () => {
    if (!ordenSeleccionada) return null;

    const convertirFecha = (fecha: any): Date => {
      if (!fecha) return new Date();
      if (fecha.toDate && typeof fecha.toDate === 'function') {
        return fecha.toDate();
      }
      if (fecha.seconds && fecha.nanoseconds) {
        return new Date(fecha.seconds * 1000 + fecha.nanoseconds / 1000000);
      }
      return new Date(fecha);
    };

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
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {ordenSeleccionada.estado}
                  </span>
                </div>
                <div className="mt-2 text-sm text-blue-600">
                  <strong>Solicitud origen:</strong> {ordenSeleccionada.solicitudNumero}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarDetalleOrden(false)}
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
                  <div><span className="font-medium">Creada por:</span> {ordenSeleccionada.creadaPor}</div>
                  <div><span className="font-medium">Proveedor:</span> {ordenSeleccionada.proveedor}</div>
                  <div><span className="font-medium">Observaciones:</span> {ordenSeleccionada.observaciones || 'Ninguna'}</div>
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
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Productos ({ordenSeleccionada.productos.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
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
                          <div className="text-xs text-gray-500">{producto.unidad_medida}</div>
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
            <div className="flex justify-between items-center">
              <button
                onClick={() => setMostrarDetalleOrden(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMostrarDetalleOrden(false);
                    iniciarRecepcion(ordenSeleccionada);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Iniciar Recepción
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal de formulario de recepción
  const FormularioRecepcionModal = () => {
    if (!ordenSeleccionada || !mostrarFormularioRecepcion) return null;

    const totales = calcularTotalesRecepcion();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Recepción de Orden: {ordenSeleccionada.numero}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    {ordenSeleccionada.proveedor}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Fecha recepción: {fechaRecepcion}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMostrarFormularioRecepcion(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {/* Información de recepción */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Factura
                </label>
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="FAC-2024-001"
                  className="w-full p-2 border rounded"
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
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recibido por
                </label>
                <input
                  type="text"
                  value={usuarioActual.nombre}
                  readOnly
                  className="w-full p-2 border rounded bg-gray-50"
                />
              </div>
            </div>

            {/* Tabla de productos para recepción */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-4">Productos a Recepcionar</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cant. Ordenada</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">Cant. Recibida</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-yellow-50">Diferencia</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">Número de Lote</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-red-50">Fecha Vencimiento</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recepcionProductos.map((producto) => (
                      <tr key={producto.productoId} className="hover:bg-gray-50">
                        {/* Producto */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{producto.productoNombre}</div>
                          <div className="text-xs text-gray-500">
                            {producto.codigoProducto} • {producto.unidadMedida}
                          </div>
                          {producto.fabricante && (
                            <div className="text-xs text-gray-500">Fab: {producto.fabricante}</div>
                          )}
                        </td>

                        {/* Cantidad Ordenada */}
                        <td className="px-4 py-3 text-center">
                          <div className="font-medium">{producto.cantidadOrdenada}</div>
                        </td>

                        {/* Cantidad Recibida */}
                        <td className="px-4 py-3 text-center bg-green-50">
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              onClick={() => ajustarCantidadRecibida(producto.productoId, -1)}
                              className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={producto.cantidadRecibida}
                              onChange={(e) => actualizarRecepcionProducto(producto.productoId, 'cantidadRecibida', parseInt(e.target.value) || 0)}
                              className="w-16 p-1 text-center border rounded bg-white"
                            />
                            <button 
                              onClick={() => ajustarCantidadRecibida(producto.productoId, 1)}
                              className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Diferencia */}
                        <td className="px-4 py-3 text-center bg-yellow-50">
                          <div className={`font-medium ${
                            producto.diferencia === 0 ? 'text-gray-600' :
                            producto.diferencia > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {producto.diferencia > 0 ? '+' : ''}{producto.diferencia}
                          </div>
                        </td>

                        {/* Número de Lote */}
                        <td className="px-4 py-3 text-center bg-blue-50">
                          <input
                            type="text"
                            value={producto.numeroLote}
                            onChange={(e) => actualizarRecepcionProducto(producto.productoId, 'numeroLote', e.target.value)}
                            placeholder="Lote-001"
                            className="w-full p-1 text-center border rounded bg-white"
                            required={producto.cantidadRecibida > 0}
                          />
                        </td>

                        {/* Fecha Vencimiento */}
                        <td className="px-4 py-3 text-center bg-red-50">
                          <input
                            type="date"
                            value={producto.fechaVencimiento}
                            onChange={(e) => actualizarRecepcionProducto(producto.productoId, 'fechaVencimiento', e.target.value)}
                            className="w-full p-1 text-center border rounded bg-white"
                          />
                        </td>

                        {/* Observaciones */}
                        <td className="px-4 py-3 text-center bg-purple-50">
                          <input
                            type="text"
                            value={producto.observaciones}
                            onChange={(e) => actualizarRecepcionProducto(producto.productoId, 'observaciones', e.target.value)}
                            placeholder="Observaciones..."
                            className="w-full p-1 text-center border rounded bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totales */}
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-800">TOTALES</td>
                      <td className="px-4 py-3 text-center font-bold">{totales.cantidadOrdenada}</td>
                      <td className="px-4 py-3 text-center font-bold bg-green-50">{totales.cantidadRecibida}</td>
                      <td className={`px-4 py-3 text-center font-bold bg-yellow-50 ${
                        totales.diferenciaTotal === 0 ? 'text-gray-600' :
                        totales.diferenciaTotal > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {totales.diferenciaTotal > 0 ? '+' : ''}{totales.diferenciaTotal}
                      </td>
                      <td className="px-4 py-3 text-center bg-blue-50">
                        {recepcionProductos.filter(p => p.numeroLote.trim() !== '').length} con lote
                      </td>
                      <td className="px-4 py-3 text-center bg-red-50">-</td>
                      <td className="px-4 py-3 text-center bg-purple-50">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Observaciones generales */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones Generales de la Recepción
              </label>
              <textarea
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                placeholder="Observaciones sobre la recepción, condiciones del producto, etc..."
                className="w-full p-3 border rounded min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Resumen */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Resumen de la Recepción
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-amber-100 rounded-lg">
                  <div className="text-sm text-amber-700">Productos a recibir</div>
                  <div className="text-2xl font-bold text-amber-800">{ordenSeleccionada.productos.length}</div>
                </div>
                <div className="text-center p-3 bg-green-100 rounded-lg">
                  <div className="text-sm text-green-700">Productos con recepción</div>
                  <div className="text-2xl font-bold text-green-800">{totales.productosConRecepcion}</div>
                </div>
                <div className="text-center p-3 bg-blue-100 rounded-lg">
                  <div className="text-sm text-blue-700">Cantidad recibida</div>
                  <div className="text-2xl font-bold text-blue-800">{totales.cantidadRecibida}</div>
                </div>
                <div className="text-center p-3 bg-purple-100 rounded-lg">
                  <div className="text-sm text-purple-700">Valor recibido</div>
                  <div className="text-2xl font-bold text-purple-800">${totales.valorTotal.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <button
                  onClick={() => resetFormularioRecepcion()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar
                </button>
                <button
                  onClick={() => setMostrarFormularioRecepcion(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={registrarRecepcion}
                  disabled={procesando || totales.productosConRecepcion === 0}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2 disabled:opacity-50"
                >
                  {procesando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Registrar Recepción ({totales.productosConRecepcion})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando órdenes pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Recepción de Órdenes de Compra</h1>
        <p className="text-gray-600">Registra la recepción de productos de órdenes de compra pendientes</p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Órdenes</p>
              <p className="text-2xl font-bold text-gray-800">{ordenesPendientes.length}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Generadas</p>
              <p className="text-2xl font-bold text-blue-600">
                {ordenesPendientes.filter(o => o.estado === 'generada').length}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enviadas</p>
              <p className="text-2xl font-bold text-purple-600">
                {ordenesPendientes.filter(o => o.estado === 'enviada').length}
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold text-green-600">
                {ordenesPendientes.reduce((sum, orden) => sum + orden.productos.length, 0)}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de órdenes pendientes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Órdenes Pendientes de Recepción</h2>
              <p className="text-sm text-gray-600">Haz clic en "Recibir" para registrar la recepción de productos</p>
            </div>
            <button
              onClick={cargarOrdenesPendientes}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>

        {ordenesPendientes.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay órdenes pendientes</h3>
            <p className="mt-1 text-sm text-gray-500">Todas las órdenes han sido recibidas.</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordenesPendientes.map((orden) => (
                  <tr key={orden.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{orden.numero}</div>
                      <div className="text-xs text-gray-500">Solicitud: {orden.solicitudNumero}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(orden.fecha.seconds * 1000).toLocaleDateString()}
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
                      <div className="text-lg font-bold text-blue-600">
                        ${orden.total.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        orden.estado === 'generada' ? 'bg-blue-100 text-blue-800' :
                        orden.estado === 'enviada' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {orden.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => verDetallesOrden(orden)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center gap-1"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                          Detalles
                        </button>
                        <button
                          onClick={() => iniciarRecepcion(orden)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm flex items-center gap-1"
                          title="Iniciar recepción"
                        >
                          <CheckCircle className="w-4 h-4" />
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

      {/* Modal de detalles de orden */}
      <DetalleOrdenModal />

      {/* Modal de formulario de recepción */}
      <FormularioRecepcionModal />
    </div>
  );
}

