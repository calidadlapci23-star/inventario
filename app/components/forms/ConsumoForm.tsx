'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { db, auth } from '@/lib/firebase' // CAMBIO: Usar Firebase
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Package } from 'lucide-react'

const consumoSchema = z.object({
  lote_id: z.string().min(1, 'Selecciona un lote'),
  cantidad: z.number()
    .min(1, 'La cantidad debe ser mayor a 0')
    .max(9999, 'Cantidad muy alta'),
  usuario: z.string().min(1, 'Ingresa tu nombre'),
  observaciones: z.string().optional(),
  es_apertura_lote: z.boolean().optional(),
})

type ConsumoFormData = z.infer<typeof consumoSchema>

interface ConsumoFormProps {
  producto: {
    id: string
    nombre: string
    disciplina_nombre: string
    unidad_medida: string
    alerta_minima: number
    lotes: Array<{
      id: string
      numero_lote: string
      cantidad_actual: number
      fecha_vencimiento: string
      estado: string
    }>
  }
  onSuccess?: () => void
}

export function ConsumoForm({ producto, onSuccess }: ConsumoFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usuarioActual, setUsuarioActual] = useState('')
  const [loteSeleccionado, setLoteSeleccionado] = useState<any>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ConsumoFormData>({
    resolver: zodResolver(consumoSchema),
    defaultValues: {
      usuario: '',
      cantidad: 1,
      es_apertura_lote: false,
    }
  })

  const loteId = watch('lote_id')
  const cantidad = watch('cantidad')

  useEffect(() => {
    // Obtener usuario actual con Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsuarioActual(user.email || 'Usuario')
        setValue('usuario', user.email || 'Usuario')
      }
    })
    return () => unsubscribe()
  }, [setValue])

  useEffect(() => {
    // Actualizar lote seleccionado
    if (loteId) {
      const lote = producto.lotes.find(l => l.id === loteId)
      setLoteSeleccionado(lote)
    }
  }, [loteId, producto.lotes])

  const onSubmit = async (data: ConsumoFormData) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const verificarPrimerUsoLote = async (loteId: string): Promise<boolean> => {
      try {
        const movimientosRef = collection(db, 'movimientos')
        const q = query(
          movimientosRef, 
          where('lote_id', '==', loteId), 
          where('tipo', '==', 'consumo'), 
          limit(1)
        )
        const querySnapshot = await getDocs(q)
        return querySnapshot.empty // Si no hay consumos previos, es primera vez
      } catch (err) {
        console.error('Error verificando uso de lote:', err)
        return false
      }
    }

    try {
      // 1. Verificar stock disponible
      const lote = producto.lotes.find(l => l.id === data.lote_id)
      if (!lote) {
        throw new Error('Lote no encontrado')
      }

      if (data.cantidad > lote.cantidad_actual) {
        throw new Error(`Stock insuficiente. Disponible: ${lote.cantidad_actual} ${producto.unidad_medida}`)
      }

      // 2. Verificar si es la primera vez que se usa este lote (apertura)
      const esPrimeraVez = await verificarPrimerUsoLote(data.lote_id)
      
      // 3. Registrar el consumo
      const response = await fetch('/api/consumo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          producto_id: producto.id,
          es_apertura_lote: esPrimeraVez,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        
        // Resetear formulario
        setValue('cantidad', 1)
        setValue('observaciones', '')
        
        // Ejecutar callback de éxito
        if (onSuccess) {
          setTimeout(onSuccess, 2000)
        }
      } else {
        setError(result.error || 'Error al registrar consumo')
      }
    } catch (error: any) {
      setError(error.message || 'Error al registrar consumo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          {/* Información del Producto */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-bold text-lg">{producto.nombre}</h3>
                <p className="text-gray-600">
                  {producto.disciplina_nombre} • 
                  Unidad: {producto.unidad_medida} • 
                  Alerta: {producto.alerta_minima}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg mb-4 flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>✅ Consumo registrado exitosamente</span>
            </div>
          )}

          {/* Selección de Lote */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Lote *
            </label>
            <select
              {...register('lote_id')}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Selecciona un lote</option>
              {producto.lotes.map((lote) => {
                const diasVencimiento = Math.ceil(
                  (new Date(lote.fecha_vencimiento).getTime() - new Date().getTime()) / 
                  (1000 * 60 * 60 * 24)
                )
                
                let label = `Lote: ${lote.numero_lote} - Stock: ${lote.cantidad_actual}`
                if (diasVencimiento <= 30) {
                  label += ` (Vence en ${diasVencimiento} días)`
                }
                
                return (
                  <option key={lote.id} value={lote.id}>
                    {label}
                  </option>
                )
              })}
            </select>
            {errors.lote_id && (
              <p className="text-red-500 text-sm mt-1">{errors.lote_id.message}</p>
            )}
          </div>

          {/* Información del Lote Seleccionado */}
          {loteSeleccionado && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-2">Información del Lote Seleccionado:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Número:</span>
                  <p className="font-medium">{loteSeleccionado.numero_lote}</p>
                </div>
                <div>
                  <span className="text-gray-600">Stock Disponible:</span>
                  <p className="font-medium">{loteSeleccionado.cantidad_actual} {producto.unidad_medida}</p>
                </div>
                <div>
                  <span className="text-gray-600">Fecha Vencimiento:</span>
                  <p className="font-medium">
                    {new Date(loteSeleccionado.fecha_vencimiento).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Estado:</span>
                  <p className="font-medium">{loteSeleccionado.estado}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad a Consumir *
            </label>
            <input
              type="number"
              {...register('cantidad', { valueAsNumber: true })}
              className="w-full p-3 border rounded-lg"
              min="1"
              max={loteSeleccionado?.cantidad_actual || 9999}
            />
            {errors.cantidad && (
              <p className="text-red-500 text-sm mt-1">{errors.cantidad.message}</p>
            )}
            {loteSeleccionado && (
              <p className="text-sm text-gray-500 mt-1">
                Máximo disponible: {loteSeleccionado.cantidad_actual} {producto.unidad_medida}
              </p>
            )}
          </div>

          {/* Usuario */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registrado por *
            </label>
            <input
              type="text"
              {...register('usuario')}
              className="w-full p-3 border rounded-lg"
              placeholder="Nombre del responsable"
            />
            {errors.usuario && (
              <p className="text-red-500 text-sm mt-1">{errors.usuario.message}</p>
            )}
          </div>

          {/* Observaciones */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              {...register('observaciones')}
              className="w-full p-3 border rounded-lg"
              rows={3}
              placeholder="Motivo del consumo, paciente, estudio, etc."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setValue('cantidad', 1)
                setValue('observaciones', '')
              }}
              disabled={loading}
            >
              Limpiar
            </Button>
            <Button
              type="submit"
              disabled={loading || !loteSeleccionado}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Procesando...' : 'Registrar Consumo'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}