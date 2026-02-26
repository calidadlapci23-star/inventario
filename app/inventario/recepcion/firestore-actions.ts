'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

/**
 * ✅ CORREGIDO: La interfaz ahora acepta todos los campos enviados por el formulario.
 * Esto resuelve la discordancia y permite un registro de datos completo.
 */
export interface RecepcionFirestoreData {
  productoId: string;
  loteId: string;
  lote: string;
  cantidad: number;
  observaciones: string;
  disciplina: string;
  productoStockActual: number;
  loteStock: number; // Stock anterior del lote
  unidad: string;
  fechaRecepcion: Date;
  fechaVencimiento?: Date;
  proveedor: string;
  ubicacion?: string;
  precioUnitario?: number;
  documento?: string;
}

export interface RecepcionActionResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Server Action para registrar una recepción de material en Firestore.
 * Realiza una transacción para garantizar la consistencia de los datos.
 */
export async function registrarRecepcionFirestoreAction(
  data: RecepcionFirestoreData
): Promise<RecepcionActionResult> {
  try {
    const { 
      productoId, 
      loteId, 
      cantidad, 
      productoStockActual, 
      fechaVencimiento,
      proveedor,
      ubicacion,
      precioUnitario,
      documento,
      lote
    } = data;

    if (!productoId || !loteId || !cantidad || cantidad <= 0) {
      return {
        success: false,
        message: 'Datos incompletos o inválidos para la recepción.',
      };
    }

    const productoRef = doc(db, 'productos', productoId);
    const loteRef = doc(db, 'lotes', loteId);

    const newStock = await runTransaction(db, async (transaction) => {
      const productoDoc = await transaction.get(productoRef);
      if (!productoDoc.exists()) {
        throw new Error('El producto ya no existe. La operación fue cancelada.');
      }

      const nuevoStockProducto = (productoDoc.data().stock_actual || 0) + cantidad;

      // ✅ MEJORADO: Se actualiza el stock del producto y la fecha de la última actualización.
      transaction.update(productoRef, { 
        stock_actual: nuevoStockProducto,
        updated_at: serverTimestamp(),
      });

      // ✅ MEJORADO: Se actualiza el lote con toda la nueva información relevante.
      const loteDoc = await transaction.get(loteRef);
      const stockActualLote = loteDoc.exists() ? loteDoc.data().stock : 0;
      const nuevoStockLote = stockActualLote + cantidad;

      transaction.set(loteRef, {
        stock: nuevoStockLote,
        fecha_vencimiento: fechaVencimiento ? Timestamp.fromDate(new Date(fechaVencimiento)) : null,
        proveedor: proveedor,
        ubicacion: ubicacion || 'Almacén Principal',
        precio_unitario: precioUnitario || null,
        documento_recepcion: documento || null,
        updated_at: serverTimestamp(),
      }, { merge: true }); // Usar merge para no sobrescribir campos existentes como created_at

      return nuevoStockProducto;
    });

    // ✅ MEJORADO: El registro del movimiento ahora es más completo.
    await addDoc(collection(db, 'movimientos_inventario'), {
      tipo: 'ENTRADA',
      producto_id: productoId,
      lote_id: loteId,
      cantidad: cantidad,
      stock_anterior: productoStockActual,
      stock_nuevo: newStock,
      unidad: data.unidad,
      observaciones: `Recepción Lote: ${lote} - ${data.observaciones || 'Material recibido'}`,
      created_at: serverTimestamp(),
      details: {
        proveedor: proveedor,
        fecha_recepcion: Timestamp.fromDate(new Date(data.fechaRecepcion)),
        documento: documento || null
      }
    });

    revalidatePath('/inventario/dashboard');
    revalidatePath('/inventario/recepcion');
    revalidatePath(`/inventario/${data.disciplina.toLowerCase()}`);

    return {
      success: true,
      message: `✅ ¡Recepción registrada! Nuevo stock del producto: ${newStock} ${data.unidad}`,
      data: { nuevoStock: newStock },
    };

  } catch (error) {
    console.error('Error en la Server Action de recepción (Firestore):', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return {
      success: false,
      message: `❌ Error al registrar la recepción: ${errorMessage}`,
    };
  }
}
