import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface QuickActionProps {
  titulo: string;
  completado: boolean;
  href: string;
  icon: string;
}

export default function QuickAction({ titulo, completado, href, icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            completado ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
          }`}>
            {completado ? (
              <Check className="h-4 w-4" />
            ) : (
              <span>{icon}</span>
            )}
          </div>
          <span className={`font-medium ${completado ? 'text-green-700' : 'text-gray-700'}`}>
            {titulo}
          </span>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </Link>
  );
}
