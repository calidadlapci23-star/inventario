'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, 
  writeBatch, doc, serverTimestamp, Timestamp,
  addDoc, onSnapshot
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import {
  Package, Truck, CheckCircle, Search, Filter,
  Plus, Minus, Save, RotateCcw, Home, AlertCircle,
  Calendar, Barcode, Factory, ClipboardCheck, List, TestTube
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
  proveedor: string;
  fabricante: string;
  fecha_vencimiento?: string;
  lote?: string;
  alerta_minima: number;
  precio_unitario?: number;
  ubicacion?: string;
  pruebas_por_caja?: number;
}

interface RegistroRecepcion {
  productoId: string;
  productoNombre: string;
  codigoProducto: string;
  fabricante: string;
  unidad: string;
  stockActual: number;
  pruebas: number;
  pruebasPorCaja?: number;
  numeroLote: string;
  fechaVencimiento: string;
  nuevoStock: number;
  proveedor?: string;
}

const catalogoProductos = {
  'QUIMICA_CLINICA': [
    { nombre: 'FLUID PACKD', fabricante: 'DIAMOND DIAGNOSTIC', proveedor: 'Proveedor A', pruebas: 0 },
  ],
  'INMUNOLOGIA': [
    { nombre: 'TSH', fabricante: 'BIOMERIEUX', proveedor: 'BIOMERIEUX', pruebas: 60 },
  ],
  // ... otros catálogos
};

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

export default function RecepcionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [fechaRecepcion, setFechaRecepcion] = useState(new Date().toISOString().split('T')[0]);
  const [disciplina, setDisciplina] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [registros, setRegistros] = useState<RegistroRecepcion[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [factura, setFactura] = useState('');
  const [modo, setModo] = useState<'CREAR' | 'RECEPCION'>('CREAR');
  const [productosCatalogo, setProductosCatalogo] = useState<any[]>([]);
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [fabricanteFiltro, setFabricanteFiltro] = useState('');

  useEffect(() => {
    if (!disciplina) {
      setProductos([]);
      setRegistros([]);
      setProductosCatalogo([]);
      return;
    }

    setLoadingData(true);
    const productosRef = collection(db, 'productos');
    const q = query(
      productosRef,
      where('disciplina', '==', disciplina),
      orderBy('nombre')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productosData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Usar SIEMPRE el ID del documento como el ID verdadero.
        // Esto sobrescribe cualquier campo 'id' que pueda existir dentro de los datos del documento (el problema en los productos antiguos).
        return {
          ...data,
          id: doc.id,
          stock_actual: typeof data.stock_actual === 'number' ? data.stock_actual : 0,
          pruebas_por_caja: typeof data.pruebas_por_caja === 'number' ? data.pruebas_por_caja : 0
        } as Producto;
      });

      setProductos(productosData);

      if (productosData.length === 0) {
        setModo('CREAR');
        const catalogo = catalogoProductos[disciplina as keyof typeof catalogoProductos] || [];
        setProductosCatalogo(catalogo.map((prod, index) => ({
          ...prod,
          id: `catalogo-${index}`,
          codigo: `${disciplina.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`
        })));
      } else {
        setModo('RECEPCION');
        const catalogo = catalogoProductos[disciplina as keyof typeof catalogoProductos] || [];
        
        setRegistros(currentRegistros => {
            const nuevosRegistros = productosData.map(producto => {
                const registroExistente = currentRegistros.find(r => r.productoId === producto.id);
                if (registroExistente) {
                    return { ...registroExistente, stockActual: producto.stock_actual };
                }
                const productoCatalogo = catalogo.find(p => p.nombre === producto.nombre && p.fabricante === producto.fabricante);
                const pruebasPorCaja = (productoCatalogo?.pruebas !== undefined ? productoCatalogo.pruebas : producto.pruebas_por_caja) || 0;
                return {
                    productoId: producto.id,
                    productoNombre: producto.nombre,
                    codigoProducto: producto.codigo,
                    fabricante: producto.fabricante || '',
                    unidad: producto.unidad_medida,
                    stockActual: producto.stock_actual,
                    pruebas: pruebasPorCaja,
                    pruebasPorCaja: pruebasPorCaja,
                    numeroLote: '',
                    fechaVencimiento: '',
                    nuevoStock: producto.stock_actual,
                    proveedor: producto.proveedor || ''
                };
            });
            return nuevosRegistros.filter(r => productosData.some(p => p.id === r.productoId));
        });
      }
      setLoadingData(false);
    }, (error) => {
        console.error('Error con la suscripción en tiempo real:', error);
        toast.error('Error al sincronizar datos. Intenta recargar.');
        setLoadingData(false);
    });

    return () => unsubscribe();
  }, [disciplina]);

  const handleCrearProducto = async (nombre: string, fabricante: string, proveedor: string, pruebas: number = 0) => {
    setLoading(true);
    try {
      const catalogo = catalogoProductos[disciplina as keyof typeof catalogoProductos] || [];
      const productoCatalogo = catalogo.find(p => p.nombre === nombre && p.fabricante === fabricante);
      const pruebasPorCaja = (productoCatalogo?.pruebas !== undefined ? productoCatalogo.pruebas : pruebas) || 0;

      await addDoc(collection(db, 'productos'), {
        nombre: nombre,
        codigo: `${disciplina.slice(0, 3).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        disciplina: disciplina,
        categoria: 'Reactivo',
        unidad_medida: 'pruebas',
        stock_actual: 0,
        proveedor: proveedor,
        fabricante: fabricante,
        pruebas_por_caja: pruebasPorCaja,
        alerta_minima: 10,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      toast.success(`Producto "${nombre}" creado exitosamente. La lista se actualizará automáticamente.`);

    } catch (error) {
      console.error('Error creando producto:', error);
      toast.error('Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  const updateRegistroValue = (productoId: string, campo: keyof RegistroRecepcion, valor: string | number) => {
    setRegistros(prev => prev.map(registro => {
      if (registro.productoId === productoId) {
        const numValor = typeof valor === 'string' ? parseInt(valor) || 0 : valor;
        const updatedField = campo === 'pruebas' ? { [campo]: numValor < 0 ? 0 : numValor } : { [campo]: valor };
        return { ...registro, ...updatedField };
      }
      return registro;
    }));
  };
  
  const handleRegistrarRecepcion = async () => {
    const tieneRecepciones = registros.some(r => (r.pruebas || 0) > 0 || r.numeroLote.trim() !== '');
    if (!tieneRecepciones) {
      toast.error('No hay recepciones para registrar.');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Registrando recepción...');

    try {
      const batch = writeBatch(db);
      const ahora = Timestamp.now();
      let productosActualizados = 0;
      
      for (const registro of registros) {
        if ((registro.pruebas || 0) > 0 || registro.numeroLote.trim() !== '') {
          const productoRef = doc(db, 'productos', registro.productoId);
          const nuevoStockCalculado = (registro.stockActual || 0) + (registro.pruebas || 0);

          const updateData: any = {
            stock_actual: nuevoStockCalculado,
            updated_at: serverTimestamp(),
          };
          if (registro.numeroLote.trim()) updateData.lote = registro.numeroLote;
          if (registro.fechaVencimiento.trim()) updateData.fecha_vencimiento = registro.fechaVencimiento;
          if (registro.pruebasPorCaja && registro.pruebasPorCaja > 0) updateData.pruebas_por_caja = registro.pruebasPorCaja;
          
          batch.update(productoRef, updateData);
          productosActualizados++;

          const movimientoRef = doc(collection(db, 'movimientos'));
          batch.set(movimientoRef, {
            tipo: 'RECEPCION',
            producto_id: registro.productoId,
            producto_nombre: registro.productoNombre,
            codigo_producto: registro.codigoProducto || '',
            disciplina: disciplina,
            cantidad: registro.pruebas || 0,
            stock_anterior: registro.stockActual || 0,
            stock_nuevo: nuevoStockCalculado,
            numero_lote: registro.numeroLote || 'N/A',
            fecha_vencimiento: registro.fechaVencimiento || 'N/A',
            usuario: 'usuario_actual', // Reemplazar con autenticación real
            fecha: ahora,
          });
        }
      }

      if (productosActualizados > 0) {
        await batch.commit();
        toast.dismiss(loadingToast);
        toast.success(`Recepción registrada para ${productosActualizados} productos.`);
        router.push('/inventario/dashboard');
      } else {
        toast.dismiss(loadingToast);
        toast.error('No hay datos válidos para registrar');
      }
      
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Error al registrar recepción:', error);
       if (error.code === 'not-found') {
         toast.error('Error: Uno de los productos ya no existe. La lista se ha actualizado.');
       } else {
         toast.error(`Error al registrar: ${error.message}`);
       }
    } finally {
      setLoading(false);
    }
  };

  const resetFormulario = useCallback(() => {
    setRegistros(prev => prev.map(registro => ({
      ...registro,
      pruebas: registro.pruebasPorCaja || 0,
      numeroLote: '',
      fechaVencimiento: '',
    })));
    toast.success('Valores de recepción reiniciados.');
  }, []);

  const registrosFiltrados = registros.filter(registro => {
    const matchBusqueda = registro.productoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                         (registro.codigoProducto || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                         registro.fabricante.toLowerCase().includes(busqueda.toLowerCase());
    const matchProveedor = !proveedorFiltro || (registro.proveedor || '').toLowerCase().includes(proveedorFiltro.toLowerCase());
    const matchFabricante = !fabricanteFiltro || registro.fabricante.toLowerCase().includes(fabricanteFiltro.toLowerCase());
    return matchBusqueda && matchProveedor && matchFabricante;
  });


  return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
            <Toaster position="top-right" />
            <div className="max-w-7xl mx-auto">
                <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <div className="flex items-center space-x-4 mb-4 md:mb-0">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Truck className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-white">RECEPCIÓN DE PRODUCTOS</h1>
                                <p className="text-white/90 mt-1">Sistema de Control de Inventario</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => router.push('/inventario/dashboard')} className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all flex items-center gap-2">
                                <Home className="w-5 h-5" />
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <label className="block text-gray-800 font-bold text-lg mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        <span className="text-red-500">*</span> Selecciona una Disciplina
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {DISCIPLINAS.map((disc) => (
                            <button 
                                key={disc.value} 
                                type="button" 
                                onClick={() => setDisciplina(disc.value)}
                                className={`p-4 rounded-lg border-2 transition-all text-center font-medium ${
                                    disciplina === disc.value 
                                        ? 'border-green-500 bg-green-50 text-green-700 shadow-md' 
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {disc.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loadingData && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Cargando productos para {disciplina}...</p>
                    </div>
                )}

                {!loadingData && disciplina && modo === 'RECEPCION' && (
                    <>
                        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative col-span-1 md:col-span-2">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, código o fabricante..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        className="pl-12 pr-4 py-3 border-2 rounded-xl w-full focus:border-green-500 text-lg"
                                    />
                                </div>
                                <button onClick={() => setModo('CREAR')} className="px-4 py-3 border-2 border-green-500 text-green-500 rounded-xl hover:bg-green-50 transition-colors font-semibold text-lg flex items-center justify-center gap-2">
                                    <Plus/> Ver Catálogo para Añadir
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <div className="p-6 border-b">
                                <h2 className="text-2xl font-bold text-gray-800">Recepción para {DISCIPLINAS.find(d => d.value === disciplina)?.label}</h2>
                                <p className="text-gray-600 mt-1">Mostrando {registrosFiltrados.length} de {registros.length} productos.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                     <thead className="bg-gray-50">
                                        <tr>
                                          <th className="p-4 text-left font-bold text-gray-700 border-r">Producto</th>
                                          <th className="p-4 text-center font-bold text-gray-700 border-r">Stock Actual</th>
                                          <th className="p-4 text-center font-bold text-gray-700 border-r bg-amber-50"># Pruebas</th>
                                          <th className="p-4 text-center font-bold text-gray-700 border-r bg-purple-50">Lote</th>
                                          <th className="p-4 text-center font-bold text-gray-700 border-r bg-red-50">Vencimiento</th>
                                          <th className="p-4 text-center font-bold text-gray-700 bg-green-50">Nuevo Stock</th>
                                        </tr>
                                      </thead>
                                    <tbody>
                                        {registrosFiltrados.map((registro) => (
                                            <tr key={registro.productoId} className="border-b hover:bg-gray-50">
                                                <td className="p-4 border-r">
                                                    <div className="font-bold text-gray-800 text-lg">{registro.productoNombre}</div>
                                                    <div className="text-sm text-gray-500">{registro.codigoProducto}</div>
                                                     <div className="text-sm text-gray-500">{registro.fabricante}</div>
                                                </td>
                                                <td className="p-4 text-center border-r">
                                                    <span className={`text-2xl font-bold ${registro.stockActual <= registro.pruebas ? 'text-red-500' : 'text-gray-800'}`}>{registro.stockActual}</span>
                                                    <div className="text-sm text-gray-500">{registro.unidad}</div>
                                                </td>
                                                <td className="p-4 border-r bg-amber-50/80">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <button onClick={() => updateRegistroValue(registro.productoId, 'pruebas', (registro.pruebas || 0) - 1)} className="w-10 h-10 flex items-center justify-center bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200">
                                                            <Minus className="w-5 h-5" />
                                                        </button>
                                                        <input type="number" value={registro.pruebas || 0} onChange={(e) => updateRegistroValue(registro.productoId, 'pruebas', e.target.value)} className="w-24 p-2 text-center border-2 rounded-lg bg-white text-xl font-bold" />
                                                        <button onClick={() => updateRegistroValue(registro.productoId, 'pruebas', (registro.pruebas || 0) + 1)} className="w-10 h-10 flex items-center justify-center bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200">
                                                            <Plus className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 border-r bg-purple-50/80">
                                                  <input type="text" value={registro.numeroLote} onChange={(e) => updateRegistroValue(registro.productoId, 'numeroLote', e.target.value)} placeholder="Lote" className="w-full p-2 text-center border-2 rounded-lg bg-white text-lg" />
                                                </td>
                                                <td className="p-4 border-r bg-red-50/80">
                                                  <input type="date" value={registro.fechaVencimiento} onChange={(e) => updateRegistroValue(registro.productoId, 'fechaVencimiento', e.target.value)} className="w-full p-2 text-center border-2 rounded-lg bg-white text-lg" />
                                                </td>
                                                <td className="p-4 text-center bg-green-50/80">
                                                    <div className="text-2xl font-bold text-green-600">{(registro.stockActual || 0) + (registro.pruebas || 0)}</div>
                                                    <div className="text-sm text-gray-500">{registro.unidad}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6 flex justify-end items-center gap-4">
                            <button onClick={resetFormulario} disabled={loading} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all flex items-center gap-2">
                                <RotateCcw className="w-5 h-5" /> Reiniciar
                            </button>
                            <button onClick={handleRegistrarRecepcion} disabled={loading || registros.reduce((acc, r) => acc + (r.pruebas || 0), 0) === 0} className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
                                <Save className="w-5 h-5" /> {loading ? 'Guardando...' : `Registrar Recepción (${registros.reduce((acc, r) => acc + (r.pruebas || 0), 0)})`}
                            </button>
                        </div>
                    </>
                )}
                 {!loadingData && disciplina && modo === 'CREAR' && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                         <h2 className="text-2xl font-bold text-gray-800">Añadir Producto desde Catálogo</h2>
                         <button onClick={() => setModo('RECEPCION')} className="mt-4 px-6 py-3 bg-gray-200 rounded-lg">Volver a Recepción</button>
                    </div>
                )}
            </div>
        </div>
    );
}
