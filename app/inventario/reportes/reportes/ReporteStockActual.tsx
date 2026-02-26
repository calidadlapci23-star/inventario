'use client';

import { useState, useEffect } from 'react';
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
  writeBatch
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
  Eye
} from 'lucide-react';

// Interfaces principales
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
}

interface Solicitud {
  id: string;
  numero: string;
  fecha: Timestamp;
  productos: ProductoSolicitud[];
  estado: 'pendiente' | 'parcial' | 'aprobada' | 'rechazada' | 'procesada';
  solicitante: string;
  departamento: string;
  aprobador?: string;
  fechaAprobacion?: Timestamp;
  comentarios: string;
  totalProductos: number;
  totalUnidadesSolicitadas: number;
  totalUnidadesAprobadas?: number;
  ordenesCompra?: string[];
}

interface OrdenCompra {
  id: string;
  numero: string;
  fecha: Timestamp;
  solicitudId: string;
  solicitudNumero: string;
  proveedor: string;
  proveedor_id?: string;
  productos: Array<{
    productoId: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    unidad_medida: string;
    estado: string;
  }>;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'pendiente' | 'generada' | 'enviada' | 'recibida' | 'cancelada';
  fechaEntrega?: Timestamp;
  observaciones?: string;
  creadaPor: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

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
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<'productos' | 'solicitudes' | 'ordenes'>('productos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error' | 'info', texto: string, detalle?: string } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<Solicitud | null>(null);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenCompra | null>(null);
  const [mostrarDetalleSolicitud, setMostrarDetalleSolicitud] = useState(false);
  const [mostrarDetalleOrden, setMostrarDetalleOrden] = useState(false);

  // Usuario actual
  const usuarioActual = {
    id: 'user_001',
    nombre: 'Ana López',
    departamento: 'Laboratorio Clínico',
    rol: 'aprobador'
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
            fabricante: data.fabricante || ''
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
          direccion: doc.data().direccion || ''
        } as Proveedor));
        setProveedores(proveedoresData);
        
        // Cargar solicitudes
        const solicitudesRef = collection(db, 'solicitudes');
        const qSolicitudes = query(solicitudesRef, orderBy('fecha', 'desc'), limit(50));
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
              comentario: p.comentario || ''
            })) as ProductoSolicitud[],
            estado: data.estado || 'pendiente',
            solicitante: data.solicitante || 'Usuario desconocido',
            departamento: data.departamento || 'Sin departamento',
            aprobador: data.aprobador || '',
            fechaAprobacion: data.fechaAprobacion || null,
            comentarios: data.comentarios || '',
            totalProductos: Number(data.totalProductos) || 0,
            totalUnidadesSolicitadas: Number(data.totalUnidadesSolicitadas) || 0,
            totalUnidadesAprobadas: Number(data.totalUnidadesAprobadas) || 0,
            ordenesCompra: data.ordenesCompra || []
          } as Solicitud;
        });
        setSolicitudes(solicitudesData);
        
        // Cargar órdenes de compra
        const ordenesRef = collection(db, 'ordenes_compra');
        const qOrdenes = query(ordenesRef, orderBy('fecha', 'desc'), limit(50));
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
              productoId: p.productoId || '',
              nombre: p.nombre || 'Sin nombre',
              cantidad: Number(p.cantidad) || 0,
              precioUnitario: Number(p.precioUnitario) || 0,
              subtotal: Number(p.subtotal) || 0,
              unidad_medida: p.unidad_medida || 'unidades',
              estado: p.estado || 'pendiente'
            })),
            subtotal: Number(data.subtotal) || 0,
            iva: Number(data.iva) || 0,
            total: Number(data.total) || 0,
            estado: data.estado || 'pendiente',
            fechaEntrega: data.fechaEntrega || null,
            observaciones: data.observaciones || '',
            creadaPor: data.creadaPor || 'Sistema'
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
      
      // Preparar productos de la solicitud con valores por defecto
      const productosSolicitud: ProductoSolicitud[] = carrito.map(item => ({
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
        comentario: ''
      }));

      // Obtener el último número de solicitud
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

      // Generar nuevo número
      const match = ultimoNumero.match(/SOL-(\d+)/);
      const numeroActual = match ? parseInt(match[1]) : 0;
      const nuevoNumero = `SOL-${(numeroActual + 1).toString().padStart(5, '0')}`;

      // Crear objeto de solicitud con valores por defecto
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
        aprobador: '',
        fechaAprobacion: null,
        ordenesCompra: [],
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now()
      };

      // Validar que no haya valores undefined
      const solicitudValidada = JSON.parse(JSON.stringify(nuevaSolicitud));

      // Guardar en Firestore
      const solicitudesRef = collection(db, 'solicitudes');
      const docRef = await addDoc(solicitudesRef, solicitudValidada);

      // Guardar en historial
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
          proveedor: p.proveedor
        }))
      });

      // Crear solicitud para estado local
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
        totalUnidadesAprobadas: 0
      };

      // Actualizar estado local
      setSolicitudes(prev => [solicitudLocal, ...prev]);
      setCarrito([]);
      setComentarioSolicitud('');
      
      mostrarMensaje('exito', `Solicitud ${nuevoNumero} creada exitosamente`);
      
      // Cambiar a la pestaña de solicitudes
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

  // Función para aprobar/rechazar producto individual
  const procesarProductoSolicitud = async (solicitudId: string, productoId: string, aprobar: boolean, cantidadAprobada?: number, comentario?: string) => {
    try {
      const solicitud = solicitudes.find(s => s.id === solicitudId);
      if (!solicitud) return;

      // Actualizar el producto específico en el array
      const productosActualizados = solicitud.productos.map(p => {
        if (p.productoId === productoId) {
          return {
            ...p,
            estado: aprobar ? 'aprobado' : 'rechazado',
            cantidadAprobada: aprobar ? (cantidadAprobada || p.cantidadSolicitada) : 0,
            comentario: comentario || ''
          };
        }
        return p;
      });

      // Calcular estadísticas actualizadas
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

      // Preparar datos para actualizar
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

      // Validar que no haya valores undefined
      const datosValidados = JSON.parse(JSON.stringify(datosActualizacion));

      // Actualizar en Firestore
      const solicitudRef = doc(db, 'solicitudes', solicitudId);
      await updateDoc(solicitudRef, datosValidados);

      // Registrar en historial
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
          comentario: comentario || ''
        });
      }

      // Actualizar estado local
      setSolicitudes(prev => prev.map(s => 
        s.id === solicitudId 
          ? { 
              ...s, 
              productos: productosActualizados,
              estado: nuevoEstado,
              totalUnidadesAprobadas,
              ...(nuevoEstado === 'aprobada' && {
                aprobador: usuarioActual.nombre,
                fechaAprobacion: Timestamp.now()
              })
            }
          : s
      ));

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

      // Agrupar productos por proveedor
      const productosAprobados = solicitud.productos.filter(p => p.estado === 'aprobado');
      const productosPorProveedor: { [key: string]: ProductoSolicitud[] } = {};
      
      productosAprobados.forEach(producto => {
        const proveedorKey = producto.proveedor_id || producto.proveedor;
        if (!productosPorProveedor[proveedorKey]) {
          productosPorProveedor[proveedorKey] = [];
        }
        productosPorProveedor[proveedorKey].push(producto);
      });

      // Generar una orden por cada proveedor
      const ordenesGeneradas: OrdenCompra[] = [];
      const ordenIds: string[] = [];
      
      for (const [proveedorKey, productos] of Object.entries(productosPorProveedor)) {
        // Obtener información del proveedor
        const proveedorInfo = proveedores.find(p => p.id === proveedorKey) || 
                            proveedores.find(p => p.nombre === proveedorKey);
        
        // Obtener último número de orden
        let ultimoNumero = 'OC-00000';
        try {
          const ordenesRef = collection(db, 'ordenes_compra');
          const q = query(ordenesRef, orderBy('numero', 'desc'), limit(1));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const ultimaOrden = snapshot.docs[0].data();
            ultimoNumero = ultimaOrden.numero || 'OC-00000';
          }
        } catch (error) {
          console.warn('No se pudo obtener el último número de orden');
        }

        // Generar nuevo número
        const match = ultimoNumero.match(/OC-(\d+)/);
        const numeroActual = match ? parseInt(match[1]) : 0;
        const nuevoNumero = `OC-${(numeroActual + 1).toString().padStart(5, '0')}`;

        // Preparar productos para la orden
        const productosOrden = productos.map(producto => {
          const precioUnitario = producto.precio_unitario || 0;
          const cantidad = producto.cantidadAprobada || producto.cantidadSolicitada || 0;
          const subtotal = precioUnitario * cantidad;
          return {
            productoId: producto.productoId || '',
            nombre: producto.nombre || 'Sin nombre',
            cantidad: cantidad,
            precioUnitario: precioUnitario,
            subtotal: subtotal,
            unidad_medida: producto.unidad_medida || 'unidades',
            estado: 'pendiente'
          };
        });

        // Calcular totales
        const subtotal = productosOrden.reduce((sum, prod) => sum + (prod.subtotal || 0), 0);
        const iva = subtotal * 0.19;
        const total = subtotal + iva;

        // Crear orden de compra con valores por defecto
        const nuevaOrden = {
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
          observaciones: `Generada desde solicitud ${solicitud.numero}`,
          creadaPor: usuarioActual.nombre,
          creadoEn: Timestamp.now(),
          fechaEntrega: null
        };

        // Validar datos
        const ordenValidada = JSON.parse(JSON.stringify(nuevaOrden));

        // Guardar en Firestore
        const ordenesRef = collection(db, 'ordenes_compra');
        const docRef = await addDoc(ordenesRef, ordenValidada);
        ordenIds.push(docRef.id);

        // Crear orden para estado local
        const ordenLocal: OrdenCompra = {
          id: docRef.id,
          ...nuevaOrden
        };
        ordenesGeneradas.push(ordenLocal);

        // Registrar en historial
        await addDoc(collection(db, 'historial'), {
          tipo: 'orden_generada',
          ordenCompraId: docRef.id,
          ordenCompraNumero: nuevoNumero,
          solicitudId,
          solicitudNumero: solicitud.numero,
          fecha: Timestamp.now(),
          usuario: usuarioActual.nombre,
          detalles: `Orden ${nuevoNumero} generada para ${productos.length} productos`,
          proveedor: nuevaOrden.proveedor,
          total: total
        });
      }

      // Actualizar solicitud con IDs de órdenes generadas
      const solicitudRef = doc(db, 'solicitudes', solicitudId);
      await updateDoc(solicitudRef, {
        ordenesCompra: [...(solicitud.ordenesCompra || []), ...ordenIds],
        estado: 'procesada',
        actualizadoEn: Timestamp.now()
      });

      // Actualizar estados locales
      setOrdenesCompra(prev => [...ordenesGeneradas, ...prev]);
      setSolicitudes(prev => prev.map(s => 
        s.id === solicitudId 
          ? { 
              ...s, 
              ordenesCompra: [...(s.ordenesCompra || []), ...ordenIds],
              estado: 'procesada'
            }
          : s
      ));

      mostrarMensaje('exito', `Se generaron ${ordenesGeneradas.length} órdenes de compra`);

    } catch (error: any) {
      console.error('Error al generar órdenes:', error);
      mostrarMensaje('error', 'Error al generar las órdenes de compra', error.message);
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

  const solicitudesFiltradas = filtroEstado === 'todos' 
    ? solicitudes 
    : solicitudes.filter(s => s.estado === filtroEstado);

  const ordenesFiltradas = filtroEstado === 'todos'
    ? ordenesCompra
    : ordenesCompra.filter(o => o.estado === filtroEstado);

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
        <p className="text-gray-600">Sistema completo de solicitudes y órdenes de compra</p>
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
            {solicitudes.filter(s => s.estado === 'pendiente').length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {solicitudes.filter(s => s.estado === 'pendiente').length} pendientes
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
            {carrito.map(item => (
              <div key={item.producto.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                <div className="truncate flex-1 mr-2">
                  <div className="font-medium">{item.producto.nombre}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {item.producto.proveedor}
                  </div>
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
            ))}
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

      {/* Modal de Detalle de Solicitud */}
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
                      {solicitudSeleccionada.fecha.toDate().toLocaleDateString()} {solicitudSeleccionada.fecha.toDate().toLocaleTimeString()}
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
                </div>
                <button
                  onClick={() => setMostrarDetalleSolicitud(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
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
                  {solicitudSeleccionada.productos.map((producto, index) => (
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
                  ))}
                </div>
              )}
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
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {solicitudSeleccionada.estado === 'aprobada' && !solicitudSeleccionada.ordenesCompra?.length && (
                    <button
                      onClick={() => {
                        generarOrdenesPorProveedor(solicitudSeleccionada.id);
                        setMostrarDetalleSolicitud(false);
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Generar Órdenes por Proveedor
                    </button>
                  )}
                  <button
                    onClick={() => setMostrarDetalleSolicitud(false)}
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
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProductos.map(producto => {
                      const enCarrito = carrito.find(item => item.producto.id === producto.id);
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
              </select>
            </div>
            
            <div className="text-sm text-gray-600">
              Mostrando {solicitudesFiltradas.length} de {solicitudes.length} solicitudes
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
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {solicitud.fecha.toDate().toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {solicitud.fecha.toDate().toLocaleTimeString()}
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
                              'bg-purple-100 text-purple-800'
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
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-600">
              {ordenesCompra.length > 0 && (
                <span>Total: ${ordenesCompra.reduce((sum, o) => sum + o.total, 0).toLocaleString()}</span>
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
                        Número
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
                        Solicitud
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
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {orden.fecha.toDate().toLocaleDateString()}
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
                          <div className="text-sm text-gray-900">{orden.solicitudNumero}</div>
                          <div className="text-xs text-gray-500">Creada por: {orden.creadaPor}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            orden.estado === 'generada' ? 'bg-blue-100 text-blue-800' :
                            orden.estado === 'enviada' ? 'bg-purple-100 text-purple-800' :
                            orden.estado === 'recibida' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {orden.estado}
                          </span>
                          {orden.fechaEntrega && (
                            <div className="text-xs text-gray-500 mt-1">
                              Recibida: {orden.fechaEntrega.toDate().toLocaleDateString()}
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
    </div>
  );
};

export default ReporteStockActual;