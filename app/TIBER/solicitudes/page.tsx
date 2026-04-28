import TiberGestionSuministros from '../../components/TiberGestionSumistros';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestión de Solicitudes - Tíber',
  description: 'Sistema para la gestión de suministros, solicitudes, órdenes de compra y recepciones en la sucursal Tíber.',
};

export default function TiberSolicitudesPage() {
  return <TiberGestionSuministros />;
}