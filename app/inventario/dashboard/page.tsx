'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  where, 
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { Package, Clock, TrendingUp, AlertTriangle, Activity, FlaskConical, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardInventarioPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    productos: 0,
    porVencer: 0,
    movimientosHoy: 0,
  });
  const [alertas, setAlertas] = useState<Array<{tipo: string, titulo: string, descripcion: string, link?: string}>>([]);
  const [stockBajoCount, setStockBajoCount] = useState(0);
  const [suministrosCount, setSuministrosCount] = useState(0); // Para la tarjeta de suministros

  const accionesRapidas = [
    {
      id: 1,
      titulo: 'Nueva Recepción',
      href: '/inventario/recepcion',
      icon: '📦',
    },
    {
      id: 2,
      titulo: 'Registrar Consumo',
      href: '/inventario/consumo',
      icon: '📝',
    },
    {
      id: 3,
      titulo: 'Ver Reportes',
      href: '/inventario/reportes/reportes',
      icon: '📊',
    },
    // Se eliminó "Reactivos en Uso"
    // Se mantiene "Gestión de Suministros" pero ahora se mostrará en una tarjeta especial
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // 1. Contar productos totales
        const productosRef = collection(db, 'productos');
        const productosSnapshot = await getDocs(productosRef);
        const totalProductos = productosSnapshot.size;

        // 2. Contar productos con stock bajo (para alerta)
        let stockBajo = 0;
        productosSnapshot.forEach(doc => {
          const data = doc.data();
          const stock = data.stock_actual || 0;
          const alerta = data.alerta_minima || 10;
          if (stock <= alerta) stockBajo++;
        });
        setStockBajoCount(stockBajo);

        // 3. Productos por vencer (próximos 30 días)
        const hoy = new Date();
        const dentro30Dias = new Date();
        dentro30Dias.setDate(hoy.getDate() + 30);

        const lotesRef = collection(db, 'lotes');
        const lotesQuery = query(
          lotesRef,
          where('fecha_vencimiento', '>=', hoy.toISOString().split('T')[0]),
          where('fecha_vencimiento', '<=', dentro30Dias.toISOString().split('T')[0]),
          where('estado', '!=', 'CERRADO')
        );
        const lotesSnapshot = await getDocs(lotesQuery);
        const porVencer = lotesSnapshot.size;

        // 4. Movimientos de hoy
        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);
        const finHoy = new Date();
        finHoy.setHours(23, 59, 59, 999);

        const movimientosRef = collection(db, 'movimientos');
        const movimientosQuery = query(
          movimientosRef,
          where('fecha', '>=', Timestamp.fromDate(inicioHoy)),
          where('fecha', '<=', Timestamp.fromDate(finHoy))
        );
        const movimientosSnapshot = await getDocs(movimientosQuery);
        const movimientosHoy = movimientosSnapshot.size;

        setDashboardStats({
          productos: totalProductos,
          porVencer,
          movimientosHoy,
        });

        // 5. Contar suministros (por ejemplo, productos con categoría "suministro")
        // Ajusta según tu estructura real. Si no existe, se puede omitir o usar 0.
        try {
          const suministrosQuery = query(
            productosRef,
            where('categoria', '==', 'suministro') // Ejemplo: categoría = 'suministro'
          );
          const suministrosSnapshot = await getDocs(suministrosQuery);
          setSuministrosCount(suministrosSnapshot.size);
        } catch (e) {
          // Si no existe el campo categoría, simplemente no se muestra
          setSuministrosCount(0);
        }

        // 6. Construir alertas dinámicas
        const nuevasAlertas = [];

        if (stockBajo > 0) {
          nuevasAlertas.push({
            tipo: 'stock',
            titulo: 'Stock Bajo',
            descripcion: `${stockBajo} producto(s) tienen stock bajo y requieren atención.`,
            link: '/inventario/productos?filtro=stockBajo'
          });
        }

        if (porVencer > 0) {
          nuevasAlertas.push({
            tipo: 'vencimiento',
            titulo: 'Productos por Vencer',
            descripcion: `${porVencer} lote(s) están próximos a vencer (próximos 30 días).`,
            link: '/inventario/lotes?filtro=porVencer'
          });
        }

        setAlertas(nuevasAlertas);

      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        setDashboardStats({ productos: 0, porVencer: 0, movimientosHoy: 0 });
        setStockBajoCount(0);
        setAlertas([{
          tipo: 'error',
          titulo: 'Error de conexión',
          descripcion: 'No se pudieron cargar los datos en tiempo real. Verifica Firebase.',
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8 bg-gray-50/50 min-h-screen">
      {/* Logo */}
      <div className="flex justify-start mb-4">
        <div className="relative w-[32rem] h-[16rem]">
          <Image
            src="/logo.jpg"
            alt="Logo del Laboratorio"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      <div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Dashboard de Inventario</h1>
        <p className="text-gray-600 mt-2 text-lg">Resumen del estado actual del inventario del laboratorio.</p>
      </div>

      {/* Estadísticas principales (3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Productos Totales</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{dashboardStats.productos}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Por Vencer (30 días)</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{dashboardStats.porVencer}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Clock className="h-8 w-8 text-red-600" />
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
                {suministrosCount > 0 
                  ? `${suministrosCount} suministros activos en inventario` 
                  : 'Accede al módulo de gestión de suministros'}
              </p>
            </div>
          </div>
          <Link
            href="/inventario/GestionSuministro"
            className="group flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <span>Ir a Gestión de Suministros</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acciones Rápidas (solo 3 acciones) */}
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
    </div>
  );
}