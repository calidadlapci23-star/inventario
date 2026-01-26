import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'; // CAMBIO

export async function POST(request: NextRequest) {
  const supabase = createClient(); // CAMBIO
  try {
    const body = await request.json()
    
    // Validar datos
    const { lote_id, cantidad, usuario, observaciones, producto_id, es_apertura_lote } = body
    
    if (!lote_id || !cantidad || !usuario || !producto_id) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // 1. Obtener información del lote
    const { data: lote, error: loteError } = await supabase // CAMBIO
      .from('lotes')
      .select('*')
      .eq('id', lote_id)
      .single()

    if (loteError) throw loteError

    // 2. Verificar stock disponible
    if (cantidad > lote.cantidad_actual) {
      return NextResponse.json(
        { 
          error: `Stock insuficiente. Disponible: ${lote.cantidad_actual}`,
          stock_disponible: lote.cantidad_actual
        },
        { status: 400 }
      )
    }

    // 3. Calcular nuevo stock
    const nuevoStock = lote.cantidad_actual - cantidad
    const nuevoEstado = nuevoStock <= 0 ? 'agotado' : 
                       nuevoStock <= 5 ? 'alerta' : 'activo'

    // 4. Actualizar lote
    const { data: loteActualizado, error: updateError } = await supabase // CAMBIO
      .from('lotes')
      .update({
        cantidad_actual: nuevoStock,
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lote_id)
      .select()
      .single()

    if (updateError) throw updateError

    // 5. Registrar movimiento de consumo
    const { error: movimientoError } = await supabase // CAMBIO
      .from('movimientos')
      .insert({
        tipo: 'consumo',
        lote_id: lote_id,
        cantidad: cantidad,
        usuario_id: usuario,
        observaciones: observaciones || 'Consumo diario',
      })

    if (movimientoError) throw movimientoError

    // 6. Si es primera vez usando el lote, registrar apertura
    if (es_apertura_lote) {
      const { error: aperturaError } = await supabase // CAMBIO
        .from('movimientos')
        .insert({
          tipo: 'apertura',
          lote_id: lote_id,
          cantidad: 0,
          usuario_id: usuario,
          observaciones: 'Apertura de nuevo lote',
        })

      if (aperturaError) {
        console.error('Error registrando apertura:', aperturaError)
      }
    }

    // 7. Si el lote se agotó, registrar agotamiento
    if (nuevoStock <= 0) {
      const { error: agotamientoError } = await supabase // CAMBIO
        .from('movimientos')
        .insert({
          tipo: 'agotamiento',
          lote_id: lote_id,
          cantidad: 0,
          usuario_id: usuario,
          observaciones: `Lote agotado - Stock anterior: ${lote.cantidad_actual}`,
        })

      if (agotamientoError) {
        console.error('Error registrando agotamiento:', agotamientoError)
      }

      // Crear alerta de agotamiento
      const { error: alertaError } = await supabase // CAMBIO
        .from('alertas')
        .insert({
          tipo: 'agotado',
          producto_id: producto_id,
          lote_id: lote_id,
          mensaje: `Lote ${lote.numero_lote} agotado`,
          prioridad: 'alta',
        })

      if (alertaError) {
        console.error('Error creando alerta:', alertaError)
      }
    }

    // 8. Si quedó en estado alerta, crear alerta
    if (nuevoEstado === 'alerta' && lote.estado !== 'alerta') {
      const { error: alertaError } = await supabase // CAMBIO
        .from('alertas')
        .insert({
          tipo: 'stock_bajo',
          producto_id: producto_id,
          lote_id: lote_id,
          mensaje: `Stock bajo en lote ${lote.numero_lote}: ${nuevoStock} unidades`,
          prioridad: 'media',
        })

      if (alertaError) {
        console.error('Error creando alerta de stock bajo:', alertaError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Consumo registrado exitosamente',
      data: {
        lote: loteActualizado,
        stock_anterior: lote.cantidad_actual,
        stock_actual: nuevoStock,
      }
    })

  } catch (error: any) {
    console.error('Error en consumo:', error)
    return NextResponse.json(
      { error: error.message || 'Error al registrar consumo' },
      { status: 500 }
    )
  }
}
