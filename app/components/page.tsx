'use client';

import { Package, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import DashboardCard from '@/app/components/DashboardCard';
import AlertCard from '@/app/components/AlertCard';
import QuickAction from '@/app/components/QuickAction';
import RecepcionOrdenesCompra from '@/app/components/RecepcionOrdenesCompra';

export default function DashboardPage() {
  // Datos de ejemplo (en una app real vendrían de una API)
  const dashboardStats = {
    productos: 156,
    stockBajo: 12,
    porVencer: 5,
    movimientosHoy: 23,
  };

  const alertasRecientes = [
    {
      tipo: 'stock-bajo' as const,
      titulo: 'Stock Bajo',
      descripcion: 'Quedan 5 pruebas disponibles',
    },
    {
      tipo: 'vencimiento' as const,
      titulo: 'Vencimiento Próximo',
      descripcion: 'Vence en 15 días',
    },
    {
      tipo: 'nuevo-lote' as const,
      titulo: 'Nuevo Lote Recibido',
      descripcion: 'Colesterol - Lote COL-2024-002',
    },
  ];

  const accionesRapidas = [
    {
      id: 1,
      titulo: 'Nueva Recepción',
      completado: true,
      href: '/inventario/recepcion',
      icon: '📦',
    },
    {
      id: 2,
      titulo: 'Registrar Consumo',
      completado: false,
      href: '/inventario/consumo',
      icon: '📝',
    },
    {
      id: 3,
      titulo: 'Ver Reportes',
      completado: false,
      href: '/inventario/reportes',
      icon: '📊',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Resumen del inventario del laboratorio</p>
      </div>

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          titulo="Productos"
          valor={dashboardStats.productos}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          color="blue"
        />
        <DashboardCard
          titulo="Stock Bajo"
          valor={dashboardStats.stockBajo}
          icon={<AlertTriangle className="h-6 w-6 text-amber-600" />}
          color="amber"
        />
        <DashboardCard
          titulo="Por Vencer"
          valor={dashboardStats.porVencer}
          icon={<Clock className="h-6 w-6 text-red-600" />}
          color="red"
        />
        <DashboardCard
          titulo="Movimientos Hoy"
          valor={dashboardStats.movimientosHoy}
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Acciones rápidas */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              {accionesRapidas.map((accion) => (
                <QuickAction key={accion.id} {...accion} />
              ))}
            </div>
          </div>
        </div>

        {/* Alertas recientes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Alertas Recientes</h2>
            <div className="space-y-4">
              {alertasRecientes.map((alerta, index) => (
                <AlertCard key={index} {...alerta} />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Nueva sección para RecepcionOrdenesCompra */}
      <div className="bg-white rounded-xl shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recepción de Órdenes de Compra</h2>
        <RecepcionOrdenesCompra />
      </div>

    </div>
  );
}