import GestionSuministros from '../../components/GestionSuministros';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestión de Suministros | Inventario Lab',
  description: 'Sistema para la gestión de suministros, solicitudes, órdenes de compra y recepciones.',
};

export default function GestionSuministrosPage() {
  return <GestionSuministros />;
}