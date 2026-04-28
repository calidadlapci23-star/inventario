import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function getProductos() {
  try {
    const productosRef = collection(db, 'productos');
    const snapshot = await getDocs(productosRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return [];
  }
}

export async function getDashboardStats() {
  // Mock implementation
  return {
    productosActivos: 10,
    proveedoresActivos: 5,
    movimientosHoy: 3,
  };
}

export async function getSuministros() {
  // Mock implementation
  return [
    { id: '1', nombre: 'Suministro 1' },
    { id: '2', nombre: 'Suministro 2' },
  ];
}

export async function getAlertas() {
  // Mock implementation
  return [
    {
      id: '1',
      tipo: 'stock',
      titulo: 'Stock Bajo',
      descripcion: 'El producto "Reactivo A" tiene solo 5 unidades restantes.',
      link: '/inventario/productos',
    },
    {
      id: '2',
      tipo: 'vencimiento',
      titulo: 'Próximo a Vencer',
      descripcion: 'El lote "LOTE001" del producto "Reactivo B" vence en 5 días.',
      link: '/inventario/productos',
    },
  ];
}
