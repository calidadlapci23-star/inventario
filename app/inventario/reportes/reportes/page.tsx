'use client';

import ReporteHistorico from '@/app/components/ReporteHistorico';
import ReporteStockActual from '@/app/components/ReporteStockActual';
import ReporteMovimientos from '@/app/components/ReporteMovimientos';
import ReporteReactivosEnUso from '@/app/components/ReporteReactivosEnUso';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History, BarChart4, TrendingUp, FlaskConical } from 'lucide-react';

type ReporteSeleccionado = 'stock' | 'historico' | 'movimientos' | 'reactivos-en-uso'; // Tipo actualizado

export default function ReportesPage() {
  const router = useRouter();
  const [reporteActivo, setReporteActivo] = useState<ReporteSeleccionado>('stock');

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between bg-white p-4 rounded-lg shadow-sm">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Central de Reportes
            </h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de inventario completo</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors self-start sm:self-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>

        {/* Menú de selección de reportes actualizado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button 
            onClick={() => setReporteActivo('stock')} 
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-semibold ${reporteActivo === 'stock' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'}`}
          >
            <BarChart4 className="w-5 h-5" />
            Stock Actual
          </button>
          <button 
            onClick={() => setReporteActivo('historico')} 
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-semibold ${reporteActivo === 'historico' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'}`}
          >
            <History className="w-5 h-5" />
            Historial
          </button>
          <button 
            onClick={() => setReporteActivo('movimientos')} 
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-semibold ${reporteActivo === 'movimientos' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'}`}
          >
            <TrendingUp className="w-5 h-5" />
            Movimientos
          </button>
          <button 
            onClick={() => setReporteActivo('reactivos-en-uso')} 
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-semibold ${reporteActivo === 'reactivos-en-uso' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'}`}
          >
            <FlaskConical className="w-5 h-5" />
            Reactivos en Uso
          </button>
        </div>

        {/* Área de contenido del reporte */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          {reporteActivo === 'stock' && <ReporteStockActual />}
          {reporteActivo === 'historico' && <ReporteHistorico />}
          {reporteActivo === 'movimientos' && <ReporteMovimientos />}
          {reporteActivo === 'reactivos-en-uso' && <ReporteReactivosEnUso />}
        </div>
      </div>
    </div>
  );
}