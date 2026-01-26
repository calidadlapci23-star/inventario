// app/api/disciplinas/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'; // CAMBIO

export async function GET() {
  const supabase = createClient(); // CAMBIO
  try {
    // Consulta a la tabla disciplinas
    const { data: disciplinas, error } = await supabase // CAMBIO
      .from('disciplinas')
      .select('id, nombre, codigo')
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error cargando disciplinas desde Supabase:', error)
      // Si hay un error (ej. la tabla no existe), lanzamos el error para que el catch lo maneje
      throw error
    }

    return NextResponse.json({
      success: true,
      data: disciplinas || []
    })

  } catch (error: any) {
    console.error('Error en endpoint de disciplinas, recurriendo a datos de ejemplo:', error.message)
    
    // En cualquier entorno, si la BD falla, devolvemos datos de ejemplo para que la UI no se rompa.
    // Esto es especialmente útil en desarrollo.
    const fallbackData = [
      { id: 1, nombre: 'QUIMICA CLINICA', codigo: 'QC' },
      { id: 2, nombre: 'INMUNOLOGIA', codigo: 'INM' },
      { id: 3, nombre: 'UROANALISIS', codigo: 'UR' },
      { id: 4, nombre: 'HEMATOLOGIA', codigo: 'HEM' },
      { id: 5, nombre: 'COAGULACION', codigo: 'COAG' },
      { id: 6, nombre: 'MOLECULAR', codigo: 'MOL' },
      { id: 7, nombre: 'BACTERIOLOGIA', codigo: 'BACT' },
      { id: 8, nombre: 'PRUEBAS RAPIDAS', codigo: 'PR' },
      { id: 9, nombre: 'TOMA_MUESTRA', codigo: 'TM' }
    ];

    return NextResponse.json({
      success: true, // Devolvemos success true para que el frontend pueda renderizar los datos de fallback
      data: fallbackData,
      warning: 'Datos obtenidos de fallback. No se pudo conectar a la base de datos.'
    })
  }
}
