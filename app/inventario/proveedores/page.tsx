'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { Plus, Pencil, Trash2, X, Search, Building } from 'lucide-react';

// Interfaz del proveedor
interface Proveedor {
  id: string;
  inicioRelacion: string;
  idProveedor: string;
  razonSocial: string;
  rfc: string;
  direccion: string;
  giro: string;
  telefono: string;
  contacto: string;
  correo: string;
  regimenFiscal: string;
  credito: boolean;
  contado: boolean;
  fechaTerminoRelacion?: string;
  registro: string;
}

// Valores por defecto para un nuevo proveedor
const proveedorVacio: Omit<Proveedor, 'id'> = {
  inicioRelacion: '',
  idProveedor: '',
  razonSocial: '',
  rfc: '',
  direccion: '',
  giro: '',
  telefono: '',
  contacto: '',
  correo: '',
  regimenFiscal: '',
  credito: false,
  contado: true,
  fechaTerminoRelacion: '',
  registro: 'Sistema',
};

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState<Omit<Proveedor, 'id'>>(proveedorVacio);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      // La consulta a Firestore puede seguir usando su orderBy como una pre-clasificación
      const q = query(collection(db, 'proveedores'), orderBy('creadoEn', 'asc'));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Proveedor[];

      // Aplicar ordenamiento natural en el cliente
      data.sort((a, b) => {
        const numA = parseInt(a.idProveedor.split('-')[1] || '0', 10);
        const numB = parseInt(b.idProveedor.split('-')[1] || '0', 10);
        return numA - numB;
      });

      setProveedores(data);
    } catch (error: any) {
      mostrarMensaje('error', `Error al cargar proveedores: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  const abrirModalNuevo = () => {
    setEditando(null);
    setFormData(proveedorVacio);
    setModalAbierto(true);
  };

  const abrirModalEditar = (proveedor: Proveedor) => {
    setEditando(proveedor);
    const { id, ...rest } = proveedor;
    setFormData(rest);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      if (editando) {
        const docRef = doc(db, 'proveedores', editando.id);
        await updateDoc(docRef, { ...formData, actualizadoEn: serverTimestamp() });
        mostrarMensaje('exito', 'Proveedor actualizado correctamente');
      } else {
        await addDoc(collection(db, 'proveedores'), { ...formData, creadoEn: serverTimestamp() });
        mostrarMensaje('exito', 'Proveedor creado correctamente');
      }
      cerrarModal();
      cargarProveedores();
    } catch (error: any) {
      mostrarMensaje('error', `Error al guardar: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  const eliminarProveedor = async (id: string, razonSocial: string) => {
    if (!confirm(`¿Estás seguro de eliminar a "${razonSocial}"?`)) return;
    try {
      await deleteDoc(doc(db, 'proveedores', id));
      mostrarMensaje('exito', 'Proveedor eliminado');
      cargarProveedores();
    } catch (error: any) {
      mostrarMensaje('error', `Error al eliminar: ${error.message}`);
    }
  };

  const proveedoresFiltrados = proveedores.filter(p =>
    p.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.rfc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.idProveedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50/50 min-h-screen">
      {mensaje && (
        <div className={`mb-4 p-4 rounded-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Building className="w-8 h-8 text-blue-600" />
          Control de Proveedores
        </h1>
        <button
          onClick={abrirModalNuevo}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Nuevo Proveedor</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por Razón Social, RFC o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-md overflow-hidden">
        {proveedoresFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <Building className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-800">No se encontraron proveedores</h3>
            <p className="mt-2 text-md text-gray-500">
              {searchTerm ? 'Intenta con otra búsqueda o agrega un nuevo proveedor.' : 'Comienza agregando un nuevo proveedor.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Razón Social</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">RFC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Tipo de Pago</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Registro</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proveedoresFiltrados.map((prov, index) => (
                  <tr key={prov.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{prov.idProveedor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate font-medium">{prov.razonSocial}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prov.rfc}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate">{prov.contacto}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prov.telefono}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {prov.credito && <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Crédito</span>}
                      {prov.contado && <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Contado</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prov.registro}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => abrirModalEditar(prov)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Editar Proveedor"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => eliminarProveedor(prov.id, prov.razonSocial)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Eliminar Proveedor"
                      >
                        <Trash2 className="w-5 h-5" />
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b z-10">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </h2>
                    <button onClick={cerrarModal} className="text-gray-500 hover:text-gray-800 transition-colors rounded-full p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inicio de Relación</label>
                  <input type="text" name="inicioRelacion" value={formData.inicioRelacion} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ej. mayo 2012"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Proveedor <span className="text-red-500">*</span></label>
                  <input type="text" name="idProveedor" value={formData.idProveedor} onChange={handleChange} required className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ej. P-1"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social <span className="text-red-500">*</span></label>
                  <input type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange} required className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFC <span className="text-red-500">*</span></label>
                  <input type="text" name="rfc" value={formData.rfc} onChange={handleChange} required className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <textarea name="direccion" value={formData.direccion} onChange={handleChange} rows={2} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giro</label>
                  <input type="text" name="giro" value={formData.giro} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                  <input type="text" name="contacto" value={formData.contacto} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                  <input type="email" name="correo" value={formData.correo} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Régimen Fiscal</label>
                  <select name="regimenFiscal" value={formData.regimenFiscal} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecciona...</option>
                    <option value="601. GENERAL DE LEY PERSONAS MORALES">601 - General de Ley Personas Morales</option>
                    <option value="612. PERSONAS FISICAS CON ACTIVIDAD EMPRESARIAL">612 - Personas Físicas con Actividad Empresarial</option>
                    <option value="626. REGIMEN SIMPLIFICADO DE CONFIANZA">626 - Régimen Simplificado de Confianza</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex items-center gap-x-6 gap-y-3 flex-wrap">
                    <label className="text-sm font-medium text-gray-700">Tipo de Pago:</label>
                    <div className="flex items-center gap-2">
                        <input id="credito" type="checkbox" name="credito" checked={formData.credito} onChange={(e) => setFormData(prev => ({ ...prev, credito: e.target.checked, contado: e.target.checked ? false : prev.contado }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                        <label htmlFor="credito" className="text-sm text-gray-700">Crédito</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input id="contado" type="checkbox" name="contado" checked={formData.contado} onChange={(e) => setFormData(prev => ({ ...prev, contado: e.target.checked, credito: e.target.checked ? false : prev.credito }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                        <label htmlFor="contado" className="text-sm text-gray-700">Contado</label>
                    </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t">
                <button type="button" onClick={cerrarModal} className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">
                  {procesando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}