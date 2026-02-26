'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Interfaz para los datos que llegan del formulario
export interface ConsumoData {
  productoId: string;
  loteId: string;
  cantidad: number;
  observaciones: string;
  disciplina: string; // Para revalidar la ruta correcta
  productoStockActual: number;
  loteStock: number;
  unidad: string;
}

export interface ConsumoActionResult {
  success: boolean;
  message: string;
  data?: any;
}

// Server Action para registrar el consumo
export async function registrarConsumoAction(
  data: ConsumoData
): Promise<ConsumoActionResult> {
  try {
    const { productoId, loteId, cantidad, observaciones, disciplina, productoStockActual, loteStock, unidad } = data;

    if (!productoId || !loteId || !cantidad || cantidad <= 0) {
      return { success: false, message: 'Datos incompletos o inválidos.' };
    }

    if (cantidad > loteStock) {
        return { success: false, message: 'La cantidad a consumir supera el stock del lote.' };
    }

    const productoRef = doc(db, 'productos', productoId);
    const loteRef = doc(db, 'lotes', loteId);

    // Transacción para garantizar consistencia
    const finalStock = await runTransaction(db, async (transaction) => {
      const productoDoc = await transaction.get(productoRef);
      const loteDoc = await transaction.get(loteRef);

      if (!productoDoc.exists() || !loteDoc.exists()) {
        throw new Error('El producto o el lote ya no existen.');
      }

      const nuevoStockProducto = productoDoc.data().stock_actual - cantidad;
      const nuevoStockLote = loteDoc.data().stock - cantidad;

      // Actualizar stock del producto y del lote
      transaction.update(productoRef, { stock_actual: nuevoStockProducto, updated_at: serverTimestamp() });
      transaction.update(loteRef, { stock: nuevoStockLote, updated_at: serverTimestamp() });
      
      return nuevoStockProducto;
    });

    // Registrar el movimiento de inventario (fuera de la transacción)
    await addDoc(collection(db, 'movimientos_inventario'), {
        tipo: 'SALIDA',
        producto_id: productoId,
        lote_id: loteId,
        cantidad: cantidad,
        stock_anterior: productoStockActual,
        stock_nuevo: finalStock,
        unidad: unidad,
        observaciones: `Consumo: ${observaciones || 'Sin observaciones'}`,
        created_at: serverTimestamp(),
        details: { }
    });

    // Revalidar las rutas para que Next.js actualice la UI
    revalidatePath('/inventario/dashboard');
    revalidatePath('/inventario/consumo');
    revalidatePath(`/inventario/${disciplina.toLowerCase()}`);

    return {
      success: true,
      message: `✅ Consumo registrado. Stock actualizado a ${finalStock} ${unidad}`,
    };

  } catch (error) {
    console.error('Error en Server Action de consumo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return {
      success: false,
      message: `❌ Error al registrar el consumo: ${errorMessage}`,
    };
  }
}
