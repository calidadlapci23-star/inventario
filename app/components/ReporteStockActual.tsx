'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Package, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  disciplina: string;
  stock_actual: number;
  alerta_minima: number;
  unidad_medida: string;
}

type SortField = 'nombre' | 'stock_actual' | 'disciplina';
type SortDirection = 'asc' | 'desc';

// ✅ Se define el componente como una función constante
const ReporteStockActual = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);
        const productosRef = collection(db, 'productos');
        const q = query(productosRef, orderBy(sortField, sortDirection));
        const querySnapshot = await getDocs(q);
        const productosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto));
        setProductos(productosData);
      } catch (error) {
        console.error("Error fetching stock report: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, [sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredProductos = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.disciplina.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
  };

   if (loading) {
    return <div className="text-center p-10 font-medium text-gray-600">Cargando reporte de stock...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
                type="text"
                placeholder="Buscar por nombre o disciplina..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
        </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                  {label: 'Nombre', field: 'nombre' as SortField},
                  {label: 'Stock Actual', field: 'stock_actual' as SortField},
                  {label: 'Disciplina', field: 'disciplina' as SortField},
                  {label: 'Unidad', field: null},
                  {label: 'Nivel de Alerta', field: null}
              ].map(({label, field}) => (
                 <th key={label} onClick={() => field && handleSort(field)} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${field ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                    <div className="flex items-center">
                        {label}
                        {field && <SortIcon field={field} />}
                    </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProductos.map(producto => (
              <tr key={producto.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{producto.nombre}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-lg font-bold ${producto.stock_actual <= producto.alerta_minima ? 'text-red-600' : 'text-gray-900'}`}>
                        {producto.stock_actual}
                    </div>
                </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                     <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {producto.disciplina}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{producto.unidad_medida}</td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{producto.alerta_minima}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProductos.length === 0 && (
             <div className="text-center py-10">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
                <p className="mt-1 text-sm text-gray-500">Intenta ajustar tu búsqueda.</p>
            </div>
        )}
      </div>
    </div>
  );
};

// ✅ Se exporta el componente por defecto al final del archivo
export default ReporteStockActual;
