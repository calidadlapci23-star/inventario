'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const equipos = [
  {
    id: 'abxpentra',
    nombre: 'ABX micros',
    imageUrl: '/abx.jpg',
  },
  {
    id: 'bs240',
    nombre: 'BS-240 Pro',
    imageUrl: '/bs240.jpg',
  },
];

export default function EquiposPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/TIBER/dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Volver al Dashboard
        </button>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">Gestión de Equipos</h1>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            Selecciona un equipo para registrar mantenimientos, ver bitácoras o reportar incidentes.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {equipos.map((equipo) => (
            <Link href={`/TIBER/equipos/${equipo.id}`} key={equipo.id} passHref>
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg group transform hover:-translate-y-2 transition-all duration-300 ease-in-out cursor-pointer border border-gray-100 hover:shadow-blue-200/50">
                <div className="relative w-full h-64 bg-gradient-to-br from-gray-50 to-gray-100">
                  <Image 
                    src={equipo.imageUrl} 
                    alt={equipo.nombre} 
                    layout="fill" 
                    objectFit="contain" 
                    className="p-8 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5 text-center">
                  <h2 className="text-xl font-bold text-gray-800">{equipo.nombre}</h2>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
