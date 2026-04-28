'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, BookText, AlertTriangle, FileText } from 'lucide-react';
import { equiposData } from '@/lib/equipos-data'; // CORREGIDO: Usamos la ruta absoluta con alias

const NavLink = ({ href, currentPath, children }) => {
  const router = useRouter();
  const isActive = currentPath === href;

  return (
    <button
      onClick={() => router.push(href)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
};

export default function EquipoLayout({ children }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const equipoId = params.id as string;

  // Leemos los datos del equipo desde el archivo centralizado
  const equipo = equiposData[equipoId];

  const baseEquipoPath = `/matriz/equipos/${equipoId}`;

  if (!equipo) {
    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold text-red-600">Error: Equipo no encontrado</h1>
            <p className="text-gray-500 mt-2">El equipo con ID "{equipoId}" no existe en la base de datos.</p>
            <button
              onClick={() => router.push('/matriz')}
              className="mt-6 flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              <ArrowLeft size={18} />
              Volver a la matriz
            </button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push('/matriz')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 mb-6"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <main className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                <Wrench className="w-8 h-8 text-gray-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{equipo.nombre}</h1>
                <p className="text-gray-600">Panel de control del equipo</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-200">
            <nav className="flex flex-wrap items-center gap-2">
                <NavLink href={`${baseEquipoPath}`} currentPath={pathname}>
                    <Wrench size={16} /> Registrar Mantenimiento
                </NavLink>
                <NavLink href={`${baseEquipoPath}/incidente`} currentPath={pathname}>
                    <AlertTriangle size={16} /> Registrar Incidente
                </NavLink>
                <NavLink href={`${baseEquipoPath}/bitacora`} currentPath={pathname}>
                    <BookText size={16} /> Ver Bitácora
                </NavLink>
                <NavLink href={`${baseEquipoPath}/reportes`} currentPath={pathname}>
                    <FileText size={16} /> Gestionar Reportes
                </NavLink>
            </nav>
          </div>

          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
