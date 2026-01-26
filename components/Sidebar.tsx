import Link from 'next/link'
import { BarChart2, Repeat, Inbox, LayoutDashboard, Database } from 'lucide-react'

const navItems = [
  {
    href: '/inventario/dashboard',
    icon: <LayoutDashboard size={20} />,
    label: 'Dashboard',
  },
  {
    href: '/inventario/recepcion',
    icon: <Inbox size={20} />,
    label: 'Recepción',
  },
  {
    href: '/inventario/consumo',
    icon: <Repeat size={20} />,
    label: 'Consumo',
  },
  {
    href: '/inventario/reportes',
    icon: <BarChart2 size={20} />,
    label: 'Reportes',
  },
  {
    href: '/inventario',
    icon: <Database size={20} />,
    label: 'Inventario',
  },
  {
    href: '/inventario/movimientos',
    icon: <Repeat size={20} />,
    label: 'Movimientos',
  },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white shadow-md flex-shrink-0">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventario</h2>
      </div>
      <nav className="mt-6">
        <ul>
          {navItems.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100">
                  <div className="mr-3">{item.icon}</div>
                  <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
