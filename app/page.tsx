import { BarChart2, Repeat, Inbox, LayoutDashboard, Database, History } from 'lucide-react';
import HomeCard from './components/HomeCard';

export default function HomePage() {
  const features = [
    {
      href: '/inventario/dashboard',
      icon: LayoutDashboard,
      title: 'Dashboard',
      description: 'Vista general del inventario',
      color: 'bg-gradient-to-r from-blue-500 to-purple-600',
    },
    {
      href: '/recepcion',
      icon: Inbox,
      title: 'Recepción',
      description: 'Registrar entrada de productos',
      color: 'bg-gradient-to-r from-green-500 to-teal-600',
    },
    {
      href: '/inventario/consumo',
      icon: Repeat,
      title: 'Consumo',
      description: 'Registrar salida de productos',
      color: 'bg-gradient-to-r from-orange-500 to-red-600',
    },
    {
      href: '/reportes',
      icon: BarChart2,
      title: 'Reportes',
      description: 'Generar reportes del sistema',
      color: 'bg-gradient-to-r from-purple-500 to-pink-600',
    },
    {
      href: '/inventario',
      icon: Database,
      title: 'Inventario',
      description: 'Ver productos por disciplina',
      color: 'bg-gradient-to-r from-cyan-500 to-blue-600',
    },
    {
      href: '/historial',
      icon: History, // Icono más apropiado
      title: 'Historial de Movimientos',
      description: 'Historial de transacciones',
      color: 'bg-gradient-to-r from-gray-500 to-gray-600',
    },
  ];

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Bienvenido al Sistema de Inventario</h1>
        <p className="text-lg text-gray-600 mt-2">Selecciona una opción del menú para comenzar</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <HomeCard key={feature.title} {...feature} />
        ))}
      </div>

      <div className="mt-12 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700 rounded-lg">
        <p><b>Sistema en desarrollo.</b> Funcionalidades básicas disponibles.</p>
      </div>
    </div>
  );
}
