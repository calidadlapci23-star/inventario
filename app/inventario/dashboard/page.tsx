'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  Package, 
  ArrowRight, 
  TrendingUp, 
  FlaskConical, 
  AlertTriangle, 
  Clock, 
  Activity,
  LogOut,
  HeartPulse,
  Truck
} from 'lucide-react';
import { getDashboardStats, getSuministros, getAlertas } from '../../lib/inventario';

interface Alerta {
  id: string;
  tipo: 'stock' | 'vencimiento' | 'info' | 'error';
  titulo: string;
  descripcion: string;
  link?: string;
}

const catalogos = [
  { id: 'proveedores', href: '/inventario/proveedores', icon: '🚚', titulo: 'Proveedores' },
  { id: 'productos', href: '/inventario/productos', icon: '🧪', titulo: 'Productos' },
];

const accionesRapidas = [
    { id: 'recepcion', href: '/inventario/recepcion', icon: '📦', titulo: 'Registrar Recepción de Lote' },
    { id: 'consumo', href: '/inventario/consumo', icon: '📉', titulo: 'Registrar Consumo de Material' },
    { id: 'reportes', href: '/inventario/reportes', icon: '📊', titulo: 'Generar Reportes' },
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [dashboardStats, setDashboardStats] = useState({ productosActivos: 0, proveedoresActivos: 0, movimientosHoy: 0 });
  const [suministrosCount, setSuministrosCount] = useState(0);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if(user) {
      const fetchData = async () => {
        try {
          const [stats, suministrosData, alertasData] = await Promise.all([
            getDashboardStats(),
            getSuministros(),
            getAlertas(),
          ]);

          setDashboardStats(stats);
          setSuministrosCount(Array.isArray(suministrosData) ? suministrosData.length : 0);
          setAlertas(Array.isArray(alertasData) ? alertasData : []);

        } catch (error) {
          console.error("Error al cargar datos del dashboard:", error);
          // Mantener los valores por defecto en caso de error
          setDashboardStats({ productosActivos: 0, proveedoresActivos: 0, movimientosHoy: 0 });
          setSuministrosCount(0);
          setAlertas([]);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert('No se pudo cerrar la sesión. Por favor, inténtalo de nuevo.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
      return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard de Inventario
        </h1>
        <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 border border-red-200 rounded-lg hover:bg-red-200 transition-colors"
        >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
        </button>
      </header>

      <div className="space-y-6 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productos Activos</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{dashboardStats.productosActivos}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Proveedores Registrados</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{dashboardStats.proveedoresActivos}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Truck className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Movimientos Hoy</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{dashboardStats.movimientosHoy}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta destacada para Gestión de Suministros */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl">
                <FlaskConical className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Gestión de Suministros</h2>
                <p className="text-white/90 text-lg mt-1">
                  Hay {suministrosCount} tipos de suministros activos en tu inventario.
                </p>
              </div>
            </div>
            <Link
              href="/inventario/GestionSuministro"
              className="group flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <span>Ir a Gestión</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
              {/* Acciones Rápidas */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Acciones Rápidas</h2>
                <div className="space-y-3">
                  {accionesRapidas.map((accion) => (
                    <Link
                      key={accion.id}
                      href={accion.href}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl">{accion.icon}</span>
                      <span className="font-medium text-gray-700">{accion.titulo}</span>
                    </Link>
                  ))}
                </div>
              </div>
              {/* Catálogos */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Catálogos</h2>
                <div className="space-y-3">
                  {catalogos.map((catalogo) => (
                    <Link
                      key={catalogo.id}
                      href={catalogo.href}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl">{catalogo.icon}</span>
                      <span className="font-medium text-gray-700">{catalogo.titulo}</span>
                    </Link>
                  ))}
                </div>
              </div>
          </div>

          {/* Alertas y Notificaciones */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Alertas y Notificaciones</h2>
            <div className="space-y-4">
              {alertas.length === 0 ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  <p className="font-medium">Todo en orden</p>
                  <p className="text-sm">No hay alertas pendientes.</p>
                </div>
              ) : (
                alertas.map((alerta, idx) => {
                  const colorMap: Record<string, string> = {
                    stock: 'amber',
                    vencimiento: 'red',
                    info: 'blue',
                    error: 'gray',
                  };
                  const color = colorMap[alerta.tipo] || 'blue';
                  const bgColor = `bg-${color}-50`;
                  const borderColor = `border-${color}-200`;
                  const textColor = `text-${color}-800`;
                  const iconColor = `text-${color}-600`;

                  const Icon = alerta.tipo === 'stock' ? AlertTriangle :
                               alerta.tipo === 'vencimiento' ? Clock :
                               alerta.tipo === 'info' ? Activity :
                               AlertTriangle;

                  return (
                    <div key={idx} className={`flex items-start p-4 ${bgColor} border ${borderColor} rounded-lg`}>
                      <Icon className={`h-5 w-5 ${iconColor} mr-3 mt-0.5 flex-shrink-0`} />
                      <div>
                        <p className={`font-medium ${textColor}`}>{alerta.titulo}</p>
                        <p className={`text-sm ${textColor} mt-1`}>{alerta.descripcion}</p>
                        {alerta.link && (
                          <Link href={alerta.link} className={`text-sm font-medium underline mt-2 inline-block ${textColor}`}>
                            Ver detalles
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Banner para Gestión de Equipos */}
        <div className="bg-gradient-to-r from-gray-700 via-gray-900 to-black rounded-2xl shadow-xl p-8 text-white mt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl">
                <Activity className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Gestión de Equipos</h2>
                <p className="text-white/90 text-lg mt-1">
                  Registra mantenimientos y consulta bitácoras de los equipos.
                </p>
              </div>
            </div>
            <Link
              href="/matriz"
              className="group flex items-center gap-3 bg-white text-gray-800 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <span>Gestionar Equipos</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Botón Flotante para Centro Médico Tiber */}
      <Link 
          href="/TIBER/dashboard"
          className="group fixed bottom-8 right-8 bg-gradient-to-r from-teal-500 to-cyan-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 ease-in-out flex items-center justify-center"
      >
          <HeartPulse className="w-8 h-8" />
          <span className="absolute right-full mr-4 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Centro Médico Tiber
          </span>
      </Link>
    </div>
  );
}
