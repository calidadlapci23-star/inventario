// /home/user/inventario/app/inventario/consumo/page.tsx
import ConsumoForm from './ConsumoForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro de Consumo | Inventario Lab',
  description: 'Sistema de registro de consumo de productos del inventario del laboratorio clínico',
};

export default function ConsumoPage() {
  return <ConsumoForm />;
}