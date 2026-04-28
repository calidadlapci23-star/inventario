'use client';

import ReporteHistorico from '@/app/components/ReporteHistorico';
import ReporteStockActual from '@/app/components/ReporteStockActual';
import ReporteMovimientos from '@/app/components/ReporteMovimientos';
import ReporteReactivosEnUso from '@/app/components/ReporteReactivosEnUso';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History, BarChart4, TrendingUp, FlaskConical } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


export default function ReportesPage() {
  const router = useRouter();

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

        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 h-auto">
            <TabsTrigger value="stock" className="flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 hover:bg-blue-50 border border-gray-200 data-[state=active]:shadow">
              <BarChart4 className="w-5 h-5" />
              Stock Actual
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 hover:bg-blue-50 border border-gray-200 data-[state=active]:shadow">
              <History className="w-5 h-5" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="movimientos" className="flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 hover:bg-blue-50 border border-gray-200 data-[state=active]:shadow">
              <TrendingUp className="w-5 h-5" />
              Movimientos
            </TabsTrigger>
            <TabsTrigger value="reactivos-en-uso" className="flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 hover:bg-blue-50 border border-gray-200 data-[state=active]:shadow">
              <FlaskConical className="w-5 h-5" />
              Reactivos en Uso
            </TabsTrigger>
          </TabsList>
          <TabsContent value="stock" className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mt-4">
            <ReporteStockActual />
          </TabsContent>
          <TabsContent value="historico" className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mt-4">
            <ReporteHistorico />
          </TabsContent>
          <TabsContent value="movimientos" className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mt-4">
            <ReporteMovimientos />
          </TabsContent>
          <TabsContent value="reactivos-en-uso" className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mt-4">
            <ReporteReactivosEnUso />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
