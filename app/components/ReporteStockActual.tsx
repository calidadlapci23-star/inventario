'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Package, Search, TestTube, AlertCircle } from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  disciplina: string;
  stock_actual: number;
  alerta_minima: number;
  unidad_medida: string;
  codigo?: string;
  proveedor: string;
  pruebas_por_caja?: number;
}

export default function StockActual() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const q = query(collection(db, 'productos'), orderBy('nombre', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Producto[];
        setProductos(data);
      } catch (error) {
        console.error('Error cargando productos:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarProductos();
  }, []);

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProductos = productos.length;
  const bajoStock = productos.filter(p => p.stock_actual <= p.alerta_minima).length;
  const stockTotalPruebas = productos.reduce(
    (acc, p) => acc + (p.stock_actual * (p.pruebas_por_caja || 1)),
    0
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Stock Actual de Productos
          </h1>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total productos</div>
            <div className="text-2xl font-bold text-gray-800">{totalProductos}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">En bajo stock</div>
            <div className="text-2xl font-bold text-amber-600">{bajoStock}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Pruebas totales</div>
            <div className="text-2xl font-bold text-blue-600">{stockTotalPruebas}</div>
          </div>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, proveedor, disciplina o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {productosFiltrados.length === 0 ? (
            <div className="text-center py-10">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">No se encontraron productos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disciplina</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock actual</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pruebas/caja</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productosFiltrados.map((p) => {
                    const alerta = p.stock_actual <= p.alerta_minima;
                    const pruebasTotales = p.stock_actual * (p.pruebas_por_caja || 1);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{p.nombre}</div>
                          {p.codigo && <div className="text-xs text-gray-500">{p.codigo}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{p.disciplina}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{p.proveedor}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            alerta ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {p.stock_actual} {p.unidad_medida}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {pruebasTotales} pruebas
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.pruebas_por_caja ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <TestTube className="w-4 h-4" />
                              <span className="text-sm">{p.pruebas_por_caja}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {alerta ? (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs">Bajo stock</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Normal</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
