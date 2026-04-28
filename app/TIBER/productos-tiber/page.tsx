'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch,
  Timestamp,
  where
} from 'firebase/firestore';
import { 
    ArrowLeft, 
    Plus, 
    Edit, 
    Trash2, 
    Loader2,
    BookOpen,
    X,
    Search,
    Package
} from 'lucide-react';

// --- Interfaces ---
interface ProductoTiber {
  id: string;
  nombre: string;
  codigo: string;               // ahora se genera automáticamente
  fabricante: string;
  categoria: string;
  alerta_minima: number;
  numero_pruebas: string;
  disciplina: string;
  proveedor: string;
  unidad_medida: string;
  activo: boolean;
  stock_actual?: number;
}

interface DisciplinaTiber {
    id: string;
    nombre: string;
    activa: boolean;
}

// Valores por defecto para un producto nuevo (el código se generará al guardar)
const productoVacio: Omit<ProductoTiber, 'id' | 'codigo'> = {
  nombre: '',
  fabricante: '',
  categoria: 'Reactivo',
  alerta_minima: 10,
  numero_pruebas: '',
  disciplina: '',
  proveedor: '',
  unidad_medida: 'unidades',
  activo: true,
};

// Función para generar un código único a partir del nombre
const generarCodigo = (nombre: string): string => {
  // Convertir a slug: minúsculas, reemplazar espacios y caracteres no alfanuméricos por guiones
  const slug = nombre
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  // Añadir un sufijo de timestamp para garantizar unicidad
  const sufijo = Date.now().toString(36); // base36 para acortar
  return `${slug}-${sufijo}`;
};

const ModalProducto = ({ isOpen, onClose, onSave, producto, disciplinas, loading }) => {
    // Estado local sin el campo 'codigo' (se generará al guardar)
    const [formData, setFormData] = useState<Omit<ProductoTiber, 'id' | 'codigo'>>(productoVacio);

    useEffect(() => {
        if (producto) {
            // En edición, cargamos todos los campos excepto el código (que ya existe y no se modifica)
            setFormData({
                nombre: producto.nombre,
                fabricante: producto.fabricante,
                categoria: producto.categoria,
                alerta_minima: producto.alerta_minima,
                numero_pruebas: producto.numero_pruebas,
                disciplina: producto.disciplina,
                proveedor: producto.proveedor,
                unidad_medida: producto.unidad_medida,
                activo: producto.activo,
            });
        } else {
            setFormData(productoVacio);
        }
    }, [producto, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Si estamos creando (producto es null), generamos el código automáticamente
        if (!producto) {
            const codigoGenerado = generarCodigo(formData.nombre);
            onSave({ ...formData, codigo: codigoGenerado });
        } else {
            // En edición, pasamos el código existente (no se modifica)
            onSave({ ...formData, codigo: producto.codigo });
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{producto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre */}
                        <div>
                            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre *</label>
                            <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                        </div>

                        {/* Fabricante */}
                        <div>
                            <label htmlFor="fabricante" className="block text-sm font-medium text-gray-700">Fabricante *</label>
                            <input type="text" id="fabricante" name="fabricante" value={formData.fabricante} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                        </div>

                        {/* Categoría */}
                        <div>
                            <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">Categoría</label>
                            <input type="text" id="categoria" name="categoria" value={formData.categoria} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>

                        {/* Alerta mínima */}
                        <div>
                            <label htmlFor="alerta_minima" className="block text-sm font-medium text-gray-700">Alerta mínima (stock)</label>
                            <input type="number" id="alerta_minima" name="alerta_minima" value={formData.alerta_minima} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>

                        {/* Número de pruebas */}
                        <div>
                            <label htmlFor="numero_pruebas" className="block text-sm font-medium text-gray-700"># de Pruebas</label>
                            <input type="text" id="numero_pruebas" name="numero_pruebas" value={formData.numero_pruebas} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Ej. 24, 50, 100" />
                        </div>

                        {/* Disciplina */}
                        <div>
                            <label htmlFor="disciplina" className="block text-sm font-medium text-gray-700">Disciplina *</label>
                            <input type="text" id="disciplina" name="disciplina" value={formData.disciplina} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Ej. INMUNOLOGIA, HEMATOLOGIA" required />
                        </div>

                        {/* Proveedor */}
                        <div>
                            <label htmlFor="proveedor" className="block text-sm font-medium text-gray-700">Proveedor *</label>
                            <input type="text" id="proveedor" name="proveedor" value={formData.proveedor} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                        </div>

                        {/* Unidad de medida */}
                        <div>
                            <label htmlFor="unidad_medida" className="block text-sm font-medium text-gray-700">Unidad de medida</label>
                            <select id="unidad_medida" name="unidad_medida" value={formData.unidad_medida} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="unidades">unidades</option>
                                <option value="cajas">cajas</option>
                                <option value="litros">litros</option>
                                <option value="mililitros">mililitros</option>
                                <option value="kits">kits</option>
                                <option value="Frascos">Frascos</option>
                            </select>
                        </div>

                        {/* Activo (check) */}
                        <div className="flex items-center">
                            <input type="checkbox" id="activo" name="activo" checked={formData.activo} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                            <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">Activo</label>
                        </div>
                    </div>

                    {/* Información del código (solo lectura, se muestra si existe) */}
                    {producto && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <span className="font-medium">Código actual:</span> {producto.codigo} (no modificable)
                        </div>
                    )}
                    {!producto && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <span className="font-medium">El código se generará automáticamente al guardar.</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 flex items-center gap-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                             {loading && <Loader2 className="animate-spin" size={18}/>}
                             Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default function ProductosTiberPage() {
    const { user } = useAuth();
    const router = useRouter();
    
    const [productos, setProductos] = useState<ProductoTiber[]>([]);
    const [disciplinas, setDisciplinas] = useState<DisciplinaTiber[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProducto, setSelectedProducto] = useState<ProductoTiber | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Carga inicial de datos
    useEffect(() => {
        const setupCollections = async () => {
            setLoading(true);
            try {
                // Sembrar disciplinas si no existen (opcional)
                const disciplinasRef = collection(db, 'disciplinas_tiber');
                const disciplinasSnapshot = await getDocs(disciplinasRef);

                if (disciplinasSnapshot.empty) {
                    console.log('Colección "disciplinas_tiber" vacía. Sembrando datos iniciales...');
                    const batch = writeBatch(db);
                    const disciplinasIniciales = [
                        { nombre: 'Química Clínica', activa: true },
                        { nombre: 'Hematología', activa: true },
                        { nombre: 'Inmunología', activa: true },
                        { nombre: 'Microbiología', activa: true },
                        { nombre: 'Uroanálisis', activa: true },
                        { nombre: 'Parasitología', activa: true },
                        { nombre: 'Biología Molecular', activa: true },
                    ];
                    
                    disciplinasIniciales.forEach(disciplina => {
                        const docRef = doc(collection(db, 'disciplinas_tiber'));
                        batch.set(docRef, disciplina);
                    });
                    
                    await batch.commit();
                    console.log('Datos iniciales de disciplinas sembrados con éxito.');
                }
                
                // Cargar Disciplinas (solo informativo)
                const disciplinasQuery = query(collection(db, 'disciplinas_tiber'), where('activa', '==', true));
                const disciplinasData = await getDocs(disciplinasQuery);
                const disciplinasList: DisciplinaTiber[] = disciplinasData.docs.map(doc => ({ id: doc.id, ...doc.data() } as DisciplinaTiber));
                setDisciplinas(disciplinasList);

                // Cargar Productos
                const productosQuery = query(collection(db, 'productos_tiber'), orderBy('nombre'));
                const productosData = await getDocs(productosQuery);
                const productosList: ProductoTiber[] = productosData.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        nombre: data.nombre || '',
                        codigo: data.codigo || '',
                        fabricante: data.fabricante || '',
                        categoria: data.categoria || 'Reactivo',
                        alerta_minima: data.alerta_minima || 10,
                        numero_pruebas: data.numero_pruebas || data['# de Pruebas'] || '',
                        disciplina: data.disciplina || '',
                        proveedor: data.proveedor || '',
                        unidad_medida: data.unidad_medida || 'unidades',
                        activo: data.activo !== undefined ? data.activo : true,
                        stock_actual: data.stock_actual || 0,
                    };
                });
                setProductos(productosList);

            } catch (e) {
                console.error("Error al configurar colecciones:", e);
                setError("No se pudieron cargar los datos. Intenta de nuevo más tarde.");
            } finally {
                setLoading(false);
            }
        };

        if(user) {
            setupCollections();
        } else {
             router.push('/');
        }
    }, [user, router]);

    const handleOpenModal = (producto: ProductoTiber | null = null) => {
        setSelectedProducto(producto);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProducto(null);
    };

    const handleSaveProducto = async (productoData: Omit<ProductoTiber, 'id'>) => {
        setLoading(true);
        try {
            // Preparamos el objeto a guardar (incluye codigo, que ya viene generado o existente)
            const dataToSave: any = {
                nombre: productoData.nombre,
                codigo: productoData.codigo,               // ya generado o existente
                fabricante: productoData.fabricante,
                categoria: productoData.categoria,
                alerta_minima: Number(productoData.alerta_minima) || 10,
                numero_pruebas: productoData.numero_pruebas,
                disciplina: productoData.disciplina,
                proveedor: productoData.proveedor,
                unidad_medida: productoData.unidad_medida,
                activo: productoData.activo,
            };

            if (selectedProducto) { // Editar
                const productoRef = doc(db, 'productos_tiber', selectedProducto.id);
                await updateDoc(productoRef, {
                    ...dataToSave,
                    actualizadoEn: Timestamp.now()
                });
                setProductos(productos.map(p => p.id === selectedProducto.id ? { ...p, ...dataToSave } : p));
            } else { // Crear
                const docRef = await addDoc(collection(db, 'productos_tiber'), {
                    ...dataToSave,
                    stock_actual: 0,
                    creadoEn: Timestamp.now()
                });
                setProductos([...productos, { id: docRef.id, ...dataToSave, stock_actual: 0 }]);
            }
            handleCloseModal();
        } catch (e) {
            console.error("Error al guardar producto:", e);
            setError("No se pudo guardar el producto.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteProducto = async (id: string, nombre: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el producto "${nombre}"?`)) {
            try {
                await deleteDoc(doc(db, 'productos_tiber', id));
                setProductos(productos.filter(p => p.id !== id));
            } catch (e) {
                console.error("Error al eliminar producto:", e);
                setError("No se pudo eliminar el producto.");
            }
        }
    };

    // Filtrado
    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.disciplina.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
          <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto"/>
              <p className="mt-4 text-gray-700 font-semibold">Cargando Productos...</p>
            </div>
          </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                <button 
                    onClick={() => router.push('/TIBER/dashboard')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium"
                >
                    <ArrowLeft size={20} />
                    Volver al Dashboard
                </button>

                <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <BookOpen className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Catálogo de Productos - Tiber</h1>
                                <p className="text-gray-600">Gestiona los productos y servicios de análisis.</p>
                            </div>
                        </div>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            <Plus size={20}/>
                            <span>Nuevo Producto</span>
                        </button>
                    </div>

                    {error && <div className="my-4 text-center p-3 bg-red-100 text-red-800 rounded-lg">{error}</div>}

                    {/* Barra de búsqueda */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, proveedor o disciplina..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b-2 border-gray-200">
                                <tr className="text-sm text-gray-600">
                                    <th className="p-4">Nombre</th>
                                    <th className="p-4">Código</th>
                                    <th className="p-4">Fabricante</th>
                                    <th className="p-4"># Pruebas</th>
                                    <th className="p-4">Disciplina</th>
                                    <th className="p-4">Proveedor</th>
                                    <th className="p-4">Unidad Medida</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productosFiltrados.map(p => (
                                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                        <td className="p-4 font-medium text-gray-800">{p.nombre}</td>
                                        <td className="p-4 text-gray-600">{p.codigo}</td>
                                        <td className="p-4 text-gray-600">{p.fabricante}</td>
                                        <td className="p-4 text-gray-600">{p.numero_pruebas || '-'}</td>
                                        <td className="p-4 text-gray-600">{p.disciplina}</td>
                                        <td className="p-4 text-gray-600">{p.proveedor}</td>
                                        <td className="p-4 text-gray-600">{p.unidad_medida}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${p.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {p.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="p-4 flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"><Edit size={18}/></button>
                                            <button onClick={() => handleDeleteProducto(p.id, p.nombre)} className="p-2 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {productosFiltrados.length === 0 && (
                            <div className="text-center p-8 border-t border-gray-100">
                                <Package className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="text-xl font-medium text-gray-700">No hay productos</h3>
                                <p className="text-gray-500 mt-2">
                                    {searchTerm ? 'Intenta con otra búsqueda' : 'Empieza creando un nuevo producto para el catálogo.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ModalProducto 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveProducto}
                producto={selectedProducto}
                disciplinas={disciplinas}
                loading={loading}
            />
        </div>
    );
}