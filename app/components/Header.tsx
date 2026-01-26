import { PackagePlus } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <div className="px-6 py-4 bg-gray-800 text-white flex items-center">
      <PackagePlus className="h-8 w-8 mr-4 text-blue-300" />
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}
