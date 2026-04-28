'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';

interface DisciplinaInfo {
    label: string;
}

interface ProductoTiber {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export default function DisciplinaPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const disciplina = params.disciplina as string;

    const [disciplinaInfo, setDisciplinaInfo] = useState<DisciplinaInfo | null>(null);
    const [productos, setProductos] = useState<ProductoTiber[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        const fetchData = async () => {
            if (!disciplina) return;
            setLoading(true);
            try {
                // 1. Asegurar que la colección de disciplinas exista (sembrado)
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
                    disciplinasIniciales.forEach(d => {
                        const docRef = doc(collection(db, 'disciplinas_tiber'));
                        batch.set(docRef, d);
                    });
                    await batch.commit();
                    console.log('Datos iniciales de disciplinas sembrados con éxito.');
                }

                // 2. Cargar la información de la disciplina y obtener su ID
                const disciplinaQuery = query(disciplinasRef, where('nombre', '==', decodeURIComponent(disciplina)));
                const disciplinaDocSnapshot = await getDocs(disciplinaQuery);

                let disciplinaId: string | null = null;
                if (!disciplinaDocSnapshot.empty) {
                    const disciplinaDoc = disciplinaDocSnapshot.docs[0];
                    disciplinaId = disciplinaDoc.id;
                    const found = disciplinaDoc.data();
                    setDisciplinaInfo({ label: found.nombre });
                } else {
                    setError(`La disciplina "${decodeURIComponent(disciplina)}" no fue encontrada. Revisa que el nombre sea correcto.`);
                    setLoading(false);
                    return;
                }

                // 3. Cargar los productos para esta disciplina
                if (disciplinaId) {
                    const productosQuery = query(
                        collection(db, 'productos_tiber'), 
                        where('disciplinaId', '==', disciplinaId),
                        where('activo', '==', true)
                    );
                    const productosSnapshot = await getDocs(productosQuery);
                    const productosList: ProductoTiber[] = productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductoTiber));
                    setProductos(productosList);
                }

            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Ocurrió un error al cargar los datos.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, router, disciplina]);

    if (loading) {
        return (
          <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto"/>
              <p className="mt-4 text-gray-700 font-semibold">Cargando...</p>
            </div>
          </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                <button 
                    onClick={() => router.push('/TIBER/productos-tiber')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium"
                >
                    <ArrowLeft size={20} />
                    Volver al Catálogo
                </button>

                {error && <div className="my-4 text-center p-3 bg-red-100 text-red-800 rounded-lg">{error}</div>}

                {disciplinaInfo && !error && (
                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
                        <div className="flex items-center gap-4 mb-6">
                             <div className="p-3 bg-blue-100 rounded-lg">
                                <FileText className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{disciplinaInfo.label}</h1>
                                <p className="text-gray-600">Catálogo de productos y análisis disponibles.</p>
                            </div>
                        </div>

                        {productos.length > 0 ? (
                            <div className="overflow-x-auto border-t border-gray-200 mt-6">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr className="text-sm text-gray-600">
                                            <th className="p-4 font-semibold">Nombre del Producto</th>
                                            <th className="p-4 font-semibold">Código</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productos.map(p => (
                                            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="p-4 font-medium text-gray-800">{p.nombre}</td>
                                                <td className="p-4 text-gray-600 font-mono">{p.codigo || 'N/A'}</td>
                                            </tr>
                                        ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center p-8 border-t border-gray-100 mt-6">
                                <h3 className="text-xl font-medium text-gray-700">No hay productos en esta disciplina</h3>
                                <p className="text-gray-500 mt-2">Aún no se han agregado productos a esta categoría.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
