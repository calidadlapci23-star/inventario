import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebaseAdmin'; // Importar la instancia de DB

/**
 * GET /api/incidentes
 * Obtiene los incidentes para un equipo específico desde Firestore.
 * @param {Request} request - La solicitud HTTP, que debe incluir `equipoId` en la URL.
 * @returns {NextResponse} - Una respuesta JSON con la lista de incidentes.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const equipoId = searchParams.get('equipoId');

    if (!equipoId) {
        return NextResponse.json({ message: 'El ID del equipo es requerido' }, { status: 400 });
    }

    try {
        const incidentesCollection = db.collection('incidentes');
        const snapshot = await incidentesCollection.where('equipoId', '==', equipoId).orderBy('fecha', 'desc').get();

        if (snapshot.empty) {
            return NextResponse.json({ incidentes: [] });
        }

        const incidentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ incidentes });

    } catch (error) {
        console.error('Error al obtener incidentes de Firestore:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}

/**
 * POST /api/incidentes
 * Crea un nuevo incidente en Firestore.
 * @param {Request} request - La solicitud HTTP, que debe contener los datos del incidente en el cuerpo.
 * @returns {NextResponse} - El nuevo incidente creado o un mensaje de error.
 */
export async function POST(request: Request) {
    try {
        const { equipoId, detalle, estado, reportadoPor } = await request.json();

        if (!equipoId || !detalle || !estado || !reportadoPor) {
            return NextResponse.json({ message: 'Faltan campos requeridos para crear el incidente' }, { status: 400 });
        }

        const newIncident = {
            equipoId,
            detalle,
            estado,
            reportadoPor,
            fecha: new Date().toISOString(), // Usar ISO string para consistencia
        };

        const docRef = await db.collection('incidentes').add(newIncident);

        // Devolver el objeto completo con su nuevo ID
        return NextResponse.json({ id: docRef.id, ...newIncident }, { status: 201 });

    } catch (error) {
        console.error('Error al crear incidente en Firestore:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error al procesar la solicitud';
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}
