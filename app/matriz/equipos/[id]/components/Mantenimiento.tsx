'use client';

import { Wrench, Check } from 'lucide-react';

// Los datos de mantenimiento se pasarán como props desde la página principal
const TaskList = ({ title, tasks }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      <Wrench className="w-5 h-5 mr-3 text-gray-400" />
      {title}
    </h3>
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start">
          <Check className="w-4 h-4 mr-3 mt-1 text-green-500 flex-shrink-0" />
          <span className="text-gray-700">{task.tarea}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default function MantenimientoTab({ mantenimientos }) {
  return (
    <div className="space-y-8 py-8">
      {mantenimientos.diario.length > 0 && (
        <TaskList title="Mantenimiento Diario" tasks={mantenimientos.diario} />
      )}
      {mantenimientos.trimestral.length > 0 && (
        <TaskList title="Mantenimiento Trimestral" tasks={mantenimientos.trimestral} />
      )}
      {mantenimientos.requerido.length > 0 && (
        <TaskList title="Mantenimiento Según se Requiera" tasks={mantenimientos.requerido} />
      )}
    </div>
  );
}
