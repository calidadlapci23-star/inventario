
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/laboratorio/registros?equipoId=...&year=...&month=...
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const equipoId = searchParams.get('equipoId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!equipoId || !year || !month) {
    return NextResponse.json({ error: 'equipoId, year y month son requeridos' }, { status: 400 });
  }

  try {
    const startDate = new Date(Number(year), Number(month), 1);
    const endDate = new Date(Number(year), Number(month) + 1, 0, 23, 59, 59);

    const registros = await prisma.registro.findMany({
      where: {
        equipoId: equipoId,
        fecha: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        tarea: true, // Incluir detalles de la tarea relacionada
      },
      orderBy: {
        fecha: 'asc',
      },
    });
    return NextResponse.json(registros);
  } catch (error) {
    console.error("Error al obtener los registros:", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
