'use client'

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '@/lib/supabase/client'; // Importa la instancia de DB de Firestore
import { collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Interfaces para el formulario y las opciones
interface RecepcionFormData {
  disciplina: string;
  producto: string;
  categoria: string;
  proveedor: string;
  lote: string;
  cantidad: number;
  unidad: string;
  piezasPorCaja?: number;
  fechaRecepcion: string;
  fechaVencimiento?: string;
  alertaMinima?: number;
  ubicacion?: string;
  observaciones?: string;
}

interface DisciplinaOption {
  id: string; // Los IDs de documento de Firestore son strings
  nombre: string;
}

export default function RecepcionForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [disciplinas, setDisciplinas] = useState<DisciplinaOption[]>([]);
  const [usuario, setUsuario] = useState('');

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<RecepcionFormData>();

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        // Cargar disciplinas desde Firestore
        const disciplinasCollection = collection(db, 'disciplinas');
        const disciplinaSnapshot = await getDocs(disciplinasCollection);
        if (!disciplinaSnapshot.empty) {
          const disciplinasData = disciplinaSnapshot.docs.map(doc => ({
            id: doc.id,
            nombre: doc.data().nombre,
          }));
          setDisciplinas(disciplinasData);
        }

        // Obtener usuario actual de Firebase Auth
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
          if (user) {
            setUsuario(user.email || 'Sistema');
          }
        });

      } catch (error) {
        console.error('Error cargando datos desde Firestore:', error);
      }
    };
    cargarDatosIniciales();
  }, []); // El efecto se ejecuta solo una vez

  const onSubmit = async (data: RecepcionFormData) => {
    setLoading(true);
    setSuccess(false);

    try {
      // Preparar datos para guardar en Firestore
      const recepcionData = {
        ...data,
        cantidad: parseInt(data.cantidad.toString(), 10),
        piezasPorCaja: data.piezasPorCaja ? parseInt(data.piezasPorCaja.toString(), 10) : null,
        alertaMinima: data.alertaMinima ? parseInt(data.alertaMinima.toString(), 10) : 0,
        registradoPor: usuario, // Guardar el email del usuario que registra
        fechaRegistro: new Date().toISOString(), // Añadir timestamp del registro
      };

      // Guardar el nuevo documento en la colección 'recepciones' de Firestore
      await addDoc(collection(db, "recepciones"), recepcionData);

      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);

    } catch (error) {
      alert('Error al registrar la recepción en Firestore');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const unidad = watch('unidad');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📦 Cargar Recepción</h2>
        <p className="text-gray-600">Registrar entrada de productos al inventario usando Firestore.</p>
      </div>

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg">
          ✅ Recepción registrada exitosamente en Firestore.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Disciplina */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Disciplina *</label>
          <select
            {...register('disciplina', { required: 'Selecciona una disciplina' })}
            className="w-full p-2 border rounded-lg"
          >
            <option value="">Seleccionar disciplina</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.nombre}> {/* Guardamos el nombre para simplificar */}
                {d.nombre}
              </option>
            ))}
          </select>
          {errors.disciplina && <p className="text-red-500 text-sm mt-1">{errors.disciplina.message}</p>}
        </div>

        {/* Producto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Producto *</label>
          <input
            type="text"
            {...register('producto', { required: 'Ingresa el nombre del producto' })}
            className="w-full p-2 border rounded-lg"
            placeholder="Ej: Tubos de ensayo"
          />
          {errors.producto && <p className="text-red-500 text-sm mt-1">{errors.producto.message}</p>}
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categoría *</label>
          <input
            type="text"
            {...register('categoria', { required: 'Ingresa la categoría' })}
            className="w-full p-2 border rounded-lg"
            placeholder="Ej: Material de laboratorio"
          />
          {errors.categoria && <p className="text-red-500 text-sm mt-1">{errors.categoria.message}</p>}
        </div>

        {/* Proveedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor *</label>
          <input
            type="text"
            {...register('proveedor', { required: 'Ingresa el proveedor' })}
            className="w-full p-2 border rounded-lg"
            placeholder="Ej: Proveedor S.A."
          />
          {errors.proveedor && <p className="text-red-500 text-sm mt-1">{errors.proveedor.message}</p>}
        </div>

        {/* Lote */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Número de Lote *</label>
          <input
            type="text"
            {...register('lote', { required: 'Ingresa el número de lote' })}
            className="w-full p-2 border rounded-lg"
            placeholder="Ej: LOT-2024-001"
          />
          {errors.lote && <p className="text-red-500 text-sm mt-1">{errors.lote.message}</p>}
        </div>

        {/* Cantidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad *</label>
          <input
            type="number"
            {...register('cantidad', { 
              required: 'Ingresa la cantidad',
              valueAsNumber: true,
              min: { value: 1, message: 'La cantidad debe ser mayor a 0' }
            })}
            className="w-full p-2 border rounded-lg"
            placeholder="Ej: 100"
          />
          {errors.cantidad && <p className="text-red-500 text-sm mt-1">{errors.cantidad.message}</p>}
        </div>

        {/* Unidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Unidad de Medida *</label>
          <select
            {...register('unidad', { required: 'Selecciona la unidad' })}
            className="w-full p-2 border rounded-lg"
          >
            <option value="">Seleccionar unidad</option>
            <option value="PIEZA">Pieza</option>
            <option value="CAJA">Caja</option>
            <option value="KIT">Kit</option>
            <option value="LITRO">Litro</option>
            <option value="METRO">Metro</option>
          </select>
          {errors.unidad && <p className="text-red-500 text-sm mt-1">{errors.unidad.message}</p>}
        </div>

        {/* Piezas por Caja */}
        {unidad === 'CAJA' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Piezas por Caja *</label>
            <input
              type="number"
              {...register('piezasPorCaja', { 
                required: unidad === 'CAJA' ? 'Ingresa piezas por caja' : false,
                valueAsNumber: true,
                min: { value: 1, message: 'Debe ser mayor a 0' }
              })}
              className="w-full p-2 border rounded-lg"
              placeholder="Ej: 50"
            />
            {errors.piezasPorCaja && <p className="text-red-500 text-sm mt-1">{errors.piezasPorCaja.message}</p>}
          </div>
        )}

        {/* Fecha Recepción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Recepción *</label>
          <input
            type="date"
            {...register('fechaRecepcion', { required: 'Selecciona la fecha' })}
            className="w-full p-2 border rounded-lg"
          />
          {errors.fechaRecepcion && <p className="text-red-500 text-sm mt-1">{errors.fechaRecepcion.message}</p>}
        </div>

        {/* Fecha Vencimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
          <input
            type="date"
            {...register('fechaVencimiento')}
            className="w-full p-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
        <textarea
          {...register('observaciones')}
          className="w-full p-2 border rounded-lg"
          rows={3}
          placeholder="Notas adicionales sobre la recepción..."
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Limpiar
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Procesando...' : 'Registrar Recepción'}
        </button>
      </div>
    </form>
  )
}
