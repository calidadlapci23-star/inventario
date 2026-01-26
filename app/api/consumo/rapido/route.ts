import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'; // CAMBIO

export async function POST(request: NextRequest) {
  const supabase = createClient(); // CAMBIO
  try {
    const body = await request.json()
    
    // Validar datos
    const { producto_id, lote_id, cantidad, usuario } = body
    
    if (!producto_id || !lote_id || !cantidad || !usuario) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Procesar en una transacción
    const { data: resultado, error } = await supabase.rpc( // CAMBIO
      'procesar_consumo_rapido',
      {
        p_producto_id: producto_id,
        p_lote_id: lote_id,
        p_cantidad: cantidad,
        p_usuario: usuario
      }
    )

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Consumo rápido registrado',
      data: resultado
    })

  } catch (error: any) {
    console.error('Error en consumo rápido:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar consumo rápido' },
      { status: 500 }
    )
  }
}
