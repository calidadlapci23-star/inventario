'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, doc, writeBatch,
  Timestamp, addDoc, onSnapshot, getDocs
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import {
  Package, Truck, Save, RotateCcw, Home, Search,
  Plus, Minus, TestTube, ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Toaster = dynamic(() => import('react-hot-toast').then((mod) => mod.Toaster), { ssr: false });

// Interfaces
interface Disciplina {
  id: string;
  nombre: string;
  label: string;
}

interface ProductoTiber {
  id: string;
  nombre: string;
  codigo: string;
  disciplina: string;
  categoria: string;
  unidad_medida: string;
  stock_actual: number;          // cajas
  proveedor: string;
  fabricante: string;
  pruebas_por_caja: number;      // pruebas por caja
  alerta_minima: number;
}

interface RegistroRecepcion {
  productoId: string;
  productoNombre: string;
  codigoProducto: string;
  fabricante: string;
  proveedor: string;
  unidad: string;
  stockActualCajas: number;
  pruebasPorCaja: number;
  cajasRecibidas: number;
  totalPruebas: number;
  numeroLote: string;
  fechaVencimiento: string;
  nuevoStockCajas: number;
}

export default function TiberRecepcionForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [disciplinaSeleccionada, setDisciplinaSeleccionada] = useState('');
  const [productos, setProductos] = useState<ProductoTiber[]>([]);
  const [registros, setRegistros] = useState<RegistroRecepcion[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Cargar disciplinas desde disciplinas_tiber
  useEffect(() => {
    const fetchDisciplinas = async () => {
      try {
        const disciplinasRef = collection(db, 'disciplinas_tiber');
        const snapshot = await getDocs(disciplinasRef);
        const disciplinasData = snapshot.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre || doc.id,
          label: doc.data().label || doc.data().nombre || doc.id
        } as Disciplina));
        setDisciplinas(disciplinasData);
      } catch (error) {
        console.error('Error cargando disciplinas:', error);
        toast.error('Error al cargar disciplinas');
      }
    };
    fetchDisciplinas();
  }, []);

  // Cargar productos de productos_tiber según disciplina seleccionada
  useEffect(() => {
    if (!disciplinaSeleccionada) {
      setProductos([]);
      setRegistros([]);
      return;
    }

    setLoadingData(true);
    const productosRef = collection(db, 'productos_tiber');
    const q = query(
      productosRef,
      where('disciplina', '==', disciplinaSeleccionada),
      orderBy('nombre')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productosData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre || 'Sin nombre',
          codigo: data.codigo || '',
          disciplina: data.disciplina || '',
          categoria: data.categoria || '',
          unidad_medida: data.unidad_medida || 'cajas',
          stock_actual: typeof data.stock_actual === 'number' ? data.stock_actual : 0,
          proveedor: data.proveedor || '',
          fabricante: data.fabricante || '',
          pruebas_por_caja: typeof data.pruebas_por_caja === 'number' ? data.pruebas_por_caja : 0,
          alerta_minima: data.alerta_minima ?? 10
        } as ProductoTiber;
      });
      setProductos(productosData);

      // Inicializar registros de recepción
      setRegistros(prev => {
        const nuevosRegistros = productosData.map(producto => {
          const existente = prev.find(r => r.productoId === producto.id);
          if (existente) {
            return {
              ...existente,
              stockActualCajas: producto.stock_actual,
              pruebasPorCaja: producto.pruebas_por_caja,
              totalPruebas: existente.cajasRecibidas * producto.pruebas_por_caja,
              nuevoStockCajas: producto.stock_actual + existente.cajasRecibidas,
            };
          }
          return {
            productoId: producto.id,
            productoNombre: producto.nombre,
            codigoProducto: producto.codigo,
            fabricante: producto.fabricante,
            proveedor: producto.proveedor,
            unidad: producto.unidad_medida,
            stockActualCajas: producto.stock_actual,
            pruebasPorCaja: producto.pruebas_por_caja,
            cajasRecibidas: 0,
            totalPruebas: 0,
            numeroLote: '',
            fechaVencimiento: '',
            nuevoStockCajas: producto.stock_actual,
          };
        });
        return nuevosRegistros;
      });
      setLoadingData(false);
    }, (error) => {
      console.error('Error onSnapshot productos_tiber:', error);
      toast.error('Error al cargar productos');
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [disciplinaSeleccionada]);

  const updateRegistro = (productoId: string, campo: keyof RegistroRecepcion, valor: any) => {
    setRegistros(prev => prev.map(reg => {
      if (reg.productoId !== productoId) return reg;
      const updated = { ...reg, [campo]: valor };
      if (campo === 'cajasRecibidas') {
        const cajas = Number(valor) || 0;
        updated.totalPruebas = cajas * reg.pruebasPorCaja;
        updated.nuevoStockCajas = reg.stockActualCajas + cajas;
      }
      return updated;
    }));
  };

  const resetFormulario = () => {
    setRegistros(prev => prev.map(reg => ({
      ...reg,
      cajasRecibidas: 0,
      totalPruebas: 0,
      numeroLote: '',
      fechaVencimiento: '',
      nuevoStockCajas: reg.stockActualCajas,
    })));
    setNumeroFactura('');
    setOrdenCompra('');
    setObservaciones('');
    toast.success('Formulario reiniciado');
  };

  const handleRegistrarRecepcion = async () => {
    if (!user) {
      toast.error('Debe iniciar sesión');
      return;
    }
    const tieneRecepcion = registros.some(r => r.cajasRecibidas > 0 || r.numeroLote.trim() !== '');
    if (!tieneRecepcion) {
      toast.error('No hay productos para recibir');
      return;
    }
    if (!numeroFactura.trim()) {
      toast.error('El número de factura es obligatorio');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Registrando recepción...');

    try {
      const batch = writeBatch(db);
      const timestamp = Timestamp.now();
      let productosActualizados = 0;

      // Agrupar por productoId (sumar cajas de múltiples lotes si los hubiera)
      const acumulado = new Map<string, { cajas: number; lote?: string; vencimiento?: string }>();
      for (const reg of registros) {
        if (reg.cajasRecibidas > 0) {
          const existente = acumulado.get(reg.productoId) || { cajas: 0 };
          existente.cajas += reg.cajasRecibidas;
          if (reg.numeroLote && !existente.lote) existente.lote = reg.numeroLote;
          if (reg.fechaVencimiento && !existente.vencimiento) existente.vencimiento = reg.fechaVencimiento;
          acumulado.set(reg.productoId, existente);
        }
      }

      // Actualizar stock de productos
      for (const [productoId, { cajas, lote, vencimiento }] of acumulado.entries()) {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) continue;
        const productoRef = doc(db, 'productos_tiber', productoId);
        const nuevoStock = producto.stock_actual + cajas;
        batch.update(productoRef, {
          stock_actual: nuevoStock,
          ultimaActualizacion: timestamp,
          ...(lote && { lote }),
          ...(vencimiento && { fecha_vencimiento: vencimiento }),
        });
        productosActualizados++;

        // Movimiento de inventario
        const movimientoRef = doc(collection(db, 'movimientos_inventario_tiber'));
        batch.set(movimientoRef, {
          tipo: 'recepcion',
          productoId,
          productoNombre: producto.nombre,
          cantidadCajas: cajas,
          pruebasPorCaja: producto.pruebas_por_caja,
          totalPruebas: cajas * producto.pruebas_por_caja,
          stockAnterior: producto.stock_actual,
          stockNuevo: nuevoStock,
          numeroFactura,
          ordenCompra,
          observaciones,
          usuario: user.email || user.uid,
          fecha: timestamp,
          lote: lote || '',
          fechaVencimiento: vencimiento || '',
        });
      }

      // Guardar la recepción completa
      const recepcionRef = doc(collection(db, 'tiber_recepciones'));
      batch.set(recepcionRef, {
        fechaRecepcion: timestamp,
        fechaRegistro: timestamp,
        numeroFactura,
        ordenCompra,
        observaciones,
        recibidoPor: user.email || user.uid,
        departamento: 'Sin departamento',
        estado: 'completada',
        productos: registros.filter(r => r.cajasRecibidas > 0).map(r => ({
          productoId: r.productoId,
          productoNombre: r.productoNombre,
          codigoProducto: r.codigoProducto,
          fabricante: r.fabricante,
          proveedor: r.proveedor,
          cantidadOrdenada: 0,
          cantidadRecibida: r.cajasRecibidas,
          pruebasPorCaja: r.pruebasPorCaja,
          totalPruebasRecibidas: r.totalPruebas,
          numeroLote: r.numeroLote,
          fechaVencimiento: r.fechaVencimiento,
          stockActual: r.stockActualCajas,
          nuevoStock: r.nuevoStockCajas,
        })),
        totalPruebas: registros.reduce<number>((acc, r) => acc + r.totalPruebas, 0),
      });

      await batch.commit();
      toast.dismiss(loadingToast);
      toast.success(`Recepción registrada: ${productosActualizados} productos actualizados`);
      router.push('/inventario/dashboard');
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error(error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const registrosFiltrados = registros.filter(reg =>
    reg.productoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    reg.codigoProducto.toLowerCase().includes(busqueda.toLowerCase()) ||
    reg.fabricante.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ✅ CORRECCIÓN DEL ERROR DE REDUCE: tipado explícito <number>
  const totalCajas = registros.reduce<number>((acc, r) => acc + r.cajasRecibidas, 0);
  const totalPruebas = registros.reduce<number>((acc, r) => acc + r.totalPruebas, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="p-3 bg-white/20 rounded-xl"><Truck className="w-8 h-8 text-white" /></div>
              <div><h1 className="text-2xl md:text-3xl font-bold text-white">Recepción de Productos - Tíber</h1><p className="text-white/90">Registro de entrada de insumos</p></div>
            </div>
            <button onClick={() => router.push('/inventario/dashboard')} className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all flex items-center gap-2"><Home className="w-5 h-5" /> Dashboard</button>
          </div>
        </div>

        {/* Selección de disciplina */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <label className="block text-gray-800 font-bold text-lg mb-3 flex items-center gap-2"><Package className="w-5 h-5" /><span className="text-red-500">*</span> Selecciona una Disciplina</label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {disciplinas.map(disc => (
              <button key={disc.id} type="button" onClick={() => setDisciplinaSeleccionada(disc.nombre)} className={`p-4 rounded-lg border-2 transition-all text-center font-medium ${disciplinaSeleccionada === disc.nombre ? 'border-green-500 bg-green-50 text-green-700 shadow-md' : 'border-gray-200 hover:bg-gray-50'}`}>
                {disc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cargando */}
        {loadingData && <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div><p className="text-gray-600 mt-4">Cargando productos...</p></div>}

        {/* Formulario de recepción */}
        {!loadingData && disciplinaSeleccionada && (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative col-span-1 md:col-span-2">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-12 pr-4 py-3 border-2 rounded-xl w-full" />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Factura *" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} className="flex-1 px-4 py-3 border-2 rounded-xl" required />
                  <input type="text" placeholder="Orden de Compra" value={ordenCompra} onChange={(e) => setOrdenCompra(e.target.value)} className="flex-1 px-4 py-3 border-2 rounded-xl" />
                </div>
              </div>
              <textarea placeholder="Observaciones generales" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full mt-4 px-4 py-3 border-2 rounded-xl" rows={2} />
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">Recepción - {disciplinas.find(d => d.nombre === disciplinaSeleccionada)?.label || disciplinaSeleccionada}</h2>
                <p className="text-gray-600">Total productos: {registrosFiltrados.length} | Cajas a recibir: {totalCajas} | Pruebas totales: {totalPruebas}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left">Producto</th>
                      <th className="p-4 text-center">Stock (cajas)</th>
                      <th className="p-4 text-center bg-amber-50">Cajas a recibir</th>
                      <th className="p-4 text-center bg-purple-50">Lote</th>
                      <th className="p-4 text-center bg-red-50">Vencimiento</th>
                      <th className="p-4 text-center bg-green-50">Nuevo Stock</th>
                      <th className="p-4 text-center">Pruebas totales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map(reg => (
                      <tr key={reg.productoId} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-bold">{reg.productoNombre}</div>
                          <div className="text-sm text-gray-500">{reg.codigoProducto} | {reg.fabricante}</div>
                        </td>
                        <td className="p-4 text-center"><span className="text-xl font-bold">{reg.stockActualCajas}</span></td>
                        <td className="p-4 text-center bg-amber-50/80">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => updateRegistro(reg.productoId, 'cajasRecibidas', reg.cajasRecibidas - 1)} className="w-8 h-8 bg-amber-100 rounded-lg hover:bg-amber-200"><Minus className="w-4 h-4 mx-auto" /></button>
                            <input type="number" value={reg.cajasRecibidas} onChange={(e) => updateRegistro(reg.productoId, 'cajasRecibidas', parseInt(e.target.value) || 0)} className="w-20 p-2 text-center border-2 rounded-lg text-lg font-bold" />
                            <button onClick={() => updateRegistro(reg.productoId, 'cajasRecibidas', reg.cajasRecibidas + 1)} className="w-8 h-8 bg-amber-100 rounded-lg hover:bg-amber-200"><Plus className="w-4 h-4 mx-auto" /></button>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{reg.pruebasPorCaja} pruebas/caja</div>
                        </td>
                        <td className="p-4 text-center bg-purple-50/80"><input type="text" value={reg.numeroLote} onChange={(e) => updateRegistro(reg.productoId, 'numeroLote', e.target.value)} placeholder="Lote" className="w-full p-2 border-2 rounded-lg" /></td>
                        <td className="p-4 text-center bg-red-50/80"><input type="date" value={reg.fechaVencimiento} onChange={(e) => updateRegistro(reg.productoId, 'fechaVencimiento', e.target.value)} className="w-full p-2 border-2 rounded-lg" /></td>
                        <td className="p-4 text-center bg-green-50/80"><span className="text-xl font-bold text-green-600">{reg.nuevoStockCajas}</span></td>
                        <td className="p-4 text-center"><TestTube className="inline w-4 h-4 mr-1" />{reg.totalPruebas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6 flex justify-end gap-4">
              <button onClick={resetFormulario} disabled={loading} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Reiniciar</button>
              <button onClick={handleRegistrarRecepcion} disabled={loading || totalCajas === 0} className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"><Save className="w-5 h-5" /> {loading ? 'Guardando...' : `Registrar Recepción (${totalPruebas} pruebas)`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}