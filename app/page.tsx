import { BarChart2, Repeat, Inbox, LayoutDashboard, Database, History, Users } from 'lucide-react';
import HomeCard from './components/HomeCard';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  const features = [
    {
      href: '/inventario/dashboard',
      icon: LayoutDashboard,
      title: 'Dashboard',
      description: 'Vista general del inventario',
    },
    {
      href: '/recepcion',
      icon: Inbox,
      title: 'Recepción',
      description: 'Registrar entrada de productos',
    },
    {
      href: '/inventario/consumo',
      icon: Repeat,
      title: 'Consumo',
      description: 'Registrar salida de productos',
    },
    {
      href: '/reportes',
      icon: BarChart2,
      title: 'Reportes',
      description: 'Generar reportes del sistema',
    },
    {
      href: '/inventario',
      icon: Database,
      title: 'Inventario',
      description: 'Ver productos por disciplina',
    },
    {
      href: '/historial',
      icon: History,
      title: 'Historial de Movimientos',
      description: 'Historial de transacciones',
    },
    {
      href: '/admin/usuarios',
      icon: Users,
      title: 'Gestión de Usuarios',
      description: 'Añadir o editar usuarios',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <main className="max-w-4xl w-full text-center">
        {/* Encabezado con Logo */}
        <header className="mb-10">
          <div className="relative w-[32rem] h-[16rem] mx-auto mb-4">
            <Image
              src="/logo.jpg"
              alt="Logo del Laboratorio"
              layout="fill"
              objectFit="contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight sm:text-5xl">
            Sistema de Gestión de Inventario
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Bienvenido al panel central para la administración de los recursos de nuestro laboratorio.
          </p>
        </header>

        {/* Grid de Funcionalidades */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link href={feature.href} key={feature.title}>
              <a className="group block p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-lg mx-auto mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
              </a>
            </Link>
          ))}
        </div>

        {/* Mensaje de Desarrollo */}
        <div className="mt-12 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
          <p>
            <span className="font-bold">Atención:</span> Este sistema se encuentra en desarrollo activo. Algunas funcionalidades pueden cambiar.
          </p>
        </div>
      </main>
    </div>
  );
}
