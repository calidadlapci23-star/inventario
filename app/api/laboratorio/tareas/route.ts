
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/laboratorio/tareas?equipoId=...
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const equipoId = searchParams.get('equipoId');

  if (!equipoId) {
    return NextResponse.json({ error: 'El ID del equipo es requerido' }, { status: 400 });
  }

  try {
    const tareas = await prisma.tarea.findMany({
      where: {
        equipoId: equipoId,
      },
      orderBy: {
        frecuencia: 'asc',
      },
    });
    return NextResponse.json(tareas);
  } catch (error) {
    console.error("Error al obtener las tareas:", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
