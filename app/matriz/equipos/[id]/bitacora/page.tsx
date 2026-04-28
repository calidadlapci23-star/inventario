'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// DATOS DE EJEMPLO
// En una aplicación real, estos datos vendrían de la base de datos
const dailyTasks = [
  { id: 'd1', tarea: 'Aplicar solucion de limpieza/aclarado.' },
  { id: 'd2', tarea: 'Sustituir paquete de soluciones' },
];

const maintenanceRecords = {
  '2024-07-01': ['d1', 'd2'],
  '2024-07-03': ['d1'],
  '2024-07-05': ['d1', 'd2'],
  '2024-07-08': ['d2'],
  '2024-07-15': ['d1', 'd2'],
  '2024-07-22': ['d1'],
  '2024-07-30': ['d1', 'd2'],
};

const BitacoraMensual = () => {
  const [date, setDate] = useState(new Date());

  const month = date.getMonth();
  const year = date.getFullYear();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const handlePrevMonth = () => {
    setDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setDate(new Date(year, month + 1, 1));
  };

  const getDayOfWeek = (day) => {
    const dayIndex = new Date(year, month, day).getDay();
    const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return days[dayIndex];
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Bitácora Mensual de Mantenimiento</h2>
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="p-2 rounded-md hover:bg-gray-100">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-semibold text-gray-700 w-32 text-center">
            {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date)}
          </span>
          <button onClick={handleNextMonth} className="p-2 rounded-md hover:bg-gray-100">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border border-gray-200 font-semibold text-gray-600 text-left sticky left-0 bg-gray-50 z-10 min-w-[250px]">Tarea de Mantenimiento</th>
              {[...Array(daysInMonth).keys()].map(day => (
                <th key={day} className="p-2 border border-gray-200 font-medium text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500">{getDayOfWeek(day + 1)}</span>
                    <span>{day + 1}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dailyTasks.map(task => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="p-2 border border-gray-200 font-medium text-gray-800 sticky left-0 bg-white z-10 min-w-[250px]">{task.tarea}</td>
                {[...Array(daysInMonth).keys()].map(day => {
                  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
                  const isCompleted = maintenanceRecords[dateString]?.includes(task.id);
                  return (
                    <td key={day} className="p-2 border border-gray-200 text-center">
                      {isCompleted && <span className="font-bold text-blue-600">R</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BitacoraMensual;
