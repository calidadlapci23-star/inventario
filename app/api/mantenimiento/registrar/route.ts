// app/api/mantenimiento/registrar/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/mantenimiento/registrar
 * Crea nuevos registros de mantenimiento para un conjunto de tareas.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { equipoId, tareasIds, fecha, realizadoPor } = body;

    // Validación básica de la entrada
    if (!equipoId || !Array.isArray(tareasIds) || tareasIds.length === 0 || !fecha || !realizadoPor) {
      return NextResponse.json({ error: 'Datos incompletos para el registro.' }, { status: 400 });
    }

    // Usar un lote de escritura para asegurar que todas las operaciones se completen o ninguna lo haga.
    const batch = db.batch();
    const registrosRef = db.collection('registros');
    
    // La fecha viene del cliente, nos aseguramos de que sea un objeto Date de Firestore
    const fechaRegistro = new Date(fecha);

    tareasIds.forEach((tareaId: string) => {
      const newRegistroRef = registrosRef.doc(); // Firestore generará un ID único
      batch.set(newRegistroRef, {
        equipoId,
        tareaId,
        fecha: fechaRegistro, // Almacenar como objeto Timestamp de Firestore
        realizadoPor,
        createdAt: FieldValue.serverTimestamp(), // Opcional: para saber cuándo se creó el registro
      });
    });

    await batch.commit();

    return NextResponse.json(
        { message: 'Mantenimiento registrado correctamente.', count: tareasIds.length }, 
        { status: 201 } // 201 Creado
    );

  } catch (error) {
    console.error("[API_REGISTRAR_POST_ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el servidor';
    return NextResponse.json(
        { error: 'Error al registrar el mantenimiento en Firestore', details: errorMessage }, 
        { status: 500 }
    );
  }
}
