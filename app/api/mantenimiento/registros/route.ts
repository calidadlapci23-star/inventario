// app/api/mantenimiento/registros/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { equipoIdMapping } from '@/lib/equipoConfig';

/**
 * GET /api/mantenimiento/registros?equipoId=...&year=...&month=...
 * Obtiene los registros de mantenimiento para un equipo, mes y año específicos.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const equipoIdSlug = searchParams.get('equipoId'); // <-- PARÉNTESIS CORREGIDO
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!equipoIdSlug || !year || !month) {
      return NextResponse.json(
        { error: 'Los parámetros equipoId, year, y month son requeridos' },
        { status: 400 }
      );
    }

    const equipoId = (equipoIdMapping as { [key: string]: string })[equipoIdSlug] || equipoIdSlug;

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    // Se crean objetos Date, que el SDK de Admin convierte a Timestamps para la consulta.
    const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(yearNum, monthNum, 1)); // Apunta al inicio del siguiente mes

    const registrosRef = db.collection('registros');
    const snapshot = await registrosRef
      .where('equipoId', '==', equipoId)
      .where('fecha', '>=', startDate) // Se compara Timestamp con Date/Timestamp
      .where('fecha', '<', endDate)     // Se compara Timestamp con Date/Timestamp
      .get();

    if (snapshot.empty) {
      console.log(`No se encontraron registros para ${equipoId} en ${month}/${year}`);
      return NextResponse.json([]);
    }

    const registros = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Asegurarse de que el campo de fecha siempre se devuelva como string ISO
        fecha: data.fecha?.toDate ? data.fecha.toDate().toISOString() : data.fecha,
      };
    });

    return NextResponse.json(registros);

  } catch (error) {
    console.error("[API_REGISTROS_GET_ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el servidor';
    return NextResponse.json(
      { error: 'Error al obtener los registros desde Firestore', details: errorMessage },
      { status: 500 }
    );
  }
}
