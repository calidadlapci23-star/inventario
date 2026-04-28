'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext'; 
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
    LogOut, 
    HeartPulse, 
    ShoppingCart,
    PackagePlus, // Para Recepción
    PackageMinus, // Para Consumo
    Book, // Para Catálogo
    HardDrive, // Para Equipos
    ArrowRight
} from 'lucide-react';

const accionesRapidas = [
    { id: 'recepcion', href: '/TIBER/recepcion', icon: <PackagePlus className="w-7 h-7 text-blue-500"/>, titulo: 'Registrar Recepción' },
    { id: 'consumo', href: '/TIBER/consumo', icon: <PackageMinus className="w-7 h-7 text-red-500"/>, titulo: 'Registrar Consumo' },
];

const catalogos = [
  { id: 'productos', href: '/TIBER/productos-tiber', icon: <Book className="w-6 h-6 text-orange-600"/>, titulo: 'Catálogo de Productos' },
];


export default function TiberDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      setLoading(false);
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700 font-semibold">Cargando Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
            <HeartPulse className="w-10 h-10 text-blue-600"/>
            <h1 className="text-3xl font-bold text-gray-900">Centro Médico Tiber</h1>
        </div>
        <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 border border-red-200 rounded-lg hover:bg-red-200 transition-colors"
        >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
        </button>
      </header>

      <div className="space-y-8">
        {/* Banner de Solicitudes */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl">
                <ShoppingCart className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Solicitudes de Reactivos y Consumibles</h2>
                <p className="text-white/90 text-lg mt-1">Gestiona órdenes de compra y nuevos pedidos a proveedores.</p>
              </div>
            </div>
            <Link
              href="/TIBER/solicitudes"
              className="group flex items-center gap-3 bg-white text-green-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <span>Gestionar Solicitudes</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Contenido Principal: Acciones y Catálogos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Acciones Rápidas */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-5">Acciones Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accionesRapidas.map((accion) => (
                  <Link key={accion.id} href={accion.href} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50/90 transition-colors shadow-sm hover:shadow-md">
                      {accion.icon}
                      <span className="font-medium text-gray-800 text-lg">{accion.titulo}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Catálogos */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-5">Catálogos</h2>
              <div className="space-y-4">
                {catalogos.map((item) => (
                  <Link key={item.id} href={item.href} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50/90 transition-colors">
                      {item.icon}
                      <span className="font-semibold text-gray-700">{item.titulo}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Banner de Gestión de Equipos */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl">
                <HardDrive className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Gestión de Equipos</h2>
                <p className="text-white/90 text-lg mt-1">Administra el equipamiento y la instrumentación del laboratorio.</p>
              </div>
            </div>
            <Link
              href="/TIBER/equipos"
              className="group flex items-center gap-3 bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <span>Gestionar Equipos</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
