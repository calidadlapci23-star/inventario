import { ReactNode } from 'react';
import Link from 'next/link';

interface DashboardCardProps {
  titulo: string;
  valor: number | string; // Permitir string para valores como 'N/A' o 'Ver'
  icon: ReactNode;
  color: 'blue' | 'amber' | 'red' | 'green' | 'purple' | 'indigo';
  variant?: 'primary' | 'secondary';
  href?: string; // Prop opcional para el enlace
}

export default function DashboardCard({
  titulo,
  valor,
  icon,
  color,
  variant = 'primary',
  href
}: DashboardCardProps) {

  const colorClasses = variant === 'primary'
    ? {
        blue: 'bg-blue-500 border-blue-600 text-white',
        amber: 'bg-amber-500 border-amber-600 text-white',
        red: 'bg-red-500 border-red-600 text-white',
        green: 'bg-green-500 border-green-600 text-white',
        purple: 'bg-purple-500 border-purple-600 text-white',
        indigo: 'bg-indigo-500 border-indigo-600 text-white',
      }
    : {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      };

  const cardContent = (
    <div className={`${colorClasses[color]} rounded-xl border-b-4 p-5 transition-all ${href ? 'hover:scale-105 hover:shadow-xl cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{titulo}</h3>
        <div className={`p-2 rounded-lg ${variant === 'primary' ? 'bg-white/20' : 'bg-white'}`}>
          {icon}
        </div>
      </div>
      <p className={`text-4xl font-bold ${variant === 'primary' ? '' : 'text-gray-900'}`}>
        {valor}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
