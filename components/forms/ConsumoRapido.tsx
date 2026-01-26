'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client' // CAMBIO
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  producto_id: z.string().min(1, 'Producto es requerido'),
  lote_id: z.string().min(1, 'Lote es requerido'),
  cantidad: z.number().min(1, 'Cantidad debe ser mayor a 0'),
  usuario: z.string().min(1, 'Usuario es requerido'),
})

interface Producto {
  id: string
  nombre: string
}

interface Lote {
  id: string
  numero_lote: string
  cantidad_actual: number
}

export function ConsumoRapido() {
  const supabase = createClient() // CAMBIO
  const [productos, setProductos] = useState<Producto[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [selectedProducto, setSelectedProducto] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      producto_id: '',
      lote_id: '',
      cantidad: 1,
      usuario: 'sistema', // O el usuario actual
    },
  })

  const productoId = watch('producto_id')

  useEffect(() => {
    const fetchProductos = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')
      if (data) setProductos(data)
    }
    fetchProductos()
  }, [supabase]) // CAMBIO: añadir supabase a las dependencias

  useEffect(() => {
    if (productoId) {
      const fetchLotes = async () => {
        const { data, error } = await supabase
          .from('lotes')
          .select('id, numero_lote, cantidad_actual')
          .eq('producto_id', productoId)
          .eq('estado', 'activo')
          .order('fecha_vencimiento')
        if (data) {
          setLotes(data)
          setValue('lote_id', '')
        }
      }
      fetchLotes()
    } else {
      setLotes([])
      setValue('lote_id', '')
    }
  }, [productoId, setValue, supabase]) // CAMBIO: añadir supabase a las dependencias

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      const response = await fetch('/api/consumo/rapido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar el consumo')
      }

      setSubmitMessage('Consumo registrado con éxito!')
      // Reset form or parts of it
      setValue('cantidad', 1)
    } catch (error: any) {
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto">
      <div>
        <Label htmlFor="producto_id">Producto</Label>
        <Controller
          name="producto_id"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un producto" />
              </SelectTrigger>
              <SelectContent>
                {productos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.producto_id && <p className="text-red-500 text-sm">{errors.producto_id.message}</p>}
      </div>

      <div>
        <Label htmlFor="lote_id">Lote</Label>
        <Controller
          name="lote_id"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value} disabled={!productoId || lotes.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un lote" />
              </SelectTrigger>
              <SelectContent>
                {lotes.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.numero_lote} (Stock: {l.cantidad_actual})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.lote_id && <p className="text-red-500 text-sm">{errors.lote_id.message}</p>}
      </div>

      <div>
        <Label htmlFor="cantidad">Cantidad</Label>
        <Controller
          name="cantidad"
          control={control}
          render={({ field }) => <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />}
        />
        {errors.cantidad && <p className="text-red-500 text-sm">{errors.cantidad.message}</p>}
      </div>
      
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registrando...' : 'Registrar Consumo'}
      </Button>

      {submitMessage && <p className="text-sm mt-4 p-2 bg-gray-100 rounded">{submitMessage}</p>}
    </form>
  )
}
