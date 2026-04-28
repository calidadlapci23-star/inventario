'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Package, Search, Building, AlertCircle } from 'lucide-react';

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

const ReporteStockActual = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'nombre' | 'stock_actual' | 'disciplina'>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);
        setError(null);

        const productosRef = collection(db, 'productos');
        const q = query(productosRef, orderBy(sortField, sortDirection));
        const snapshot = await getDocs(q);

        const productosData = snapshot.docs.map(doc => {
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
      } catch (err: any) {
        console.error('Error al cargar productos:', err);
        setError(err.message || 'Error al cargar los productos');
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, [sortField, sortDirection]);

  const handleSort = (field: 'nombre' | 'stock_actual' | 'disciplina') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredProductos = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start">
        <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Error al cargar los datos</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Reporte de Stock Actual</h1>
        <p className="text-gray-600">Listado completo de productos con existencias</p>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código, disciplina o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('nombre')}
                  >
                    Producto {sortField === 'nombre' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('stock_actual')}
                  >
                    Stock {sortField === 'stock_actual' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('disciplina')}
                  >
                    Disciplina {sortField === 'disciplina' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProductos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{producto.nombre}</div>
                      {producto.fabricante && (
                        <div className="text-sm text-gray-500">Fabricante: {producto.fabricante}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          producto.stock_actual === 0
                            ? 'bg-red-100 text-red-800'
                            : producto.stock_actual <= producto.alerta_minima
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {producto.stock_actual} {producto.unidad_medida}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Alerta mínima: {producto.alerta_minima} {producto.unidad_medida}
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
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {producto.codigo || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {productos.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Mostrando {filteredProductos.length} de {productos.length} productos
        </div>
      )}
    </div>
  );
};

export default ReporteStockActual;