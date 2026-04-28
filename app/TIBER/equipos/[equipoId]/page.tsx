
// app/TIBER/equipos/[equipoId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, CheckSquare, Square, X, CheckCircle, AlertCircle, Loader, Wrench, BookOpen, FileUp, Save, AlertTriangle, Clock } from 'lucide-react';

// --- Interfaces ---
interface Tarea {
  id: string;
  descripcion: string;
  frecuencia: string;
}

interface Incidente {
    id: string;
    equipoId: string;
    detalle: string;
    estado: 'PENDIENTE' | 'ATENDIDO';
    reportadoPor: string;
    fecha: string;
}

// --- Configuración ---
const equiposConfig: { [key: string]: { nombre: string, imageUrl?: string } } = {
  bs240: { nombre: 'BS-240 Pro', imageUrl: '/bs240.jpg' },
  abxpentra: { nombre: 'ABX microes', imageUrl: '/abx.jpg' },
};

// --- Componente Principal ---
export default function EquipoHubPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const equipoId = params.equipoId as string;
  const apiEquipoId = equipoId === 'abxpentra' ? 'ABX microes' : equipoId;

  // --- Estados ---
  const [activeTab, setActiveTab] = useState('registrar');
  const [allTasks, setAllTasks] = useState<Tarea[]>([]);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const equipoInfo = equiposConfig[equipoId] || { nombre: equipoId };

  // --- Carga de Datos ---
  const fetchIncidentes = useCallback(async () => {
      if (!apiEquipoId) return;
      try {
          const response = await fetch(`/api/incidentes?equipoId=${apiEquipoId}`);
          if(response.ok) {
            const data = await response.json();
            setIncidentes(data.incidentes || []);
          }
      } catch (error) {
          console.error("Error al cargar incidentes:", error);
          setNotification({ type: 'error', message: 'No se pudieron cargar los incidentes.' });
      }
  }, [apiEquipoId]);

  useEffect(() => {
    if (apiEquipoId) {
      setPageLoading(true);
      Promise.all([
        fetch(`/api/mantenimiento/tareas?equipoId=${apiEquipoId}`).then(res => res.ok ? res.json() : Promise.resolve([])),
        fetchIncidentes()
      ]).then(([tareasData]) => {
          setAllTasks(tareasData || []);
      }).catch(err => {
          console.error("Error inicial de carga:", err);
          setNotification({ type: 'error', message: 'Error al cargar datos del equipo.' });
      }).finally(() => {
          setPageLoading(false);
      });
    }
  }, [apiEquipoId, fetchIncidentes]);

  useEffect(() => {
    if(activeTab === 'incidente'){
        fetchIncidentes();
    }
  }, [activeTab, fetchIncidentes]);
  
  // --- Handlers ---
  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(t => t !== taskId) : [...prev, taskId]
    );
  };
  
  const toggleAllTasksInSection = (taskIdsInSection: string[]) => {
    const allSelected = taskIdsInSection.every(taskId => selectedTasks.includes(taskId));
    if (allSelected) {
        setSelectedTasks(prev => prev.filter(id => !taskIdsInSection.includes(id)));
    } else {
        setSelectedTasks(prev => [...new Set([...prev, ...taskIdsInSection])]);
    }
  };

  const handleMantenimientoSubmit = async () => {
    if (selectedTasks.length === 0) {
      setNotification({ type: 'error', message: 'Debes seleccionar al menos una tarea.' });
      return;
    }
    if (!user) {
      setNotification({ type: 'error', message: 'No se ha podido identificar al usuario.' });
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      // ***** LA CORRECCIÓN CLAVE ESTÁ AQUÍ *****
      const response = await fetch('/api/mantenimiento/registrar', { // URL corregida
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          tareasIds: selectedTasks, 
          realizadoPor: user.email || 'Usuario Desconocido',
          equipoId: apiEquipoId,
        })
      });

      if (response.ok) {
        setNotification({ type: 'success', message: `Registro de mantenimiento para ${equipoInfo.nombre} guardado con éxito.` });
        setSelectedTasks([]); // Limpiar selección
      } else {
        const errorData = await response.json();
        setNotification({ type: 'error', message: `Error: ${errorData.error || 'No se pudo guardar el registro'}` });
      }
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', message: 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  }; 

  const handleIncidenteSubmit = async ({ detalle, estado }: { detalle: string, estado: string}) => {
     if (!detalle || !user) {
        setNotification({ type: 'error', message: 'Faltan datos para reportar el incidente.' });
        return;
     }
    setLoading(true);
    setNotification(null);
    try {
        const response = await fetch('/api/incidentes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equipoId: apiEquipoId, detalle, estado, reportadoPor: user.email })
        });
        if(response.ok){
            const nuevoIncidente = await response.json();
            setIncidentes(prev => [nuevoIncidente, ...prev]);
            setNotification({ type: 'success', message: 'Incidente reportado correctamente.' });
            return true; // Indicar éxito para limpiar el form
        } else {
            const errorData = await response.json();
            setNotification({ type: 'error', message: errorData.message || 'Error al guardar el incidente'});
            return false;
        }
    } catch (error) {
        setNotification({ type: 'error', message: 'Error de conexión'});
        return false;
    } finally {
        setLoading(false);
    }
  }

  // --- Renderizado (sin cambios) ---
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto pb-12">
        <button onClick={() => router.push('/TIBER/equipos')} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft size={18} /> Volver
        </button>

        {pageLoading ? (
            <div className="flex justify-center items-center h-64"><Loader className="animate-spin" /> Cargando...</div>
        ) : (
            <div className="bg-white rounded-2xl shadow-lg">
              <div className="p-6 sm:p-8 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    {equipoInfo.imageUrl && <Image src={equipoInfo.imageUrl} alt={equipoInfo.nombre} width={50} height={50} className="rounded-lg" />}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{equipoInfo.nombre}</h1>
                        <p className="text-gray-500">Panel de control del equipo</p>
                    </div>
                </div>
              </div>

              <div className="p-4 flex items-center border-b border-gray-200 bg-gray-50/50 overflow-x-auto">
                 <nav className="flex gap-2 sm:gap-4">
                    <button onClick={() => setActiveTab('registrar')} className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold transition-colors whitespace-nowrap ${activeTab === 'registrar' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                        <Wrench size={18}/> Registrar Mantenimiento
                    </button>
                    <button onClick={() => setActiveTab('incidente')} className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold transition-colors whitespace-nowrap ${activeTab === 'incidente' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                        <AlertTriangle size={18}/> Registrar Incidente
                    </button>
                    <Link href={`/TIBER/equipos/${equipoId}/bitacora`} className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold text-gray-600 hover:bg-gray-200 whitespace-nowrap`}>
                        <BookOpen size={18}/> Ver Bitácora
                    </Link>
                    <button onClick={() => setActiveTab('reportes')} className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold transition-colors whitespace-nowrap ${activeTab === 'reportes' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                        <FileUp size={18}/> Gestionar Reportes
                    </button>
                </nav>
              </div>

              <div className="p-6 sm:p-8">
                {activeTab === 'registrar' && <RegistrarMantenimientoTab tasks={allTasks} selectedTasks={selectedTasks} fecha={fecha} setFecha={setFecha} handleSubmit={handleMantenimientoSubmit} loading={loading} notification={notification} setNotification={setNotification} toggleTask={toggleTask} toggleAllTasksInSection={toggleAllTasksInSection}/>}
                {activeTab === 'incidente' && <RegistrarIncidenteTab equipoId={equipoId} user={user} handleIncidenteSubmit={handleIncidenteSubmit} loading={loading} notification={notification} setNotification={setNotification} incidentes={incidentes} />}
                {activeTab === 'reportes' && <GestionarReportesTab equipoId={equipoId} />}
              </div>
            </div>
        )}
      </div>
    </div>
  );
}

// --- Pestaña: Registrar Mantenimiento ---
function RegistrarMantenimientoTab({ tasks, selectedTasks, fecha, setFecha, handleSubmit, loading, notification, setNotification, toggleTask, toggleAllTasksInSection }: any) {
  
  const groupTasksByFrequency = (tasks: Tarea[]) => {
    return tasks.reduce<Record<string, Tarea[]>>((acc, task) => {
      const frecuencia = task.frecuencia ? task.frecuencia.toUpperCase() : 'IRREGULAR';
      if (!acc[frecuencia]) { acc[frecuencia] = []; }
      acc[frecuencia].push(task);
      return acc;
    }, {});
  };

  const groupedTasks = groupTasksByFrequency(tasks);
  const frecuenciaTitulos: Record<string, string> = {
      DIARIO: "Mantenimiento Diario",
      SEMANAL: "Mantenimiento Semanal",
      MENSUAL: "Mantenimiento Mensual",
      TRIMESTRAL: "Mantenimiento Trimestral",
      SEMESTRAL: "Mantenimiento Semestral",
      ANUAL: "Mantenimiento Anual",
      IRREGULAR: "Mantenimiento Irregular o Correctivo"
  };

  return (
    <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label htmlFor="fecha-mantenimiento" className="font-medium text-gray-700 whitespace-nowrap">Fecha de Registro:</label>
            <input id="fecha-mantenimiento" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-class w-full sm:w-auto" />
        </div>
        <p className="text-gray-600 mt-4">Selecciona las tareas realizadas en la fecha indicada.</p>
        
        {tasks.length === 0 ? (
            <div className="mt-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg p-10">
                <p className="font-medium">No hay tareas de mantenimiento definidas para este equipo.</p>
                <p className="text-sm">Por favor, contacta a un administrador para configurar las tareas.</p>
            </div>
        ) : (
            <div className="space-y-8 mt-8">
                {Object.keys(frecuenciaTitulos).map(freq => {
                    if(groupedTasks[freq] && groupedTasks[freq].length > 0){
                        return <MantenimientoSection key={freq} title={frecuenciaTitulos[freq]} tasks={groupedTasks[freq]} selectedTasks={selectedTasks} toggleTask={toggleTask} toggleAllTasks={toggleAllTasksInSection} />
                    }
                    return null;
                })}
            </div>
        )}

         {notification && notification.type === 'error' && (
            <div className="mt-6 p-4 rounded-lg flex items-start gap-3 text-sm bg-red-50 text-red-800 border-red-200">
              <AlertCircle className="w-5 h-5" />
              <p>{notification.message}</p>
              <button onClick={() => setNotification(null)} className="ml-auto"><X size={18} /></button>
            </div>
        )}
         {notification && notification.type === 'success' && (
            <div className="mt-6 p-4 rounded-lg flex items-start gap-3 text-sm bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="w-5 h-5" />
              <p>{notification.message}</p>
              <button onClick={() => setNotification(null)} className="ml-auto"><X size={18} /></button>
            </div>
        )}
        <div className="mt-8 flex justify-end">
            <button onClick={handleSubmit} disabled={loading || selectedTasks.length === 0} className="btn-primary bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>}
              <span>{loading ? 'Guardando...' : 'Guardar Registro'}</span>
            </button>
        </div>
    </div>
  );
}

// --- Pestaña: Registrar Incidente ---
function RegistrarIncidenteTab({ user, handleIncidenteSubmit, loading, notification, setNotification, incidentes }: any) {
  const [detalle, setDetalle] = useState('');
  const [estado, setEstado] = useState('PENDIENTE');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleIncidenteSubmit({ detalle, estado });
    if (success) {
      setDetalle(''); // Limpiar el formulario solo si tuvo éxito
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Registrar Nuevo Incidente</h2>
          <form onSubmit={onSubmit} className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-4">
            <div>
              <label htmlFor="detalle" className="block text-sm font-medium text-gray-700 mb-1">Detalle del Incidente</label>
              <textarea id="detalle" rows={4} className="input-class" value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Describe el problema..." required />
            </div>
            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select id="estado" className="input-class" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="PENDIENTE">Pendiente</option>
                <option value="ATENDIDO">Atendido</option>
              </select>
            </div>
            <div>
              <p className="text-sm text-gray-600">Reportado por: <span className="font-medium text-gray-800">{user?.email || 'Cargando...'}</span></p>
            </div>
            {notification && (
                <div className={`p-3 rounded-lg flex items-center gap-3 text-sm ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <p>{notification.message}</p>
                    <button onClick={() => setNotification(null)} className="ml-auto"><X size={18} /></button>
                </div>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={loading || !detalle} className="btn-primary bg-red-600 hover:bg-red-700">
                {loading ? <Loader className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}                    
                <span>{loading ? 'Guardando...' : 'Guardar Incidente'}</span>
              </button>
            </div>
          </form>
        </div>
        <HistorialIncidentes incidentes={incidentes} />
      </div>
    </div>
  );
}

// --- Componente: Historial de Incidentes ---
function HistorialIncidentes({ incidentes }: { incidentes: Incidente[] }) {
    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Historial de Incidentes</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {incidentes.length === 0 ? (
                    <div className="text-center text-gray-500 p-8 border-dashed border-2 border-gray-200 rounded-lg">
                        <p>No hay incidentes registrados.</p>
                    </div>
                ) : (
                    incidentes.map(inc => (
                        <div key={inc.id} className="bg-white border border-gray-200 rounded-lg p-4 text-sm shadow-sm">
                            <div className="flex justify-between items-start">
                                <p className="text-gray-800 leading-snug pr-4">{inc.detalle}</p>
                                <span className={`font-semibold text-xs px-2 py-1 rounded-full whitespace-nowrap ${inc.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                    {inc.estado}
                                </span>
                            </div>
                            <div className="text-gray-500 mt-2 flex items-center justify-between text-xs">
                                <span>Reportado por: <span className="font-medium">{inc.reportadoPor}</span></span>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={12}/>
                                    <span>{new Date(inc.fecha).toLocaleDateString()} {new Date(inc.fecha).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// --- Componente: Sección de Mantenimiento ---
function MantenimientoSection({ title, tasks, selectedTasks, toggleTask, toggleAllTasks }: any) {
    const taskIds = tasks.map((task: Tarea) => task.id);
    const allInSectionSelected = taskIds.length > 0 && taskIds.every((id: string) => selectedTasks.includes(id));
    return (
      <div className="border border-gray-200 rounded-xl p-4 transition-shadow hover:shadow-md">
        <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <button onClick={() => toggleAllTasks(taskIds)} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                {allInSectionSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {tasks.map((task: Tarea) => (
            <div key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-blue-50/50 group">
              {selectedTasks.includes(task.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />}
              <span className="text-gray-700 text-sm">{task.descripcion}</span>
            </div>
          ))}
        </div>
      </div>
    );
}


// --- Componente: Pestaña de Reportes ---
function GestionarReportesTab({ equipoId }: { equipoId: string }) {
    return (
        <div className="max-w-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Subir Nuevo Reporte</h2>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                 <p className="text-sm text-gray-600 mb-4">Sube un informe de mantenimiento, calibración o cualquier otro documento relevante para el equipo (ej. PDF, DOCX, XLSX).</p>
                <div className="space-y-4">
                  <input 
                    type="file" 
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                  />
                  <button className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
                    <Save className="w-5 h-5" />
                    <span>Guardar Reporte</span>
                  </button>
                </div>
            </div>
        </div>
    );
}

// --- Estilos Globales (para DRY) ---
const GlobalStyles = () => (
  <style jsx global>{`
    .input-class {
      @apply w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition;
    }
    .btn-primary {
      @apply flex items-center justify-center gap-2 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
    }
  `}</style>
);
