import { ReactNode } from 'react';

interface DashboardCardProps {
  titulo: string;
  valor: number;
  icon: ReactNode;
  color: 'blue' | 'amber' | 'red' | 'green';
  variant?: 'primary' | 'secondary'; // Para diferenciar estilos
}

export default function DashboardCard({ 
  titulo, 
  valor, 
  icon, 
  color,
  variant = 'primary' 
}: DashboardCardProps) {
  
  // Versión según el diseño de la imagen
  const colorClasses = variant === 'primary' 
    ? {
        blue: 'bg-blue-500 border-blue-600 text-white',
        amber: 'bg-amber-500 border-amber-600 text-white',
        red: 'bg-red-500 border-red-600 text-white',
        green: 'bg-green-500 border-green-600 text-white',
      }
    : {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        green: 'bg-green-50 border-green-200 text-green-700',
      };

  return (
    <div className={`${colorClasses[color]} rounded-xl border-2 p-6 transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{titulo}</h3>
        <div className={`p-2 rounded-lg ${variant === 'primary' ? 'bg-white/20' : 'bg-white'}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold ${variant === 'primary' ? '' : 'text-gray-900'}`}>
        {valor}
      </p>
    </div>
  );
}
