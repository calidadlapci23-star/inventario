import { AlertTriangle, Clock, Package } from 'lucide-react';

interface AlertCardProps {
  tipo: 'stock-bajo' | 'vencimiento' | 'nuevo-lote';
  titulo: string;
  descripcion: string;
}

export default function AlertCard({ tipo, titulo, descripcion }: AlertCardProps) {
  const config = {
    'stock-bajo': {
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    'vencimiento': {
      icon: <Clock className="h-5 w-5 text-red-600" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    'nuevo-lote': {
      icon: <Package className="h-5 w-5 text-green-600" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  };

  const { icon, bgColor, borderColor } = config[tipo];

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-4 flex items-start gap-3`}>
      <div className="flex-shrink-0 mt-1">{icon}</div>
      <div>
        <h4 className="font-semibold text-gray-800">{titulo}</h4>
        <p className="text-sm text-gray-600 mt-1">{descripcion}</p>
      </div>
    </div>
  );
}
