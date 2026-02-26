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
  getDoc,
  addDoc
} from 'firebase/firestore';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Plus, 
  Minus, 
  RotateCcw, 
  Calendar,
  Building,
  FileText,
  Eye,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  ClipboardCheck,
  Bug,
  Percent,
  PackageCheck,
  Clock,
  CalendarDays,
  ShieldCheck,
  Star,
  Calculator,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';

// Interfaces actualizadas
interface ProductoOrden {
  id: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad_medida: string;
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
  estado: string;
  fechaEntrega?: Timestamp;
  observaciones: string;
  creadaPor: string;
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
}

// Interface para la evaluación
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

export default function RecepcionOrdenesCompra() {
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenCompra[]>([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenCompra | null>(null);
  const [mostrarDetalleOrden, setMostrarDetalleOrden] = useState(false);
  const [mostrarFormularioRecepcion, setMostrarFormularioRecepcion] = useState(false);
  const [recepcionProductos, setRecepcionProductos] = useState<RecepcionProducto[]>([]);
  
  const [fechaRecepcion, setFechaRecepcion] = useState(new Date().toISOString().split('T')[0]);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [usuarioActual] = useState({
    id: 'user_001',
    nombre: 'Ana López',
    departamento: 'Recepcion'
  });

  // Estado para la evaluación
  const [evaluacion, setEvaluacion] = useState<EvaluacionProveedor>({
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

  // Cargar órdenes pendientes de recepción
  useEffect(() => {
    cargarOrdenesPendientes();
  }, []);

  // Función para calcular el % de productos totales automáticamente
  const calcularProductosTotalesAuto = () => {
    if (recepcionProductos.length === 0) return '≤50%';
    
    const totalOrdenado = recepcionProductos.reduce((sum, item) => sum + item.cantidadOrdenada, 0);
    const totalRecibido = recepcionProductos.reduce((sum, item) => sum + item.cantidadRecibida, 0);
    const porcentajeRecibido = totalOrdenado > 0 ? (totalRecibido / totalOrdenado) * 100 : 0;
    
    if (porcentajeRecibido === 100) {
      return '100%';
    } else if (porcentajeRecibido >= 80) {
      return '≥80%';
    } else {
      return '≤50%';
    }
  };

  // Actualizar automáticamente productosTotales cuando cambien las cantidades recibidas
  useEffect(() => {
    if (mostrarFormularioRecepcion && recepcionProductos.length > 0) {
      const productosTotalesCalculado = calcularProductosTotalesAuto();
      setEvaluacion(prev => ({
        ...prev,
        productosTotales: productosTotalesCalculado
      }));
    }
  }, [recepcionProductos, mostrarFormularioRecepcion]);

  const cargarOrdenesPendientes = async () => {
    try {
      setLoading(true);
      
      console.log('Iniciando carga de órdenes pendientes...');
      
      const ordenesRef = collection(db, 'ordenes_compra');
      const q = query(ordenesRef, orderBy('fecha', 'desc'));
      
      const snapshot = await getDocs(q);
      
      const todasLasOrdenes: OrdenCompra[] = [];
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        
        const orden = {
          id: doc.id,
          numero: data.numero || `OC-${doc.id.substring(0, 8)}`,
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
        
        todasLasOrdenes.push(orden);
      });
      
      const ordenesGeneradas = todasLasOrdenes.filter(orden => 
        orden.estado === 'generada'
      );
      
      setOrdenesPendientes(ordenesGeneradas);
      
    } catch (error: any) {
      console.error('Error cargando órdenes pendientes:', error);
      toast.error(`Error al cargar las órdenes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para depurar DETALLADA
  const depurarOrdenes = async () => {
    try {
      console.clear();
      console.log('=== DEPURACIÓN DETALLADA DE ÓRDENES DE COMPRA ===');
      
      const ordenesRef = collection(db, 'ordenes_compra');
      const snapshot = await getDocs(ordenesRef);
      
      console.log(`\n📦 COLECCIÓN: ordenes_compra`);
      console.log(`📊 Total documentos: ${snapshot.docs.length}`);
      
      if (snapshot.docs.length === 0) {
        console.log('❌ No hay documentos en la colección ordenes_compra');
        toast.error('No hay documentos en ordenes_compra');
        return;
      }
      
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n--- DOCUMENTO ${index + 1}: ${doc.id} ---`);
        console.log(`📄 ID: ${doc.id}`);
        console.log(`🔢 Número: ${data.numero || 'No tiene'}`);
        console.log(`🏷️  Estado: "${data.estado || 'No tiene estado'}"`);
        console.log(`🏢 Proveedor: ${data.proveedor || 'No tiene'}`);
        console.log(`📦 Productos: ${Array.isArray(data.productos) ? data.productos.length : 'No es array'}`);
        console.log(`💰 Total: $${data.total || 0}`);
        console.log(`📅 Fecha: ${data.fecha?.toDate?.() || 'No tiene fecha'}`);
        console.log(`👤 Creada por: ${data.creadaPor || 'No tiene'}`);
        
        console.log('📋 Estructura completa:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      });
      
      const estados: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const estado = doc.data().estado || 'sin-estado';
        estados[estado] = (estados[estado] || 0) + 1;
      });
      
      console.log('\n📊 RESUMEN POR ESTADO:');
      Object.entries(estados).forEach(([estado, count]) => {
        console.log(`  ${estado}: ${count} órdenes`);
      });
      
      const ordenesDelUsuario = snapshot.docs.filter(doc => 
        doc.data().creadaPor?.includes('Ana')
      );
      console.log(`\n👤 Órdenes de Ana López: ${ordenesDelUsuario.length}`);
      
      toast.success(`Depuración completada. Ver consola. ${snapshot.docs.length} documentos encontrados.`);
      
    } catch (error: any) {
      console.error('Error en depuración:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Función para calcular puntuación SIN actualizar el estado
  const calcularPuntuacionActual = () => {
    let puntuacion = 0;
    
    // Productos Totales
    switch(evaluacion.productosTotales) {
      case '100%': puntuacion += 2; break;
      case '≥80%': puntuacion += 1; break;
      case '≤50%': puntuacion += 0; break;
      case '': puntuacion += 0; break;
    }
    
    // Presentación
    switch(evaluacion.presentacion) {
      case 'Conforme': puntuacion += 2; break;
      case 'No Conforme': puntuacion += 0; break;
      case '': puntuacion += 0; break;
    }
    
    // Caducidad
    switch(evaluacion.caducidad) {
      case '≥1 año': puntuacion += 2; break;
      case '≥6 meses': puntuacion += 1; break;
      case '≥1 mes': puntuacion += 0; break;
      case 'Por Caducar': puntuacion += 0; break;
      case '': puntuacion += 0; break;
    }
    
    // Integridad del Producto
    switch(evaluacion.integridadProducto) {
      case 'Conforme': puntuacion += 2; break;
      case 'No Conforme': puntuacion += 0; break;
      case '': puntuacion += 0; break;
    }
    
    // Tiempo de Entrega
    switch(evaluacion.tiempoEntrega) {
      case 'Mismo día': puntuacion += 2; break;
      case '2 días': puntuacion += 1; break;
      case '3 días': puntuacion += 0; break;
      case '': puntuacion += 0; break;
    }
    
    const porcentaje = (puntuacion / 10) * 100;
    
    return { puntuacion, porcentaje };
  };

  // Función para calcular puntuación Y actualizar el estado
  const calcularPuntuacion = () => {
    const { puntuacion, porcentaje } = calcularPuntuacionActual();
    
    setEvaluacion(prev => ({
      ...prev,
      puntuacionTotal: puntuacion,
      porcentajeTotal: porcentaje
    }));
    
    return { puntuacion, porcentaje };
  };

  // Actualizar campo de evaluación
  const actualizarEvaluacion = (campo: keyof EvaluacionProveedor, valor: any) => {
    setEvaluacion(prev => ({
      ...prev,
      [campo]: valor
    }));
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
      
      // Reiniciar evaluación
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
      
      // Preparar datos de recepción para cada producto
      const productosRecepcion: RecepcionProducto[] = await Promise.all(
        orden.productos.map(async (producto) => {
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
            cantidadRecibida: producto.cantidad,
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
      
      // Calcular automáticamente productosTotales después de un breve delay
      setTimeout(() => {
        const productosTotalesCalculado = calcularProductosTotalesAuto();
        setEvaluacion(prev => ({
          ...prev,
          productosTotales: productosTotalesCalculado
        }));
      }, 100);
      
    } catch (error: any) {
      console.error('Error iniciando recepción:', error);
      toast.error('Error al preparar la recepción');
    }
  };

  // Actualizar recepción de producto
  const actualizarRecepcionProducto = (index: number, campo: string, valor: any) => {
    const nuevosProductos = [...recepcionProductos];
    nuevosProductos[index] = {
      ...nuevosProductos[index],
      [campo]: valor
    };
    
    if (campo === 'cantidadRecibida') {
      const cantidadOrdenada = nuevosProductos[index].cantidadOrdenada;
      nuevosProductos[index].diferencia = valor - cantidadOrdenada;
      nuevosProductos[index].nuevoStock = nuevosProductos[index].stockActual + valor;
    }
    
    setRecepcionProductos(nuevosProductos);
  };

  // Ajustar cantidad recibida
  const ajustarCantidadRecibida = (index: number, incremento: number) => {
    const nuevosProductos = [...recepcionProductos];
    const nuevaCantidad = nuevosProductos[index].cantidadRecibida + incremento;
    
    if (nuevaCantidad >= 0) {
      nuevosProductos[index].cantidadRecibida = nuevaCantidad;
      nuevosProductos[index].diferencia = nuevaCantidad - nuevosProductos[index].cantidadOrdenada;
      nuevosProductos[index].nuevoStock = nuevosProductos[index].stockActual + nuevaCantidad;
      setRecepcionProductos(nuevosProductos);
    }
  };

  // Reiniciar todas las cantidades a las ordenadas
  const reiniciarRecepcion = () => {
    const nuevosProductos = recepcionProductos.map(producto => ({
      ...producto,
      cantidadRecibida: producto.cantidadOrdenada,
      diferencia: 0,
      nuevoStock: producto.stockActual + producto.cantidadOrdenada
    }));
    
    setRecepcionProductos(nuevosProductos);
    toast.success('Cantidades reiniciadas a las ordenadas');
  };

  // Calcular resumen de recepción
  const calcularResumen = () => {
    const totalProductos = recepcionProductos.length;
    const productosConRecepcion = recepcionProductos.filter(p => p.cantidadRecibida > 0).length;
    const cantidadTotalRecibida = recepcionProductos.reduce((sum, p) => sum + p.cantidadRecibida, 0);
    const valorTotalRecibido = recepcionProductos.reduce((sum, p) => sum + (p.cantidadRecibida * p.precioUnitario), 0);
    const productosConLote = recepcionProductos.filter(p => p.numeroLote.trim() !== '').length;
    
    return {
      totalProductos,
      productosConRecepcion,
      cantidadTotalRecibida,
      valorTotalRecibido,
      productosConLote
    };
  };

  // Validar recepción
  const validarRecepcion = () => {
    if (!numeroFactura.trim()) {
      toast.error('El número de factura es obligatorio');
      return false;
    }

    const { porcentaje } = calcularPuntuacionActual();
    if (porcentaje < 80) {
      toast.error(`La evaluación del proveedor debe ser superior al 80% (Actual: ${porcentaje.toFixed(1)}%)`);
      return false;
    }

    if (!evaluacion.productosTotales || !evaluacion.presentacion || 
        !evaluacion.caducidad || !evaluacion.integridadProducto || !evaluacion.tiempoEntrega) {
      toast.error('Complete todos los campos de evaluación del proveedor');
      return false;
    }

    return true;
  };

  // Registrar recepción
  const registrarRecepcion = async () => {
    // Primero calcular la puntuación actual
    const { puntuacion, porcentaje } = calcularPuntuacionActual();
    
    if (!validarRecepcion() || !ordenSeleccionada) return;

    try {
      setProcesando(true);
      
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      
      // 1. Actualizar estado de la orden de compra
      const ordenRef = doc(db, 'ordenes_compra', ordenSeleccionada.id);
      batch.update(ordenRef, {
        estado: 'completada',
        fechaRecepcion: timestamp,
        numeroFactura: numeroFactura,
        recepcionCompletadaPor: usuarioActual.nombre
      });
      
      // 2. Registrar documento de recepción
      const recepcionRef = doc(collection(db, 'recepciones'));
      const recepcionData = {
        ordenCompraId: ordenSeleccionada.id,
        ordenCompraNumero: ordenSeleccionada.numero,
        fechaRecepcion: timestamp,
        numeroFactura: numeroFactura,
        productos: recepcionProductos,
        observaciones: observacionesGenerales,
        recibidoPor: usuarioActual.nombre,
        departamento: usuarioActual.departamento,
        fechaRegistro: timestamp,
        estado: 'completada'
      };
      batch.set(recepcionRef, recepcionData);
      
      // 3. Registrar evaluación del proveedor
      const evaluacionRef = doc(collection(db, 'evaluaciones_proveedores'));
      const evaluacionData = {
        ...evaluacion,
        fechaEvaluacion: timestamp,
        ordenCompraId: ordenSeleccionada.id,
        ordenCompraNumero: ordenSeleccionada.numero,
        proveedor: ordenSeleccionada.proveedor,
        proveedor_id: ordenSeleccionada.proveedor_id,
        puntuacionTotal: puntuacion,
        porcentajeTotal: porcentaje,
        evaluacionAprobada: porcentaje >= 80
      };
      batch.set(evaluacionRef, evaluacionData);
      
      // 4. Actualizar stock de cada producto
      for (const producto of recepcionProductos) {
        const productoRef = doc(db, 'productos', producto.productoId);
        const productoSnap = await getDoc(productoRef);
        
        if (productoSnap.exists()) {
          const currentStock = productoSnap.data().stock_actual || 0;
          const nuevoStock = currentStock + producto.cantidadRecibida;
          
          batch.update(productoRef, {
            stock_actual: nuevoStock,
            ultimaActualizacion: timestamp,
            ultimaRecepcion: {
              fecha: timestamp,
              cantidad: producto.cantidadRecibida,
              ordenCompra: ordenSeleccionada.numero
            }
          });
          
          // Registrar movimiento de inventario
          const movimientoRef = doc(collection(db, 'movimientos_inventario'));
          batch.set(movimientoRef, {
            productoId: producto.productoId,
            productoNombre: producto.productoNombre,
            tipo: 'recepcion',
            cantidad: producto.cantidadRecibida,
            stockAnterior: currentStock,
            stockNuevo: nuevoStock,
            referencia: ordenSeleccionada.numero,
            numeroFactura: numeroFactura,
            usuario: usuarioActual.nombre,
            fecha: timestamp,
            observaciones: `Recepción de orden ${ordenSeleccionada.numero}`
          });
        }
      }
      
      await batch.commit();
      
      toast.success(`Recepción registrada exitosamente. Evaluación: ${porcentaje.toFixed(1)}%`);
      
      setMostrarFormularioRecepcion(false);
      setOrdenSeleccionada(null);
      setRecepcionProductos([]);
      setNumeroFactura('');
      setObservacionesGenerales('');
      
      await cargarOrdenesPendientes();
      
    } catch (error: any) {
      console.error('Error registrando recepción:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // Componente del modal de recepción con evaluación
  const FormularioRecepcionModal = () => {
    if (!mostrarFormularioRecepcion || !ordenSeleccionada) return null;

    const { puntuacion, porcentaje } = calcularPuntuacionActual();
    const resumen = calcularResumen();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
              </div>
              <button
                onClick={() => setMostrarFormularioRecepcion(false)}
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

            {/* EVALUACIÓN DE INSUMOS - SOLO VISIBLE PARA LAPCI */}
            <div className="mb-8 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6" />
                  EVALUACIÓN DE INSUMOS, EQUIPOS Ó SERVICIOS (EXCLUSIVO LAPCI)
                </h3>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-blue-300">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-bold text-blue-700">
                    {puntuacion}/10 ({porcentaje.toFixed(1)}%)
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
              <div className={`p-3 rounded-lg ${porcentaje >= 80 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {porcentaje >= 80 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`font-semibold ${porcentaje >= 80 ? 'text-green-700' : 'text-red-700'}`}>
                      {porcentaje >= 80 ? '✓ EVALUACIÓN APROBADA' : '✗ EVALUACIÓN NO APROBADA'}
                    </span>
                  </div>
                  <span className={`text-sm ${porcentaje >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                    Mínimo requerido: 80% (Actual: {porcentaje.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Tabla de productos */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Productos a Recepcionar ({recepcionProductos.length})
              </h3>
              
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PRODUCTO</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CANT. ORDENADA</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CANT. RECIBIDA</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DIFERENCIA</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NÚMERO DE LOTE</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FECHA VENCIMIENTO</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OBSERVACIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recepcionProductos.map((producto, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{producto.productoNombre}</div>
                          <div className="text-xs text-gray-500">
                            {producto.codigoProducto} • {producto.unidadMedida}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{producto.cantidadOrdenada}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => ajustarCantidadRecibida(index, -1)}
                              className="p-1 rounded hover:bg-gray-200"
                              disabled={producto.cantidadRecibida <= 0}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={producto.cantidadRecibida}
                              onChange={(e) => actualizarRecepcionProducto(index, 'cantidadRecibida', parseInt(e.target.value) || 0)}
                              className="w-16 p-1 border border-gray-300 rounded text-center text-sm"
                            />
                            <button
                              onClick={() => ajustarCantidadRecibida(index, 1)}
                              className="p-1 rounded hover:bg-gray-200"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            producto.diferencia === 0 ? 'bg-green-100 text-green-800' :
                            producto.diferencia > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {producto.diferencia > 0 ? `+${producto.diferencia}` : producto.diferencia}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={producto.numeroLote}
                            onChange={(e) => actualizarRecepcionProducto(index, 'numeroLote', e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded text-sm"
                            placeholder="Lote-001"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={producto.fechaVencimiento}
                            onChange={(e) => actualizarRecepcionProducto(index, 'fechaVencimiento', e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={producto.observaciones}
                            onChange={(e) => actualizarRecepcionProducto(index, 'observaciones', e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded text-sm"
                            placeholder="Observaciones..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-3 font-medium">TOTALES</td>
                      <td className="px-4 py-3 font-medium">{resumen.totalProductos}</td>
                      <td className="px-4 py-3 font-medium">{resumen.cantidadTotalRecibida}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {recepcionProductos.reduce((sum, p) => sum + p.diferencia, 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{resumen.productosConLote} con lote</td>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">Productos a recibir</div>
                  <div className="text-2xl font-bold text-blue-600">{resumen.totalProductos}</div>
                </div>
                <div className="bg-white border rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">Productos con recepción</div>
                  <div className="text-2xl font-bold text-green-600">{resumen.productosConRecepcion}</div>
                </div>
                <div className="bg-white border rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">Cantidad recibida</div>
                  <div className="text-2xl font-bold text-purple-600">{resumen.cantidadTotalRecibida}</div>
                </div>
                <div className="bg-white border rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">Valor recibido</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    ${resumen.valorTotalRecibido.toLocaleString()}
                  </div>
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
                  disabled={procesando}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar
                </button>
                <button
                  onClick={() => setMostrarFormularioRecepcion(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={procesando}
                >
                  Cancelar
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const resultado = calcularPuntuacion();
                    toast.success(`Evaluación calculada: ${resultado.puntuacion}/10 (${resultado.porcentaje.toFixed(1)}%)`);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Calcular Evaluación
                </button>
                <button
                  onClick={registrarRecepcion}
                  disabled={procesando || porcentaje < 80}
                  className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                    procesando || porcentaje < 80
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  {procesando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Registrar Recepción ({resumen.productosConRecepcion})
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

  // Modal de detalles de orden (mantener igual)
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
                <h2 className="text-xl font-bold text-gray-800">Orden: {ordenSeleccionada.numero}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {convertirFecha(ordenSeleccionada.fecha).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    {ordenSeleccionada.proveedor}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800`}>
                    {ordenSeleccionada.estado}
                  </span>
                </div>
                <div className="mt-2 text-sm text-blue-600">
                  <strong>Solicitud:</strong> {ordenSeleccionada.solicitudNumero}
                </div>
              </div>
              <button
                onClick={() => setMostrarDetalleOrden(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
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

      {/* Botones de diagnóstico */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            cargarOrdenesPendientes();
            toast.success('Recargando...');
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Recargar
        </button>
        
        <button
          onClick={depurarOrdenes}
          className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-2"
        >
          <Bug className="w-4 h-4" />
          Depurar Firestore
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Órdenes Generadas</p>
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
              <p className="text-sm text-gray-600">Productos Pendientes</p>
              <p className="text-2xl font-bold text-blue-600">
                {ordenesPendientes.reduce((sum, orden) => sum + orden.productos.length, 0)}
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
              <p className="text-sm text-gray-600">Proveedores</p>
              <p className="text-2xl font-bold text-purple-600">
                {[...new Set(ordenesPendientes.map(o => o.proveedor))].length}
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-green-600">
                ${ordenesPendientes.reduce((sum, orden) => sum + orden.total, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de órdenes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Órdenes para Recepción</h2>
              <p className="text-sm text-gray-600">
                {ordenesPendientes.length === 0 
                  ? 'No hay órdenes con estado "generada"' 
                  : `Mostrando ${ordenesPendientes.length} órdenes pendientes`}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Actualizado: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {ordenesPendientes.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay órdenes para recepción</h3>
            <p className="mt-1 text-sm text-gray-500">
              Verifica que las órdenes se hayan generado correctamente en el sistema.
            </p>
            <div className="mt-4 space-x-3">
              <button
                onClick={depurarOrdenes}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Depurar Firestore
              </button>
              <button
                onClick={cargarOrdenesPendientes}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Recargar
              </button>
            </div>
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
                      <div className="text-xs text-blue-600">Solicitud: {orden.solicitudNumero}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {orden.fecha?.seconds ? new Date(orden.fecha.seconds * 1000).toLocaleDateString() : 'Sin fecha'}
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
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {orden.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => verDetallesOrden(orden)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                        <button
                          onClick={() => iniciarRecepcion(orden)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm flex items-center gap-1"
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

      {/* Modales */}
      {mostrarDetalleOrden && <DetalleOrdenModal />}
      {mostrarFormularioRecepcion && <FormularioRecepcionModal />}
    </div>
  );
}