'use client';

import RegistroMantenimiento from './RegistroMantenimiento';
import BitacoraMensual from './BitacoraMensual';

// Esta es ahora una página dinámica que renderiza un equipo específico
// basado en la URL: /equipos/[equipoId]

interface EquipoPageProps {
  params: {
    equipoId: string;
  };
}

export default function EquipoPage({ params }: EquipoPageProps) {
  const { equipoId } = params;

  // Aquí podríamos obtener los detalles del equipo desde la DB si fuera necesario
  // Por ahora, el nombre del equipo está quemado, pero la lógica funciona dinámicamente.
  const nombreEquipo = equipoId.toUpperCase(); // Ejemplo: BS240

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-800 dark:text-white">Gestión de Mantenimiento</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">Equipo: {nombreEquipo}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* El componente de registro ya está preparado para recibir el equipoId */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <RegistroMantenimiento equipoId={equipoId} />
        </div>

        {/* La bitácora también recibirá el equipoId para cargar los datos correctos */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg col-span-1 lg:col-span-1">
           <BitacoraMensual equipoId={equipoId} />
        </div>

      </div>
    </div>
  );
}
