'use client';
import { useParams } from 'next/navigation';
import { equiposData } from '@/lib/equipos-data';
import { CheckSquare, Square, User } from 'lucide-react';
import { useState } from 'react';

const MaintenanceSection = ({ title, tasks }) => {
    const [completedTasks, setCompletedTasks] = useState({});

    const toggleTask = (taskId) => {
        setCompletedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    if (!tasks || tasks.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 capitalize">Mantenimiento {title}</h3>
            <div className="space-y-4">
                {tasks.map(task => (
                    <div key={task.id} 
                         onClick={() => toggleTask(task.id)}
                         className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200">
                        {completedTasks[task.id] ? 
                           <CheckSquare className="text-blue-600" size={20}/> : 
                           <Square className="text-gray-400" size={20}/>
                        }
                        <span className="text-gray-700 flex-grow">{task.tarea}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function MaintenancePage() {
    const params = useParams();
    const equipoId = params.id as string;
    const equipo = equiposData[equipoId];

    const [realizo, setRealizo] = useState('');

    const handleSave = () => {
        // Aquí iría la lógica para guardar en la base de datos
        console.log("Guardando mantenimiento para", equipoId, { realizo });
        alert('Mantenimiento guardado con éxito (simulación).');
    };

    if (!equipo) {
        return <div className="text-center py-10">Cargando equipo...</div>;
    }

    const { mantenimientos } = equipo;

    return (
        <div className="space-y-6">
            {Object.entries(mantenimientos).map(([tipo, tasks]) => (
                <MaintenanceSection key={tipo} title={tipo} tasks={tasks} />
            ))}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div>
                        <label htmlFor="realizo-mantenimiento" className="block text-sm font-medium text-gray-700 mb-1">
                            Realizado por
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            <input 
                                id="realizo-mantenimiento"
                                type="text"
                                value={realizo}
                                onChange={(e) => setRealizo(e.target.value)}
                                placeholder="Ej: diana.trejo"
                                className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleSave}
                        className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md h-fit"
                    >
                        Guardar Mantenimiento
                    </button>
                </div>
            </div>
        </div>
    );
}
