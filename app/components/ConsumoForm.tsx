'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Beaker, Microscope, Droplets, Bacteria, Zap, 
  TestTube, Heart, Syringe, Package, Calendar, 
  AlertTriangle, CheckCircle, X, Loader2 
} from 'lucide-react';
import { registrarConsumoAction } from '../inventario/consumo/actions';

// Interfaces y constantes
interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  disciplina: string;
  categoria: string;
  unidad_medida: string;
  stock_actual: number;
  alerta_minima: number;
  created_at: string;
}

interface Lote {
  id: string;
  producto_id: string;
  lote: string;
  fecha_recepcion: string;
  fecha_vencimiento: string;
  stock: number;
  unidad: string;
  estado: 'ACTIVO' | 'VENCIDO' | 'AGOTADO' | 'RESERVADO';
  ubicacion: string;
  proveedor: string;
  observaciones: string;
  created_at: string;
}

const DISCIPLINAS = [
  { value: 'QUIMICA_CLINICA', label: 'Química Clínica', icon: <Beaker className="w-4 h-4" /> },
  { value: 'INMUNOLOGIA', label: 'Inmunología', icon: <Microscope className="w-4 h-4" /> },
  { value: 'UROANALISIS', label: 'Uroanálisis', icon: <Droplets className="w-4 h-4" /> },
  { value: 'BACTERIOLOGIA', label: 'Bacteriología', icon: <Bacteria className="w-4 h-4" /> },
  { value: 'PRUEBAS_RAPIDAS', label: 'Pruebas Rápidas', icon: <Zap className="w-4 h-4" /> },
  { value: 'TOMA_MUESTRA', label: 'Toma de Muestra', icon: <TestTube className="w-4 h-4" /> },
  { value: 'HEMATOLOGIA', label: 'Hematología', icon: <Heart className="w-4 h-4" /> },
  { value: 'COAGULACION', label: 'Coagulación', icon: <Syringe className="w-4 h-4" /> },
];

export default function ConsumoForm() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  const [disciplina, setDisciplina] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoId, setProductoId] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState<Lote | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');
  
  useEffect(() => {
    const cargarProductos = async () => {
      if (!disciplina) {
        setProductos([]);
        setProductoId('');
        return;
      }
      
      setLoadingData(true);
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('disciplina', disciplina)
          .gt('stock_actual', 0)
          .order('nombre');
        
        if (error) throw error;
        setProductos(data || []);
        setProductoId('');
        setProductoSeleccionado(null);
        setLotes([]);
        setLoteSeleccionado(null);
        
      } catch (error) {
        toast.error('Error al cargar productos');
      } finally {
        setLoadingData(false);
      }
    };
    
    const debounceTimer = setTimeout(cargarProductos, 300);
    return () => clearTimeout(debounceTimer);
  }, [disciplina, supabase]);
  
  useEffect(() => {
    const cargarLotes = async () => {
      if (!productoId) {
        setLotes([]);
        setLoteSeleccionado(null);
        return;
      }
      
      setLoadingData(true);
      try {
        const { data, error } = await supabase
          .from('lotes')
          .select('*')
          .eq('producto_id', productoId)
          .gt('fecha_vencimiento', new Date().toISOString())
          .gt('stock', 0)
          .order('fecha_vencimiento', { ascending: true });
        
        if (error) throw error;
        setLotes(data || []);
        setLoteSeleccionado(null);
        setCantidad(1);
        
      } catch (error) {
        toast.error('Error al cargar lotes');
      } finally {
        setLoadingData(false);
      }
    };
    
    cargarLotes();
  }, [productoId, supabase]);

  useEffect(() => {
    setProductoSeleccionado(productos.find(p => p.id === productoId) || null);
  }, [productoId, productos]);

  const resetForm = () => {
    setDisciplina('');
    setProductoId('');
    setProductoSeleccionado(null);
    setLotes([]);
    setLoteSeleccionado(null);
    setCantidad(1);
    setObservaciones('');
  }

  const handleFormSubmit = async () => {
    if (!productoSeleccionado || !loteSeleccionado || cantidad <= 0) {
        toast.error('Por favor, complete todos los campos requeridos.');
        return;
    }
    if (cantidad > loteSeleccionado.stock) {
        toast.error(`La cantidad no puede superar el stock disponible (${loteSeleccionado.stock})`);
        return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Registrando consumo...');

    const result = await registrarConsumoAction({
        productoId: productoSeleccionado.id,
        loteId: loteSeleccionado.id,
        cantidad: cantidad,
        observaciones: observaciones,
    });

    toast.dismiss(loadingToast);

    if (result.success) {
        toast.success(result.message);
        const newLotes = lotes.map(l => l.id === loteSeleccionado.id ? {...l, stock: l.stock - cantidad} : l).filter(l => l.stock > 0);
        setLotes(newLotes);
        if (newLotes.length === 0) {
          setProductoId(''); 
        } else {
          setLoteSeleccionado(null);
        }
        setCantidad(1);
    } else {
        toast.error(result.message);
    }

    setLoading(false);
  };

  const handleSelectLote = (lote: Lote) => {
    setLoteSeleccionado(lote);
    setCantidad(Math.min(1, lote.stock));
  };

  const calcularDiasVencimiento = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getLoteStatusClass = (lote: Lote) => {
    const dias = calcularDiasVencimiento(lote.fecha_vencimiento);
    if (lote.stock <= 0) return 'border-gray-300 bg-gray-50 text-gray-500';
    if (dias <= 30) return 'border-red-300 bg-red-50 text-red-700';
    if (dias <= 90) return 'border-amber-300 bg-amber-50 text-amber-700';
    if (lote.stock <= 10) return 'border-orange-300 bg-orange-50 text-orange-700';
    return 'border-green-300 bg-green-50 text-green-700';
  };
  
  const getLoteStatusText = (lote: Lote) => {
    const dias = calcularDiasVencimiento(lote.fecha_vencimiento);
    if (lote.stock <= 0) return 'Agotado';
    if (dias <= 90) return `Vence en ${dias} días`;
    if (lote.stock <= 10) return 'Stock bajo';
    return 'Disponible';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 md:p-6">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className="p-3 bg-white/20 rounded-xl"><Beaker className="w-8 h-8 text-white" /></div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">REGISTRAR CONSUMO DIARIO</h1>
                        <p className="text-white/90 mt-1">Sistema de Gestión de Inventario</p>
                    </div>
                </div>
                <button onClick={() => router.push('/inventario/dashboard')} className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all flex items-center gap-2">
                    <X className="w-5 h-5" />Volver al Dashboard
                </button>
            </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="mb-8">
              <label className="block text-gray-800 font-bold text-lg mb-3"><span className="text-red-500">*</span> Disciplina</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DISCIPLINAS.map((disc) => (
                  <button key={disc.value} type="button" onClick={() => setDisciplina(disc.value)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                      disciplina === disc.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <span className="text-2xl">{disc.icon}</span>
                    <span className="font-medium text-sm">{disc.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <label className="block text-gray-800 font-bold text-lg mb-3"><span className="text-red-500">*</span> Producto</label>
              <select value={productoId} onChange={(e) => setProductoId(e.target.value)} disabled={!disciplina || loadingData}
                className={`w-full p-4 text-lg border-2 rounded-xl transition-all ${
                  !disciplina || loadingData ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}>
                <option value="">
                  {!disciplina ? '← Seleccione una disciplina' : loadingData ? 'Cargando...' : productos.length === 0 ? 'No hay productos' : 'Seleccione un producto...'}
                </option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} - Stock: {p.stock_actual} {p.unidad_medida}</option>)}
              </select>
            </div>

            {productoSeleccionado && (
                <div className="mb-8">
                    <h3 className="text-gray-800 font-bold text-lg flex items-center gap-2 mb-4"><Package className="w-5 h-5" /> Lotes Disponibles</h3>
                    {loadingData ? <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /><p className="text-gray-500 mt-2">Cargando lotes...</p></div>
                     : lotes.length === 0 ? <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center"><AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" /><p className="text-yellow-800 font-medium">No hay lotes disponibles</p></div>
                     : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{lotes.map((lote) => (
                        <div key={lote.id} onClick={() => handleSelectLote(lote)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                                loteSeleccionado?.id === lote.id ? 'ring-2 ring-blue-500 border-blue-500' : getLoteStatusClass(lote)
                            }`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-lg">{lote.lote}</h4>
                                    <div className="flex items-center gap-2 mt-1"><Calendar className="w-4 h-4" /><span className="text-sm">Vence: {new Date(lote.fecha_vencimiento).toLocaleDateString()}</span></div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${getLoteStatusClass(lote).split(' ')[0].replace('border-', 'bg-').replace('300', '100')}`}>{getLoteStatusText(lote)}</div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-600">📍 {lote.ubicacion || 'N/A'}</p>
                                    <p className="text-sm text-gray-600">🏢 {lote.proveedor || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{lote.stock}</div>
                                    <div className="text-sm text-gray-500">{lote.unidad}</div>
                                </div>
                            </div>
                        </div>
                    ))}</div>}
                </div>
            )}

            {loteSeleccionado && (
                <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle className="w-6 h-6 text-green-500" /> Lote Seleccionado</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-4 rounded-xl border">
                            <label className="block text-gray-600 text-sm font-medium mb-2">Lote</label>
                            <input type="text" value={loteSeleccionado.lote} readOnly className="w-full p-3 bg-gray-50 border rounded-lg font-bold text-lg"/>
                        </div>
                        <div className="bg-white p-4 rounded-xl border">
                            <label className="block text-gray-600 text-sm font-medium mb-2">Unidad</label>
                            <input type="text" value={loteSeleccionado.unidad} readOnly className="w-full p-3 bg-gray-50 border rounded-lg font-bold text-lg"/>
                        </div>
                        <div className="bg-white p-4 rounded-xl border">
                            <label className="block text-gray-600 text-sm font-medium mb-2">Stock Actual</label>
                            <input type="text" value={`${loteSeleccionado.stock} ${loteSeleccionado.unidad}`} readOnly className="w-full p-3 bg-gray-50 border rounded-lg font-bold text-lg"/>
                        </div>
                    </div>
                    <div className="mt-6">
                        <label className="block text-gray-800 font-bold text-lg mb-3"><span className="text-red-500">*</span> Cantidad a Consumir</label>
                        <div className="flex items-center gap-4">
                            <input type="number" min="1" max={loteSeleccionado.stock} value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value) || 1)} className="w-32 p-4 text-2xl font-bold border-2 rounded-xl text-center focus:border-blue-500"/>
                            <div className="flex-1">
                                <div className="text-gray-600 mb-2">Máximo: <span className="font-bold">{loteSeleccionado.stock}</span></div>
                                <input type="range" min="1" max={loteSeleccionado.stock} value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mb-8">
              <label className="block text-gray-800 font-bold text-lg mb-3">Observaciones</label>
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Ej: Consumo turno matutino..." className="w-full p-4 border-2 rounded-xl min-h-[120px] text-lg"></textarea>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-end pt-8 border-t">
              <button onClick={() => router.push('/inventario/dashboard')} disabled={loading} className="px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50">
                <X className="w-6 h-6" /> Cancelar
              </button>
              <button onClick={handleFormSubmit} disabled={loading || !loteSeleccionado} className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 text-lg disabled:opacity-50">
                {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> Procesando...</> : <><CheckCircle className="w-6 h-6" /> Registrar Consumo</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
