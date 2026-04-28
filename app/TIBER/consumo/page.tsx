'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, orderBy, 
  writeBatch, doc, serverTimestamp, Timestamp,
  getDoc, limit
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { useAuth } from '../../context/AuthContext';
import { 
  Beaker, Microscope, Droplets, FlaskConical, Zap, 
  TestTube, Heart, Syringe, Package,
  Plus, Minus, Save, RotateCcw, Home, TrendingDown,
  Search, AlertCircle, Filter,
  Calendar, FileText, AlertTriangle,
  Shield, LogIn, Lock, Unlock,
  UserCheck, UserPlus, PackageCheck, PackageX,
  RefreshCw, CheckCircle, XCircle,
  Download,
  ArrowRightLeft
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
  alerta_minima: number;
  precio_unitario?: number;
  proveedor?: string;
  lote_actual?: string;
  fecha_vencimiento_actual?: string;
}

interface RegistroConsumo {
  productoId: string;
  productoNombre: string;
  unidad: string;
  stockActual: number;
  px: number;
  control: number;
  calibrador: number;
  merma: number;
  totalConsumo: number;
  nuevoStock: number;
  proveedor?: string;
  loteActual?: string;
  fechaVencimientoActual?: string;
  agotado: boolean;
  requiereNuevoLote: boolean;
  loteCerrado?: string;
  responsableCierre?: string;
  responsableApertura?: string;
  observacionesCierreApertura?: string;
  loteId?: string;
  cantidadActualLote?: number;
  datosCierreGuardados?: boolean;
  datosConfirmados?: boolean;
}

interface ModalCierreAperturaProps {
  isOpen: boolean;
  onClose: () => void;
  producto: RegistroConsumo;
  onConfirm: (data: {
    responsableCierre: string;
    responsableApertura: string;
    observaciones: string;
    guardarDatos: boolean;
  }) => void;
}

const TIBER_DISCIPLINAS = [
  { value: 'Química Clínica', label: 'Química Clínica', icon: FlaskConical },
  { value: 'Hematología', label: 'Hematología', icon: Heart },
  { value: 'Coagulación', label: 'Coagulación', icon: Syringe },
  { value: 'Pruebas Rápidas', label: 'Pruebas Rápidas', icon: Zap },
  { value: 'Toma de Muestra', label: 'Toma de Muestra', icon: Droplets },
];

function ModalCierreApertura({ isOpen, onClose, producto, onConfirm }: ModalCierreAperturaProps) {
  const [responsableCierre, setResponsableCierre] = useState('');
  const [responsableApertura, setResponsableApertura] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [mismoResponsable, setMismoResponsable] = useState(false);
  const [guardarDatos, setGuardarDatos] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mismoResponsable && responsableCierre) {
      setResponsableApertura(responsableCierre);
    }
  }, [mismoResponsable, responsableCierre]);

  const handleConfirm = () => {
    setError('');
    if (!responsableCierre.trim()) {
      setError('El responsable de cierre es requerido');
      return;
    }
    if (!responsableApertura.trim()) {
      setError('El responsable de apertura es requerido');
      return;
    }
    if (!guardarDatos) {
      setError('Debes marcar la casilla de confirmación');
      return;
    }
    onConfirm({
      responsableCierre,
      responsableApertura,
      observaciones,
      guardarDatos: true
    });
    setResponsableCierre('');
    setResponsableApertura('');
    setObservaciones('');
    setMismoResponsable(false);
    setGuardarDatos(false);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-red-100 to-green-100 rounded-lg">
              <PackageX className="w-6 h-6 text-red-600" />
              <PackageCheck className="w-6 h-6 text-green-600 -mt-4" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">CIERRE Y APERTURA DE LOTE - TIBER</h3>
              <p className="text-gray-600 text-sm">Lote agotado - Registre a los responsables</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-r from-red-50 to-amber-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <PackageX className="w-5 h-5 text-red-600" />
              Lote que se está cerrando
            </h4>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Producto:</span>
                <div className="font-medium text-gray-800">{producto.productoNombre}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-sm text-gray-500">Lote actual:</span>
                  <div className="font-bold text-red-700">{producto.loteActual || 'No registrado'}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Stock anterior:</span>
                  <div className="font-bold text-gray-800">{producto.stockActual}</div>
                </div>
              </div>
              {producto.fechaVencimientoActual && (
                <div>
                  <span className="text-sm text-gray-500">Vencimiento:</span>
                  <div className="font-medium">{producto.fechaVencimientoActual}</div>
                </div>
              )}
              <div className="mt-2 p-2 bg-red-100 rounded">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-bold text-red-700">
                    Este lote se agotará con el consumo registrado
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-green-600" />
              Próximo lote (de recepciones TIBER)
            </h4>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                El sistema buscará automáticamente el próximo lote disponible en recepciones TIBER.
              </div>
              <div className="p-3 bg-white/50 rounded border">
                <div className="text-sm text-gray-500">Proceso automático:</div>
                <div className="font-medium text-green-700">
                  1. Cierre del lote actual ({producto.loteActual})
                </div>
                <div className="font-medium text-green-700">
                  2. Apertura del próximo lote disponible
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-gray-800 border-b pb-2">Registro de Responsables</h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">*</span> Responsable de CIERRE
                </label>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Lote actual</span>
              </div>
              <input
                type="text"
                value={responsableCierre}
                onChange={(e) => setResponsableCierre(e.target.value)}
                placeholder="Nombre del responsable que cierra el lote"
                className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-500"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mismoResponsable"
                checked={mismoResponsable}
                onChange={(e) => setMismoResponsable(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <label htmlFor="mismoResponsable" className="text-sm text-gray-700">
                El mismo responsable realiza la apertura
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-green-500" />
                  <span className="text-red-500">*</span> Responsable de APERTURA
                </label>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Próximo lote</span>
              </div>
              <input
                type="text"
                value={responsableApertura}
                onChange={(e) => setResponsableApertura(e.target.value)}
                placeholder="Nombre del responsable que apertura el nuevo lote"
                disabled={mismoResponsable}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-200 ${
                  mismoResponsable 
                    ? 'bg-gray-100 border-gray-300 text-gray-500' 
                    : 'border-green-300 focus:border-green-500'
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Observaciones del proceso
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones sobre el cierre y apertura del lote..."
                className="w-full p-3 border rounded-lg min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="guardarDatos"
                checked={guardarDatos}
                onChange={(e) => setGuardarDatos(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="guardarDatos" className="text-sm text-gray-700 font-medium">
                Confirmo que estos datos han sido verificados y están correctos (obligatorio)
              </label>
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
          </div>
        </div>

        <div className="p-6 border-t flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-gradient-to-r from-red-500 to-green-500 text-white rounded-lg hover:from-red-600 hover:to-green-600 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Registrar y Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsumoFormTiber() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [fechaConsumo, setFechaConsumo] = useState(new Date().toISOString().split('T')[0]);
  const [disciplina, setDisciplina] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [registrosBase, setRegistrosBase] = useState<RegistroConsumo[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  
  const [modalCierreApertura, setModalCierreApertura] = useState<{
    isOpen: boolean;
    productoIndex: number;
  }>({ isOpen: false, productoIndex: -1 });

  const POSIBLES_COLECCIONES_PRODUCTOS = ['productos_tiber', 'tiber_productos'];
  const COLLECTION_LOTES = 'lotes';
  const COLLECTION_MOVIMIENTOS = 'movimientos_inventario';
  const COLLECTION_RECEPCIONES = 'tiber_recepciones';

  const obtenerColeccionProductos = async (disciplina: string): Promise<string | null> => {
    for (const nombreColeccion of POSIBLES_COLECCIONES_PRODUCTOS) {
      try {
        const productosRef = collection(db, nombreColeccion);
        const q = query(productosRef, where('disciplina', '==', disciplina), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          console.log(`✅ Usando colección: ${nombreColeccion}`);
          return nombreColeccion;
        }
      } catch (error) {
        console.warn(`Error al probar colección ${nombreColeccion}:`, error);
      }
    }
    return null;
  };

  const cargarProductosConLotes = useCallback(async () => {
    if (!disciplina) {
      setProductos([]);
      setRegistrosBase([]);
      return;
    }
    
    setLoadingData(true);
    try {
      const coleccionProductos = await obtenerColeccionProductos(disciplina);
      if (!coleccionProductos) {
        throw new Error(`No se encontró ninguna colección de productos para la disciplina ${disciplina}. Verifica que existan documentos en 'productos_tiber' o 'tiber_productos' con disciplina='${disciplina}'.`);
      }

      const productosRef = collection(db, coleccionProductos);
      const q = query(
        productosRef,
        where('disciplina', '==', disciplina),
        orderBy('nombre')
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`📦 Documentos encontrados en ${coleccionProductos}:`, querySnapshot.size);
      
      const productosData: Producto[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre || 'Sin nombre',
          codigo: data.codigo || '',
          disciplina: data.disciplina || '',
          categoria: data.categoria || '',
          unidad_medida: data.unidad_medida || 'pruebas',
          stock_actual: data.stock_actual ?? 0,
          alerta_minima: data.alerta_minima ?? 10,
          precio_unitario: data.precio_unitario,
          proveedor: data.proveedor,
          lote_actual: '',
          fecha_vencimiento_actual: ''
        };
      });
      
      if (productosData.length === 0) {
        toast.error(`No hay productos con disciplina "${disciplina}" en la colección ${coleccionProductos}.`);
        setProductos([]);
        setRegistrosBase([]);
        setLoadingData(false);
        return;
      }
      
      const productosConLotes = await Promise.all(
        productosData.map(async (producto) => {
          try {
            const lotesRef = collection(db, COLLECTION_LOTES);
            const lotesQuery = query(
              lotesRef,
              where('producto_id', '==', producto.id),
              where('estado', '==', 'ACTIVO'),
              limit(1)
            );
            const lotesSnapshot = await getDocs(lotesQuery);
            
            if (!lotesSnapshot.empty) {
              const loteDoc = lotesSnapshot.docs[0];
              const loteData = loteDoc.data();
              return {
                ...producto,
                lote_actual: loteData.numero_lote || '',
                fecha_vencimiento_actual: loteData.fecha_vencimiento || '',
                loteId: loteDoc.id,
                cantidad_actual_lote: loteData.cantidad_actual || 0
              };
            }
            return producto;
          } catch (error) {
            console.error(`Error buscando lote para ${producto.nombre}:`, error);
            return producto;
          }
        })
      );
      
      setProductos(productosConLotes as Producto[]);
      
      const nuevosRegistros: RegistroConsumo[] = productosConLotes.map(producto => {
        const stockActual = producto.stock_actual || 0;
        const loteId = (producto as any).loteId;
        const cantidadLote = (producto as any).cantidad_actual_lote || 0;
        
        return {
          productoId: producto.id,
          productoNombre: producto.nombre,
          unidad: producto.unidad_medida,
          stockActual: stockActual,
          px: 0,
          control: 0,
          calibrador: 0,
          merma: 0,
          totalConsumo: 0,
          nuevoStock: stockActual,
          proveedor: producto.proveedor,
          loteActual: (producto as any).lote_actual || '',
          fechaVencimientoActual: (producto as any).fecha_vencimiento_actual || '',
          loteId: loteId,
          cantidadActualLote: cantidadLote,
          agotado: false,
          requiereNuevoLote: false,
          datosCierreGuardados: false,
          datosConfirmados: false
        };
      });
      
      setRegistrosBase(nuevosRegistros);
      
      const sinLote = productosConLotes.filter(p => !(p as any).loteId).length;
      if (sinLote > 0) {
        // ✅ Reemplazo de toast.info
        toast(`${sinLote} producto(s) sin lote activo. Use "Sincronizar Recepciones TIBER" para actualizar.`, {
          icon: '⚠️',
          duration: 5000,
        });
      }
      
      toast.success(`Cargados ${productosData.length} productos desde ${coleccionProductos}`);
      
    } catch (error: any) {
      console.error('Error cargando productos:', error);
      toast.error(`Error al cargar productos: ${error.message || 'Verifica la consola para más detalles'}`);
    } finally {
      setLoadingData(false);
    }
  }, [disciplina]);

  const sincronizarRecepcionesTiber = async () => {
    if (!disciplina) {
      toast.error('Primero selecciona una disciplina');
      return;
    }
    setLoadingData(true);
    try {
      const loadingToast = toast.loading('Sincronizando con recepciones recientes de TIBER...');
      
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      
      const recepcionesRef = collection(db, COLLECTION_RECEPCIONES);
      const q = query(
        recepcionesRef,
        where('fechaRecepcion', '>=', Timestamp.fromDate(hace7Dias)),
        orderBy('fechaRecepcion', 'desc'),
        limit(50)
      );
      
      const recepcionesSnapshot = await getDocs(q);
      let productosActualizados = 0;
      let lotesCreados = 0;
      
      if (!recepcionesSnapshot.empty) {
        const batch = writeBatch(db);
        const coleccionProductos = await obtenerColeccionProductos(disciplina);
        if (!coleccionProductos) {
          toast.dismiss(loadingToast);
          toast.error('No se encontró la colección de productos. Asegúrate de tener productos creados.');
          setLoadingData(false);
          return;
        }
        
        for (const docRecepcion of recepcionesSnapshot.docs) {
          const recepcionData = docRecepcion.data();
          const productosRecepcion = recepcionData.productos || [];
          
          for (const productoRec of productosRecepcion) {
            try {
              const productoRef = doc(db, coleccionProductos, productoRec.productoId);
              const productoSnap = await getDoc(productoRef);
              
              if (productoSnap.exists()) {
                const productoData = productoSnap.data();
                const pruebasPorCaja = productoRec.pruebasPorCaja || 1;
                const pruebasRecibidas = productoRec.cantidadRecibida * pruebasPorCaja;
                
                if (pruebasRecibidas > 0) {
                  const nuevoStock = (productoData.stock_actual || 0) + pruebasRecibidas;
                  batch.update(productoRef, {
                    stock_actual: nuevoStock,
                    ultima_sincronizacion: serverTimestamp()
                  });
                  productosActualizados++;
                  
                  if (productoRec.numeroLote && productoRec.numeroLote.trim() !== '') {
                    const lotesRef = collection(db, COLLECTION_LOTES);
                    const loteQuery = query(
                      lotesRef,
                      where('producto_id', '==', productoRec.productoId),
                      where('numero_lote', '==', productoRec.numeroLote),
                      limit(1)
                    );
                    
                    const loteSnapshot = await getDocs(loteQuery);
                    
                    if (loteSnapshot.empty) {
                      const nuevoLote = {
                        producto_id: productoRec.productoId,
                        producto_nombre: productoRec.productoNombre,
                        numero_lote: productoRec.numeroLote,
                        fecha_vencimiento: productoRec.fechaVencimiento || '',
                        cantidad_inicial: pruebasRecibidas,
                        cantidad_actual: pruebasRecibidas,
                        estado: 'DISPONIBLE',
                        fecha_apertura: null,
                        created_at: serverTimestamp(),
                        updated_at: serverTimestamp(),
                        disciplina: productoData.disciplina,
                        proveedor: productoRec.proveedor || productoData.proveedor
                      };
                      const nuevoLoteRef = doc(collection(db, COLLECTION_LOTES));
                      batch.set(nuevoLoteRef, nuevoLote);
                      lotesCreados++;
                    } else {
                      const loteDoc = loteSnapshot.docs[0];
                      const loteData = loteDoc.data();
                      const nuevaCantidad = (loteData.cantidad_actual || 0) + pruebasRecibidas;
                      batch.update(loteDoc.ref, {
                        cantidad_actual: nuevaCantidad,
                        updated_at: serverTimestamp()
                      });
                    }
                  }
                }
              }
            } catch (error) {
              console.warn('Error procesando producto de recepción:', error);
            }
          }
        }
        
        if (productosActualizados > 0 || lotesCreados > 0) {
          await batch.commit();
          toast.dismiss(loadingToast);
          toast.success(`Sincronizado: ${productosActualizados} productos actualizados, ${lotesCreados} lotes nuevos`);
        } else {
          toast.dismiss(loadingToast);
          toast('No se encontraron recepciones recientes con novedades');
        }
      } else {
        toast.dismiss(loadingToast);
        toast('No hay recepciones en los últimos 7 días');
      }
      
      await cargarProductosConLotes();
      
    } catch (error) {
      console.error('Error sincronizando:', error);
      toast.error('Error al sincronizar recepciones TIBER');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    cargarProductosConLotes();
  }, [cargarProductosConLotes]);

  const registros = useMemo(() => {
    return registrosBase.map(registro => {
      const totalConsumo = registro.px + registro.control + registro.calibrador + registro.merma;
      const nuevoStock = registro.stockActual - totalConsumo;
      const agotado = registro.stockActual > 0 && nuevoStock <= 0;
      
      return {
        ...registro,
        totalConsumo,
        nuevoStock: nuevoStock < 0 ? 0 : nuevoStock,
        agotado,
        requiereNuevoLote: agotado && !registro.datosConfirmados
      };
    });
  }, [registrosBase]);

  const productosFiltrados = useMemo(() => {
    return registros.filter(registro => {
      const cumpleBusqueda = busqueda === '' || 
        registro.productoNombre.toLowerCase().includes(busqueda.toLowerCase());
      const cumpleProveedor = proveedorFiltro === '' || 
        registro.proveedor === proveedorFiltro;
      return cumpleBusqueda && cumpleProveedor;
    });
  }, [registros, busqueda, proveedorFiltro]);

  const totales = useMemo(() => {
    return registros.reduce(
      (acc, registro) => {
        acc.px += registro.px;
        acc.control += registro.control;
        acc.calibrador += registro.calibrador;
        acc.merma += registro.merma;
        acc.total += registro.totalConsumo;
        return acc;
      },
      { px: 0, control: 0, calibrador: 0, merma: 0, total: 0 }
    );
  }, [registros]);

  const updateRegistroValue = useCallback((productoId: string, campo: keyof RegistroConsumo, valor: number) => {
    setRegistrosBase(prev => prev.map(registro => {
      if (registro.productoId === productoId) {
        return { 
          ...registro, 
          [campo]: valor < 0 ? 0 : valor 
        };
      }
      return registro;
    }));
  }, []);

  const incrementValue = useCallback((productoId: string, campo: keyof RegistroConsumo) => {
    setRegistrosBase(prev => prev.map(registro => {
      if (registro.productoId === productoId) {
        const currentValue = registro[campo];
        if (typeof currentValue === 'number') {
          return { ...registro, [campo]: currentValue + 1 };
        }
      }
      return registro;
    }));
  }, []);

  const decrementValue = useCallback((productoId: string, campo: keyof RegistroConsumo) => {
    setRegistrosBase(prev => prev.map(registro => {
      if (registro.productoId === productoId) {
        const currentValue = registro[campo];
        if (typeof currentValue === 'number' && currentValue > 0) {
          return { ...registro, [campo]: currentValue - 1 };
        }
      }
      return registro;
    }));
  }, []);

  const buscarProximoLote = async (productoId: string) => {
    try {
      const lotesRef = collection(db, COLLECTION_LOTES);
      const qDisponibles = query(
        lotesRef,
        where('producto_id', '==', productoId),
        where('estado', '==', 'DISPONIBLE'),
        where('cantidad_actual', '>', 0),
        orderBy('fecha_vencimiento', 'asc'),
        limit(1)
      );
      
      const disponiblesSnapshot = await getDocs(qDisponibles);
      if (!disponiblesSnapshot.empty) {
        const loteDoc = disponiblesSnapshot.docs[0];
        const loteData = loteDoc.data();
        return {
          loteId: loteDoc.id,
          lote: loteData.numero_lote,
          fechaVencimiento: loteData.fecha_vencimiento,
          stockDisponible: loteData.cantidad_actual
        };
      }
      
      const qCualquiera = query(
        lotesRef,
        where('producto_id', '==', productoId),
        where('cantidad_actual', '>', 0),
        orderBy('fecha_vencimiento', 'asc'),
        limit(1)
      );
      const cualquieraSnapshot = await getDocs(qCualquiera);
      if (!cualquieraSnapshot.empty) {
        const loteDoc = cualquieraSnapshot.docs[0];
        const loteData = loteDoc.data();
        return {
          loteId: loteDoc.id,
          lote: loteData.numero_lote,
          fechaVencimiento: loteData.fecha_vencimiento,
          stockDisponible: loteData.cantidad_actual
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error buscando próximo lote:', error);
      return null;
    }
  };

  const handleCierreAperturaLote = useCallback((productoIndex: number, data: {
    responsableCierre: string;
    responsableApertura: string;
    observaciones: string;
    guardarDatos: boolean;
  }) => {
    setRegistrosBase(prev => prev.map((registro, index) => {
      if (index === productoIndex) {
        return {
          ...registro,
          loteCerrado: registro.loteActual || '',
          responsableCierre: data.responsableCierre || '',
          responsableApertura: data.responsableApertura || '',
          observacionesCierreApertura: data.observaciones || '',
          datosCierreGuardados: data.guardarDatos,
          datosConfirmados: data.guardarDatos
        };
      }
      return registro;
    }));

    setModalCierreApertura({ isOpen: false, productoIndex: -1 });
    toast.success('Datos de cierre/apertura guardados y confirmados');
  }, []);

  const verificarConfirmacionesNecesarias = useCallback(() => {
    const productosSinConfirmar = registros.filter(
      r => r.agotado && (!r.datosConfirmados || !r.datosCierreGuardados)
    );
    
    if (productosSinConfirmar.length > 0) {
      toast.error(
        `${productosSinConfirmar.length} producto(s) requieren confirmación de datos de cierre/apertura`,
        { duration: 5000 }
      );
      
      productosSinConfirmar.forEach(registro => {
        const element = document.getElementById(`producto-${registro.productoId}`);
        if (element) {
          element.classList.add('animate-pulse', 'border-2', 'border-red-500');
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 500);
        }
      });
      
      return false;
    }
    return true;
  }, [registros]);

  const handleRegistrarConsumos = async () => {
    const tieneConsumos = registros.some(registro => registro.totalConsumo > 0);
    
    if (!tieneConsumos) {
      toast.error('No hay consumos registrados');
      return;
    }

    if (!verificarConfirmacionesNecesarias()) {
      return;
    }

    if (!user) {
      toast.error('Debe iniciar sesión para registrar consumos');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Registrando consumos y gestionando lotes en TIBER...');

    try {
      const batch = writeBatch(db);
      const ahora = Timestamp.now();
      let productosProcesados = 0;
      let lotesCerrados = 0;
      let lotesAbiertos = 0;
      
      const coleccionProductos = await obtenerColeccionProductos(disciplina);
      if (!coleccionProductos) throw new Error('No se encontró la colección de productos');
      
      for (const registro of registros) {
        if (registro.totalConsumo > 0) {
          const productoRef = doc(db, coleccionProductos, registro.productoId);
          const productoSnap = await getDoc(productoRef);
          
          if (!productoSnap.exists()) {
            toast.error(`El producto "${registro.productoNombre}" ya no existe. Recargando...`);
            await cargarProductosConLotes();
            setLoading(false);
            toast.dismiss(loadingToast);
            return;
          }

          if (registro.totalConsumo > registro.stockActual) {
            toast.error(`El consumo (${registro.totalConsumo}) excede el stock disponible (${registro.stockActual}) para ${registro.productoNombre}`);
            setLoading(false);
            toast.dismiss(loadingToast);
            return;
          }
          
          batch.update(productoRef, {
            stock_actual: registro.nuevoStock,
            updated_at: serverTimestamp(),
          });
          
          if (registro.loteId && registro.loteId !== 'virtual' && registro.cantidadActualLote !== undefined) {
            const loteActualRef = doc(db, COLLECTION_LOTES, registro.loteId);
            const nuevaCantidadLote = Math.max(0, registro.cantidadActualLote - registro.totalConsumo);
            
            if (nuevaCantidadLote <= 0 && registro.agotado && registro.datosConfirmados) {
              batch.update(loteActualRef, {
                estado: 'CERRADO',
                cantidad_actual: 0,
                updated_at: serverTimestamp(),
                fecha_cierre: serverTimestamp(),
                responsable_cierre: registro.responsableCierre || user?.email || 'No especificado',
                observaciones_cierre: registro.observacionesCierreApertura || 'Lote agotado por consumo'
              });
              lotesCerrados++;
              
              const proximoLote = await buscarProximoLote(registro.productoId);
              
              if (proximoLote) {
                batch.update(productoRef, {
                  lote_actual: proximoLote.lote || '',
                  fecha_vencimiento_actual: proximoLote.fechaVencimiento || '',
                  updated_at: serverTimestamp(),
                });
                
                const proximoLoteRef = doc(db, COLLECTION_LOTES, proximoLote.loteId);
                batch.update(proximoLoteRef, {
                  estado: 'ACTIVO',
                  fecha_apertura: serverTimestamp(),
                  responsable_apertura: registro.responsableApertura || user?.email || 'No especificado',
                  observaciones_apertura: `Apertura después de agotamiento. ${registro.observacionesCierreApertura || ''}`,
                  updated_at: serverTimestamp()
                });
                lotesAbiertos++;
              } else {
                batch.update(productoRef, {
                  lote_actual: '',
                  fecha_vencimiento_actual: '',
                  updated_at: serverTimestamp()
                });
                toast(`No hay próximo lote disponible para ${registro.productoNombre}. Se dejará sin lote.`, { icon: '⚠️' });
              }
            } else {
              batch.update(loteActualRef, {
                cantidad_actual: nuevaCantidadLote,
                updated_at: serverTimestamp()
              });
            }
          }
          
          const movimientoRef = doc(collection(db, COLLECTION_MOVIMIENTOS));
          const movimientoData: any = {
            tipo: 'CONSUMO',
            producto_id: registro.productoId,
            producto_nombre: registro.productoNombre,
            disciplina: disciplina,
            cantidad: registro.totalConsumo,
            unidad: registro.unidad,
            desglose: {
              px: registro.px,
              control: registro.control,
              calibrador: registro.calibrador,
              merma: registro.merma
            },
            stock_anterior: registro.stockActual,
            stock_nuevo: registro.nuevoStock,
            proveedor: registro.proveedor || 'No especificado',
            usuario: user?.email || 'usuario_desconocido',
            observaciones: observaciones.trim() || `Consumo registrado - ${fechaConsumo}`,
            created_at: serverTimestamp(),
            fecha: ahora,
            fecha_consumo: new Date(fechaConsumo),
            agotado: registro.agotado,
            lote_actual: registro.loteActual || ''
          };

          if (registro.agotado && registro.datosConfirmados) {
            if (registro.loteCerrado?.trim()) movimientoData.lote_cerrado = registro.loteCerrado;
            if (registro.responsableCierre?.trim()) movimientoData.responsable_cierre = registro.responsableCierre;
            if (registro.responsableApertura?.trim()) movimientoData.responsable_apertura = registro.responsableApertura;
            if (registro.observacionesCierreApertura?.trim()) movimientoData.observaciones_lote = registro.observacionesCierreApertura;
            movimientoData.datos_confirmados = true;
          }

          batch.set(movimientoRef, movimientoData);
          productosProcesados++;
        }
      }

      await batch.commit();
      
      toast.dismiss(loadingToast);
      let mensaje = `${productosProcesados} producto(s) procesado(s)`;
      if (lotesCerrados > 0) mensaje += `, ${lotesCerrados} lote(s) cerrado(s)`;
      if (lotesAbiertos > 0) mensaje += `, ${lotesAbiertos} lote(s) abierto(s)`;
      toast.success(mensaje);
      
      await cargarProductosConLotes();
      setObservaciones('');
      
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Error:', error);
      toast.error(`Error al registrar los consumos: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetFormulario = () => {
    setRegistrosBase(prev => prev.map(registro => ({
      ...registro,
      px: 0,
      control: 0,
      calibrador: 0,
      merma: 0,
      totalConsumo: 0,
      nuevoStock: registro.stockActual,
      agotado: false,
      requiereNuevoLote: false,
      loteCerrado: '',
      responsableCierre: '',
      responsableApertura: '',
      observacionesCierreApertura: '',
      datosCierreGuardados: false,
      datosConfirmados: false
    })));
    setObservaciones('');
    setProveedorFiltro('');
    toast.success('Valores reiniciados');
  };

  const proveedoresUnicos = useMemo(() => {
    const proveedores = registros
      .map(r => r.proveedor)
      .filter((p): p is string => !!p);
    return [...new Set(proveedores)];
  }, [registros]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setProveedorFiltro('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <Toaster position="top-right" />
      
      {modalCierreApertura.isOpen && modalCierreApertura.productoIndex >= 0 && (
        <ModalCierreApertura
          isOpen={modalCierreApertura.isOpen}
          onClose={() => setModalCierreApertura({ isOpen: false, productoIndex: -1 })}
          producto={registros[modalCierreApertura.productoIndex]}
          onConfirm={(data) => handleCierreAperturaLote(modalCierreApertura.productoIndex, data)}
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="p-3 bg-white/20 rounded-xl relative">
                <TrendingDown className="w-8 h-8 text-white" />
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  <Lock className="w-3 h-3" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  REGISTRO DIARIO DE CONSUMOS - TIBER
                </h1>
                <p className="text-white/90 mt-1">
                  Sistema con Control de Cierre y Apertura de Lotes Automático
                </p>
                <p className="text-white/70 text-sm mt-1">
                  Stock en pruebas - Gestión integrada con recepciones
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => router.push('/TIBER/dashboard')} 
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                <Home className="w-5 h-5" />
                Dashboard TIBER
              </button>
              <div className="bg-white/20 rounded-xl p-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-white" />
                <input 
                  type="date" 
                  value={fechaConsumo}
                  onChange={(e) => setFechaConsumo(e.target.value)}
                  className="bg-transparent text-white font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Selector de disciplina */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Seleccione una Disciplina de TIBER</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {TIBER_DISCIPLINAS.map((disc) => {
              const Icon = disc.icon;
              return (
                <button
                  key={disc.value}
                  onClick={() => setDisciplina(disc.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    disciplina === disc.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{disc.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {disciplina && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Filtros de Productos</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-gray-700 mb-2">Buscar producto</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Nombre del producto..."
                      className="w-full pl-10 pr-4 py-3 border rounded-xl"
                    />
                  </div>
                </div>
                <div className="md:w-64">
                  <label className="block text-gray-700 mb-2">Filtrar por proveedor</label>
                  <select
                    value={proveedorFiltro}
                    onChange={(e) => setProveedorFiltro(e.target.value)}
                    className="w-full p-3 border rounded-xl"
                  >
                    <option value="">Todos los proveedores</option>
                    {proveedoresUnicos.map((proveedor, index) => (
                      <option key={index} value={proveedor}>
                        {proveedor}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="self-end">
                  <button
                    onClick={limpiarFiltros}
                    className="px-4 py-3 text-gray-600 hover:text-gray-800"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de productos */}
        {disciplina && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Package className="w-6 h-6 text-purple-500" />
                    Productos de {TIBER_DISCIPLINAS.find(d => d.value === disciplina)?.label} (TIBER)
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({productosFiltrados.length} productos)
                    </span>
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Stock actual en pruebas - Se solicitarán responsables cuando se agote un lote
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={sincronizarRecepcionesTiber}
                    disabled={loadingData || !disciplina}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
                  >
                    <ArrowRightLeft className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                    Sincronizar Recepciones TIBER
                  </button>
                  <button
                    onClick={cargarProductosConLotes}
                    disabled={loadingData}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>
              </div>
            </div>

            {loadingData ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-600 mt-4">Cargando productos y sincronizando con recepciones TIBER...</p>
              </div>
            ) : productos.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No hay productos registrados para esta disciplina en TIBER</p>
                <button
                  onClick={sincronizarRecepcionesTiber}
                  className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Sincronizar con Recepciones TIBER
                </button>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No se encontraron productos con los filtros aplicados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-700 border-r">Producto</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r">Lote Actual</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r">Stock Actual</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r bg-blue-50">PX</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r bg-amber-50">Control</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r bg-purple-50">Calib.</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r bg-red-50">Merma</th>
                      <th className="p-4 text-center font-bold text-gray-700 border-r bg-green-50">Total</th>
                      <th className="p-4 text-center font-bold text-gray-700 bg-gray-100">Nuevo Stock</th>
                      <th className="p-4 text-center font-bold text-gray-700 bg-gradient-to-r from-red-50 to-green-50">Gestión Lote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((registro: RegistroConsumo) => (
                      <tr 
                        key={registro.productoId} 
                        id={`producto-${registro.productoId}`}
                        className={`border-b hover:bg-gray-50 ${registro.agotado ? 'bg-red-50/30' : ''} ${
                          registro.agotado && !registro.datosConfirmados ? 'border-2 border-red-300 animate-pulse' : ''
                        }`}
                      >
                        <td className="p-4 border-r">
                          <div className="font-medium text-gray-800">{registro.productoNombre}</div>
                          <div className="text-sm text-gray-500">{registro.unidad}</div>
                          {registro.proveedor && (
                            <div className="text-xs text-gray-400 mt-1">{registro.proveedor}</div>
                          )}
                        </td>
                        <td className="p-4 text-center border-r">
                          <div className="text-sm">
                            <div className={`font-medium ${registro.loteActual ? 'text-gray-800' : 'text-gray-400'}`}>
                              {registro.loteActual || 'Sin lote'}
                            </div>
                            {registro.fechaVencimientoActual && (
                              <div className="text-xs text-gray-500">{registro.fechaVencimientoActual}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center border-r">
                          <div className={`text-2xl font-bold ${
                            registro.stockActual === 0 ? 'text-red-600' : 
                            registro.stockActual <= 10 ? 'text-amber-600' : 'text-gray-800'
                          }`}>
                            {registro.stockActual}
                          </div>
                        </td>
                        <td className="p-4 text-center border-r bg-blue-50/50">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => decrementValue(registro.productoId, 'px')} className="p-1 text-gray-600 hover:bg-blue-100 rounded"><Minus className="w-4 h-4" /></button>
                            <input type="number" min="0" value={registro.px} onChange={(e) => updateRegistroValue(registro.productoId, 'px', parseInt(e.target.value) || 0)} className="w-16 text-center p-1 border rounded" />
                            <button onClick={() => incrementValue(registro.productoId, 'px')} className="p-1 text-gray-600 hover:bg-blue-100 rounded"><Plus className="w-4 h-4" /></button>
                          </div>
                        </td>
                        <td className="p-4 text-center border-r bg-amber-50/50">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => decrementValue(registro.productoId, 'control')} className="p-1 text-gray-600 hover:bg-amber-100 rounded"><Minus className="w-4 h-4" /></button>
                            <input type="number" min="0" value={registro.control} onChange={(e) => updateRegistroValue(registro.productoId, 'control', parseInt(e.target.value) || 0)} className="w-16 text-center p-1 border rounded" />
                            <button onClick={() => incrementValue(registro.productoId, 'control')} className="p-1 text-gray-600 hover:bg-amber-100 rounded"><Plus className="w-4 h-4" /></button>
                          </div>
                        </td>
                        <td className="p-4 text-center border-r bg-purple-50/50">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => decrementValue(registro.productoId, 'calibrador')} className="p-1 text-gray-600 hover:bg-purple-100 rounded"><Minus className="w-4 h-4" /></button>
                            <input type="number" min="0" value={registro.calibrador} onChange={(e) => updateRegistroValue(registro.productoId, 'calibrador', parseInt(e.target.value) || 0)} className="w-16 text-center p-1 border rounded" />
                            <button onClick={() => incrementValue(registro.productoId, 'calibrador')} className="p-1 text-gray-600 hover:bg-purple-100 rounded"><Plus className="w-4 h-4" /></button>
                          </div>
                        </td>
                        <td className="p-4 text-center border-r bg-red-50/50">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => decrementValue(registro.productoId, 'merma')} className="p-1 text-gray-600 hover:bg-red-100 rounded"><Minus className="w-4 h-4" /></button>
                            <input type="number" min="0" value={registro.merma} onChange={(e) => updateRegistroValue(registro.productoId, 'merma', parseInt(e.target.value) || 0)} className="w-16 text-center p-1 border rounded" />
                            <button onClick={() => incrementValue(registro.productoId, 'merma')} className="p-1 text-gray-600 hover:bg-red-100 rounded"><Plus className="w-4 h-4" /></button>
                          </div>
                        </td>
                        <td className="p-4 text-center border-r bg-green-50/50">
                          <div className="text-xl font-bold text-green-700">{registro.totalConsumo}</div>
                          {registro.agotado && <div className="text-xs text-red-600 font-bold animate-pulse">¡SE AGOTARÁ!</div>}
                        </td>
                        <td className="p-4 text-center bg-gray-50">
                          <div className={`text-xl font-bold ${registro.nuevoStock === 0 ? 'text-red-600' : registro.nuevoStock < registro.stockActual ? 'text-amber-600' : 'text-gray-800'}`}>
                            {registro.nuevoStock}
                          </div>
                        </td>
                        <td className="p-4 text-center bg-gradient-to-r from-red-50/20 to-green-50/20">
                          {registro.agotado && !registro.datosConfirmados ? (
                            <button
                              onClick={() => {
                                const realIndex = registros.findIndex(r => r.productoId === registro.productoId);
                                if (realIndex >= 0) setModalCierreApertura({ isOpen: true, productoIndex: realIndex });
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-red-500 to-green-500 text-white rounded-lg hover:from-red-600 hover:to-green-600 transition-all flex items-center gap-2 mx-auto animate-pulse"
                            >
                              <UserPlus className="w-4 h-4" />
                              Registrar Responsables
                            </button>
                          ) : registro.agotado && registro.datosConfirmados ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-2 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="text-sm font-bold">Confirmado</span>
                              </div>
                              <div className="text-xs space-y-1">
                                <div className="flex items-center gap-1"><span className="text-red-500">Cierra:</span><span className="font-medium">{registro.responsableCierre || 'No especificado'}</span></div>
                                <div className="flex items-center gap-1"><span className="text-green-600">Abre:</span><span className="font-medium">{registro.responsableApertura || 'No especificado'}</span></div>
                              </div>
                              {registro.observacionesCierreApertura && <div className="text-xs text-gray-500 truncate" title={registro.observacionesCierreApertura}>{registro.observacionesCierreApertura.substring(0, 20)}...</div>}
                              <button onClick={() => { const realIndex = registros.findIndex(r => r.productoId === registro.productoId); if (realIndex >= 0) setModalCierreApertura({ isOpen: true, productoIndex: realIndex }); }} className="text-xs text-blue-600 hover:text-blue-800 underline mt-1">Editar</button>
                            </div>
                          ) : <div className="text-xs text-gray-400">-</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {registros.some(r => r.agotado && !r.datosConfirmados) && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-t border-red-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
                    <div>
                      <p className="font-bold text-red-700">{registros.filter(r => r.agotado && !r.datosConfirmados).length} lote(s) requieren confirmación</p>
                      <p className="text-sm text-red-600">Registre y confirme los responsables de cierre y apertura antes de guardar</p>
                    </div>
                  </div>
                  <button onClick={() => { const firstIndex = registros.findIndex(r => r.agotado && !r.datosConfirmados); if (firstIndex >= 0) setModalCierreApertura({ isOpen: true, productoIndex: firstIndex }); }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Registrar Responsables
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Observaciones y acciones */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <label className="block text-gray-800 font-bold text-lg mb-3">Observaciones Generales</label>
            <textarea 
              value={observaciones} 
              onChange={(e) => setObservaciones(e.target.value)} 
              placeholder="Observaciones sobre los consumos registrados..."
              className="w-full p-4 border-2 rounded-xl min-h-[100px] text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex gap-4">
              <button onClick={resetFormulario} disabled={loading || !disciplina || productos.length === 0} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
                <RotateCcw className="w-5 h-5" /> Reiniciar Valores
              </button>
            </div>
            <div className="flex gap-4">
              <button onClick={() => router.push('/TIBER/dashboard')} disabled={loading} className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-xl transition-all">Cancelar</button>
              <button onClick={handleRegistrarConsumos} disabled={loading || !disciplina || productos.length === 0 || totales.total === 0 || registros.some(r => r.agotado && !r.datosConfirmados)} className="px-8 py-3 bg-gradient-to-r from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 text-white font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
                <Save className="w-5 h-5" /> {loading ? 'Procesando...' : 'Guardar y Gestionar Lotes TIBER'}
              </button>
            </div>
          </div>

          {totales.total > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-green-50 border border-purple-200 rounded-xl">
              <h3 className="font-bold text-gray-800 mb-2">Resumen del Proceso</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-100 rounded-lg"><div className="text-sm text-blue-700">Pacientes</div><div className="text-2xl font-bold text-blue-800">{totales.px}</div></div>
                <div className="text-center p-3 bg-amber-100 rounded-lg"><div className="text-sm text-amber-700">Controles</div><div className="text-2xl font-bold text-amber-800">{totales.control}</div></div>
                <div className="text-center p-3 bg-purple-100 rounded-lg"><div className="text-sm text-purple-700">Calibradores</div><div className="text-2xl font-bold text-purple-800">{totales.calibrador}</div></div>
                <div className="text-center p-3 bg-red-100 rounded-lg"><div className="text-sm text-red-700">Merma</div><div className="text-2xl font-bold text-red-800">{totales.merma}</div></div>
                <div className="text-center p-3 bg-green-100 rounded-lg"><div className="text-sm text-green-700">Total General</div><div className="text-2xl font-bold text-green-800">{totales.total}</div></div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Gestión de Lotes en TIBER</h4>
                {registros.some(r => r.agotado) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-50 p-4 rounded-lg"><h5 className="font-bold text-red-700 mb-2 flex items-center gap-2"><Lock className="w-4 h-4" /> Lotes que se cierran ({registros.filter(r => r.agotado).length})</h5>
                      <div className="space-y-2">{registros.filter(r => r.agotado).map((r, idx) => (<div key={idx} className="bg-white/50 p-2 rounded border"><div className="font-medium">{r.productoNombre}</div><div className="text-sm"><span className="text-gray-600">Lote: </span><span className="font-bold">{r.loteActual || 'Sin lote'}</span></div><div className="flex items-center gap-2 mt-1">{r.datosConfirmados ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Confirmado</span> : <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1"><XCircle className="w-3 h-3" /> Pendiente</span>}</div></div>))}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg"><h5 className="font-bold text-green-700 mb-2 flex items-center gap-2"><Unlock className="w-4 h-4" /> Próximos lotes (automático)</h5><div className="text-sm text-gray-600">El sistema buscará automáticamente el próximo lote disponible en recepciones TIBER.<p className="mt-2 text-xs">Prioriza lotes recién recibidos con fechas de vencimiento más lejanas.</p></div></div>
                  </div>
                ) : <div className="text-center py-4 text-gray-500">No hay lotes que se vayan a agotar con los consumos actuales.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}