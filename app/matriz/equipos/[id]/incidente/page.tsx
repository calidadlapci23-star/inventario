'use client';

import { useState } from 'react';
import { Camera, Send } from 'lucide-react';

export default function RegistrarIncidentePage() {
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState(null);

  const handleFotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      // Simulación de carga de imagen
      setFoto(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = () => {
    console.log({ descripcion, foto });
    alert('Incidente reportado con éxito (simulación).');
    // Lógica para enviar el incidente al backend
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Registrar un Incidente</h2>
      <p className="text-gray-600 mb-6">Describe el problema o avería que has encontrado en el equipo.</p>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="descripcion-incidente" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción del incidente
          </label>
          <textarea
            id="descripcion-incidente"
            rows={5}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: El brazo robótico no se mueve a la posición correcta..."
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Añadir fotografía (opcional)
          </label>
          <div className="flex items-center gap-4">
            <label htmlFor="foto-incidente" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 border border-gray-300">
              <Camera size={18} />
              <span>Seleccionar imagen</span>
              <input id="foto-incidente" type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
            </label>
            {foto && (
              <div className="relative">
                <img src={foto} alt="Vista previa" className="h-20 w-20 rounded-md object-cover" />
                <button onClick={() => setFoto(null)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">X</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSubmit}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300 shadow-md inline-flex items-center gap-2"
          >
            <Send size={16} />
            Enviar Reporte
          </button>
        </div>
      </div>
    </div>
  );
}
