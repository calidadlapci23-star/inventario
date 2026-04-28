'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Array de equipos base para mayor mantenibilidad
const equiposBase = [
  { id: 'bftii', nombre: 'BFTII' },
  { id: 'centrifuga-horizon', nombre: 'CENTRIFUGA HORIZON' },
  { id: 'df50', nombre: 'DF50' },
  { id: 'easylite', nombre: 'EASYLITE' },
  { id: 'microscopio-bioblue', nombre: 'MICROSCOPIO BIOBLUE' },
  { id: 'microscopio-olympus', nombre: 'MICROSCOPIO OLYMPUS' },
  { id: 'us-1', nombre: 'US+1' }, // Se mantiene el id original, asumiendo que el archivo se llama 'us-1.png'
  { id: 'vidaskube', nombre: 'VIDASKUBE' },
  { id: 'vitros250', nombre: 'VITROS250' },
];

// Generar la lista de equipos completa con la URL de la imagen dinámica y correcta
const equipos = equiposBase.map(e => ({
  ...e,
  imageUrl: `/${e.id}.png` // Todas las imágenes son .png y coinciden con el id en minúsculas
}));

export default function MatrizEquiposPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push('/inventario/dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Volver al Dashboard
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">Gestión de Equipos - Matriz</h1>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            Selecciona un equipo del laboratorio Matriz para gestionar su mantenimiento y bitácoras.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {equipos.map((equipo) => (
            <Link href={`/matriz/equipos/${equipo.id}`} key={equipo.id} passHref>
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg group transform hover:-translate-y-2 transition-all duration-300 ease-in-out cursor-pointer border border-gray-100 hover:shadow-blue-200/50">
                <div className="relative w-full h-64 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                  {/* Componente Image de Next.js optimizado, sin el prop obsoleto 'objectFit' */}
                  <Image 
                    src={equipo.imageUrl} 
                    alt={equipo.nombre} 
                    width={200}
                    height={200}
                    className="group-hover:scale-105 transition-transform duration-300"_style={{objectFit:"contain"}} // Se usa style para compatibilidad
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
