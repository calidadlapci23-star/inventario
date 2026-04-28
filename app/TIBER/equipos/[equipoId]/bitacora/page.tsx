'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { getDaysInMonth } from 'date-fns';
import { equiposConfig } from '@/lib/equipoConfig'; // La única fuente de verdad para los nombres

// --- Interfaces ---
interface Tarea {
  id: string;
  descripcion: string;
  frecuencia: string;
  equipoId: string;
}

interface Registro {
  id: string;
  tareaId: string;
  fecha: string; // Formato ISO devuelto por la API
  realizadoPor: string;
}

// --- Componente Principal (Versión Limpia) ---
export default function BitacoraPage() {
  const router = useRouter();
  const params = useParams();
  const equipoIdSlug = params.equipoId as string;

  // 1. Obtener la información del equipo de la configuración CENTRALIZADA
  const equipoInfo = equiposConfig[equipoIdSlug] || { nombre: equipoIdSlug.toUpperCase() };

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-indexed
  const [allTasks, setAllTasks] = useState<Tarea[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!equipoIdSlug) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    // 2. Llamar a las APIs ya corregidas que manejan la lógica de mapeo
    Promise.all([
      fetch(`/api/mantenimiento/tareas?equipoId=${equipoIdSlug}`, { signal: controller.signal }),
      fetch(`/api/mantenimiento/registros?equipoId=${equipoIdSlug}&year=${year}&month=${month + 1}`, { signal: controller.signal })
    ]).then(async ([tasksRes, registrosRes]) => {
      if (controller.signal.aborted) return;

      if (!tasksRes.ok) {
        const errorText = await tasksRes.text();
        throw new Error(`Error al cargar tareas (${tasksRes.status}): ${errorText}`);
      }
      if (!registrosRes.ok) {
        const errorText = await registrosRes.text();
        throw new Error(`Error al cargar registros (${registrosRes.status}): ${errorText}`);
      }

      const tasksData = await tasksRes.json();
      const registrosData = await registrosRes.json();

      setAllTasks(tasksData || []);
      setRegistros(registrosData || []);

    }).catch(err => {
      if (!controller.signal.aborted) {
        console.error("Error en useEffect de BitacoraPage:", err);
        setError(err.message);
      }
    }).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [equipoIdSlug, year, month]);

  const { dailyTasks, weeklyTasks, otherTasks } = useMemo(() => ({
    dailyTasks: allTasks.filter(t => t.frecuencia.toUpperCase() === 'DIARIO'),
    weeklyTasks: allTasks.filter(t => t.frecuencia.toUpperCase() === 'SEMANAL'),
    otherTasks: allTasks.filter(t => !['DIARIO', 'SEMANAL'].includes(t.frecuencia.toUpperCase())),
  }), [allTasks]);

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-full mx-auto">
        <header className="mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-2"><ArrowLeft size={16} /> Volver</button>
          {/* 3. El título se renderiza con el nombre correcto */}
          <h1 className="text-2xl font-bold text-gray-800">Centro de Mantenimiento - {equipoInfo.nombre}</h1>
          <p className="text-sm text-gray-500">Visualiza todas las frecuencias de mantenimiento para el mes seleccionado.</p>
        </header>

        <div className="bg-gray-50/70 p-3 rounded-md border border-gray-200/80 mb-6 flex items-center gap-4">
            <label className="font-semibold text-gray-700 text-sm">Seleccionar Mes y Año:</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input-class">
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>)}
            </select>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="input-class w-24" />
        </div>

        {loading && <div className="text-center py-10 font-medium text-gray-500">Cargando datos...</div>}
        {error && <div className="text-center py-10 text-red-500 font-bold">Error al cargar: {error}</div>}
        
        {!loading && !error && (
          <> 
            {allTasks.length > 0 ? (
                <div className="space-y-8">
                    <DailyMantenimientoTable tasks={dailyTasks} registros={registros} year={year} month={month} />
                    <WeeklyMantenimientoTable tasks={weeklyTasks} registros={registros} year={year} month={month} />
                    <OtherMantenimientoList tasks={otherTasks} />
                </div>
            ) : (
              <div className="text-center py-10 font-medium text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  No se encontraron tareas de mantenimiento para este equipo.
              </div>
            )}
          </>
        )}
      </div>
      <GlobalStyles />
    </div>
  );
}

// --- Sub-componentes (sin cambios, solo re-declarados para integridad) ---
function DailyMantenimientoTable({ tasks, registros, year, month }: { tasks: Tarea[], registros: Registro[], year: number, month: number }) {
    if (!tasks || tasks.length === 0) return null;
    const daysInMonth = getDaysInMonth(new Date(year, month));
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const registrosMap = useMemo(() => {
        const map = new Map<string, Set<number>>();
        registros.forEach(r => {
            const date = new Date(r.fecha);
            if (date.getUTCFullYear() === year && date.getUTCMonth() === month) {
                if (!map.has(r.tareaId)) map.set(r.tareaId, new Set());
                map.get(r.tareaId)!.add(date.getUTCDate());
            }
        });
        return map;
    }, [registros, year, month]);

    return (
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-2">Mantenimiento Diario</h2>
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold"><tr className="divide-x divide-gray-200"><th className="p-2 text-left min-w-[250px]">Tarea</th>{daysArray.map(day => <th key={day} className="p-2 text-center w-10 font-medium">{day}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-200">{tasks.map(task => (<tr key={task.id} className="divide-x divide-gray-200"><td className="p-2 font-medium text-gray-600 align-top">{task.descripcion}</td>{daysArray.map(day => (<td key={day} className="p-2 text-center">{registrosMap.get(task.id)?.has(day) ? <CheckCircle size={16} className="text-green-500 mx-auto" /> : <span className="text-gray-300">-</span>}</td>))}</tr>))}</tbody>
          </table>
        </div>
      </div>
    );
}

function WeeklyMantenimientoTable({ tasks, registros, year, month }: { tasks: Tarea[], registros: Registro[], year: number, month: number }) {
    if (!tasks || tasks.length === 0) return null;
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const startDayOfWeek = (firstOfMonth.getUTCDay() + 6) % 7;
    const daysInMonth = getDaysInMonth(firstOfMonth);
    const numWeeks = Math.ceil((startDayOfWeek + daysInMonth) / 7);
    const weeksArray = Array.from({ length: numWeeks }, (_, i) => i + 1);
    const registrosPorSemana = useMemo(() => {
        const map = new Map<string, Set<number>>();
        registros.forEach(r => {
            const date = new Date(r.fecha);
            if (date.getUTCFullYear() === year && date.getUTCMonth() === month) {
                const weekNumber = Math.floor((startDayOfWeek + date.getUTCDate() - 1) / 7) + 1;
                if (!map.has(r.tareaId)) map.set(r.tareaId, new Set());
                map.get(r.tareaId)!.add(weekNumber);
            }
        });
        return map;
    }, [registros, year, month, startDayOfWeek]);
    return (
        <div>
            <h2 className="text-base font-semibold text-gray-700 mb-2">Mantenimiento Semanal</h2>
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200"><table className="min-w-full text-xs"><thead className="bg-gray-50 text-gray-500 font-semibold"><tr className="divide-x divide-gray-200"><th className="p-2 text-left min-w-[250px]">Tarea</th>{weeksArray.map(week => <th key={week} className="p-2 text-center font-medium">Sem {week}</th>)}</tr></thead><tbody className="divide-y divide-gray-200">{tasks.map(task => (<tr key={task.id} className="divide-x divide-gray-200"><td className="p-2 font-medium text-gray-600 align-top">{task.descripcion}</td>{weeksArray.map(week => (<td key={week} className="p-2 text-center">{registrosPorSemana.get(task.id)?.has(week) ? <CheckCircle size={16} className="text-green-500 mx-auto" /> : <span className="text-gray-300">-</span>}</td>))}</tr>))}</tbody></table></div>
        </div>
    );
}

function OtherMantenimientoList({ tasks }: { tasks: Tarea[] }) {
    if (!tasks || tasks.length === 0) return null;
    const router = useRouter();
    return (
        <div>
            <h2 className="text-base font-semibold text-gray-700 mb-2">Otras Frecuencias</h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">{tasks.map(task => (<div key={task.id} className="p-3 flex justify-between items-center"><p className="font-medium text-sm text-gray-700">{task.descripcion}</p><span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{task.frecuencia}</span></div>))}</div>
        </div>
    );
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      .input-class { @apply block w-auto px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm; }
    `}</style>
  );
}
