'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { Plus, Pencil, Trash2, X, Search, Package } from 'lucide-react';

// Interfaz del producto
interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  fabricante: string;
  categoria: string;
  alerta_minima: number;
  numero_pruebas: string;
  disciplina: string;
  proveedor: string;
  unidad_medida: string;
}

// Valores por defecto para un nuevo producto
const productoVacio: Omit<Producto, 'id'> = {
  nombre: '',
  codigo: '',
  fabricante: '',
  categoria: 'Reactivo',
  alerta_minima: 10,
  numero_pruebas: '',
  disciplina: '',
  proveedor: '',
  unidad_medida: 'unidades',
};

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [formData, setFormData] = useState<Omit<Producto, 'id'>>(productoVacio);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Cargar productos en tiempo real
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'productos'), orderBy('nombre', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          nombre: d.nombre || '',
          codigo: d.codigo || '',
          fabricante: d.fabricante || '',
          categoria: d.categoria || 'Reactivo',
          alerta_minima: d.alerta_minima || 10,
          numero_pruebas: d['# de Pruebas'] || d['# de pruebas'] || d.pruebas || '',
          disciplina: d.disciplina || '',
          proveedor: d.proveedor || '',
          unidad_medida: d.unidad_medida || 'unidades',
        } as Producto;
      });
      setProductos(data);
      
      // Si estamos editando, verificar si el producto aún existe
      if (editando) {
        const productoAunExiste = snapshot.docs.some(doc => doc.id === editando.id);
        if (!productoAunExiste) {
          cerrarModal();
          mostrarMensaje('error', 'El producto que estabas editando fue eliminado por otro usuario.');
        }
      }

      setLoading(false);
    }, (error) => {
      mostrarMensaje('error', `Error al cargar productos: ${error.message}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [editando]); // Agregamos `editando` a las dependencias

  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  const abrirModalNuevo = () => {
    setEditando(null);
    setFormData(productoVacio);
    setModalAbierto(true);
  };

  const abrirModalEditar = (producto: Producto) => {
    setEditando(producto);
    setFormData(producto);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value } as Omit<Producto, 'id'>));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      const dataToSave: any = {
        nombre: formData.nombre,
        codigo: formData.codigo,
        fabricante: formData.fabricante,
        categoria: formData.categoria,
        alerta_minima: Number(formData.alerta_minima) || 10,
        '# de Pruebas': formData.numero_pruebas,
        disciplina: formData.disciplina,
        proveedor: formData.proveedor,
        unidad_medida: formData.unidad_medida,
      };

      if (editando) {
        const docRef = doc(db, 'productos', editando.id);
        await updateDoc(docRef, {
          ...dataToSave,
          actualizadoEn: serverTimestamp(),
        });
        mostrarMensaje('exito', 'Producto actualizado correctamente');
      } else {
        await addDoc(collection(db, 'productos'), {
          ...dataToSave,
          stock_actual: 0,
          creadoEn: serverTimestamp(),
        });
        mostrarMensaje('exito', 'Producto creado correctamente');
      }
      cerrarModal();
    } catch (error: any) {
        if (error.code === 'not-found') {
            mostrarMensaje('error', 'Error: El producto ya no existe. La lista se ha actualizado.');
        } else {
            mostrarMensaje('error', `Error al guardar: ${error.message}`);
        }
    } finally {
      setProcesando(false);
    }
  };

  const eliminarProducto = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${nombre}"?`)) return;
    try {
      await deleteDoc(doc(db, 'productos', id));
      mostrarMensaje('exito', 'Producto eliminado');
    } catch (error: any) {
      mostrarMensaje('error', `Error al eliminar: ${error.message}`);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.disciplina.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="p-4 sm:p-6">
      {mensaje && (
        <div className={`mb-4 p-4 rounded-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="w-6 h-6" />
          Control de Productos (Reactivos)
        </h1>
        <button
          onClick={abrirModalNuevo}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>
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
      <div className="bg-white rounded-lg border overflow-hidden">
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-10">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Intenta con otra búsqueda' : 'Comienza agregando uno nuevo.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NOMBRE</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CÓDIGO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FABRICANTE</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"># PRUEBAS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DISCIPLINA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PROVEEDOR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UNIDAD MEDIDA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productosFiltrados.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{prod.nombre}</td>
                    <td className="px-4 py-3 text-sm">{prod.codigo}</td>
                    <td className="px-4 py-3 text-sm">{prod.fabricante}</td>
                    <td className="px-4 py-3 text-sm">{prod.numero_pruebas || '-'}</td>
                    <td className="px-4 py-3 text-sm">{prod.disciplina}</td>
                    <td className="px-4 py-3 text-sm">{prod.proveedor}</td>
                    <td className="px-4 py-3 text-sm">{prod.unidad_medida}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => abrirModalEditar(prod)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => eliminarProducto(prod.id, prod.nombre)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editando ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabricante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fabricante"
                  value={formData.fabricante}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  # de Pruebas
                </label>
                <input
                  type="text"
                  name="numero_pruebas"
                  value={formData.numero_pruebas}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. 24, 50, 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="disciplina"
                  value={formData.disciplina}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. INMUNOLOGIA, HEMATOLOGIA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="proveedor"
                  value={formData.proveedor}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <input
                  type="text"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alerta Mínima (Stock)
                </label>
                <input
                  type="number"
                  name="alerta_minima"
                  value={formData.alerta_minima}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de Medida
                </label>
                <select
                  name="unidad_medida"
                  value={formData.unidad_medida}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unidades">unidades</option>
                  <option value="cajas">cajas</option>
                  <option value="litros">litros</option>
                  <option value="mililitros">mililitros</option>
                  <option value="kits">kits</option>
                  <option value="Frascos">Frascos</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {procesando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}