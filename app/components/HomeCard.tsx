// components/HomeCard.tsx
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils'; // Si usas clsx o tailwind-merge

interface HomeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  className?: string;
}

export default function HomeCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  className = 'bg-gradient-to-br from-blue-500 to-blue-700'
}: HomeCardProps) {
  return (
    <Link
      href={href}
      aria-label={`Go to ${title}`}
      className={cn(
        'group block h-full p-6 rounded-xl shadow-lg',
        'transition-all duration-300 hover:scale-[1.02]',
        'hover:shadow-xl active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50',
        className
      )}
    >
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-white bg-opacity-20 rounded-lg group-hover:bg-opacity-30 transition-all duration-300">
          <Icon className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0"> {/* min-w-0 para evitar overflow */}
          <h3 className="text-xl font-bold text-white mb-2 truncate">
            {title}
          </h3>
          <p className="text-white text-opacity-90 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
