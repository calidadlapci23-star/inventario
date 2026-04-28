// app/api/mantenimiento/tareas/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { equipoIdMapping } from '@/lib/equipoConfig';

/**
 * GET /api/mantenimiento/tareas?equipoId=...
 * Obtiene todas las tareas de mantenimiento para un equipo específico desde Firestore.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const equipoIdSlug = searchParams.get('equipoId');

    if (!equipoIdSlug) {
      return NextResponse.json(
        { error: 'El parámetro equipoId es requerido' },
        { status: 400 }
      );
    }

    // Usar el mapeo para obtener el ID de la base de datos
    const equipoId = (equipoIdMapping as { [key: string]: string })[equipoIdSlug] || equipoIdSlug;

    const tareasRef = db.collection('tareas');
    const snapshot = await tareasRef.where('equipoId', '==', equipoId).get();

    if (snapshot.empty) {
      console.log(`No se encontraron tareas para el equipoId: ${equipoId} (slug: ${equipoIdSlug})`);
      return NextResponse.json([]);
    }

    const tareas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(tareas);

  } catch (error) {
    console.error("[API_TAREAS_GET_ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el servidor';
    return NextResponse.json(
      { error: 'Error al obtener las tareas desde Firestore', details: errorMessage },
      { status: 500 }
    );
  }
}
