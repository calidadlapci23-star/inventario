'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Definimos una interfaz para la estructura de los datos que la acción espera recibir.
interface ConsumoData {
  disciplina: string;
  productoId: string;
  productoStockActual: number;
  loteId: string;
  loteStock: number;
  cantidad: number;
  unidad: string;
  observaciones: string;
}

// Definimos una interfaz para la respuesta de la acción.
interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * Server Action para registrar el consumo de un producto.
 * Encapsula toda la lógica de base de datos en el servidor para mayor seguridad y atomicidad.
 */
export async function registrarConsumoAction(data: ConsumoData): Promise<ActionResult> {
  const supabase = createClient();

  try {
    // 1. Obtener el usuario actual desde el servidor
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Error de autenticación: No se pudo obtener el usuario.' };
    }

    const { 
      productoId, loteId, cantidad, unidad, observaciones, 
      disciplina, loteStock, productoStockActual 
    } = data;

    // --- INICIO DE LA TRANSACCIÓN LÓGICA ---

    // 2. Crear el registro en la tabla 'consumos'
    const { error: consumoError } = await supabase
      .from('consumos')
      .insert({
        producto_id: productoId,
        lote_id: loteId,
        cantidad: cantidad,
        unidad: unidad,
        observaciones: observaciones || 'Consumo diario',
        usuario_id: user.id,
        disciplina: disciplina,
        created_at: new Date().toISOString(),
      });

    if (consumoError) throw new Error(`Error al insertar consumo: ${consumoError.message}`);

    // 3. Actualizar el stock del lote
    const nuevoStockLote = loteStock - cantidad;
    const { error: loteError } = await supabase
      .from('lotes')
      .update({ 
        stock: nuevoStockLote,
        estado: nuevoStockLote <= 0 ? 'AGOTADO' : 'ACTIVO'
      })
      .eq('id', loteId);

    if (loteError) throw new Error(`Error al actualizar el lote: ${loteError.message}`);

    // 4. Actualizar el stock general del producto
    const nuevoStockProducto = productoStockActual - cantidad;
    const { error: productoError } = await supabase
      .from('productos')
      .update({ 
        stock_actual: nuevoStockProducto,
        updated_at: new Date().toISOString()
      })
      .eq('id', productoId);

    if (productoError) throw new Error(`Error al actualizar el producto: ${productoError.message}`);

    // 5. Registrar el movimiento de inventario para trazabilidad
    const { error: movimientoError } = await supabase
      .from('movimientos_inventario')
      .insert({
        tipo: 'CONSUMO',
        producto_id: productoId,
        lote_id: loteId,
        cantidad: -cantidad, // La cantidad es negativa porque es una salida
        stock_anterior: productoStockActual,
        stock_nuevo: nuevoStockProducto,
        usuario_id: user.id,
        referencia: `Consumo: ${observaciones || 'Sin observaciones'}`,
        created_at: new Date().toISOString(),
      });

    if (movimientoError) throw new Error(`Error al registrar el movimiento: ${movimientoError.message}`);

    // --- FIN DE LA TRANSACCIÓN LÓGICA ---

    // Revalidar la cache de las páginas afectadas para que muestren los datos actualizados
    revalidatePath('/inventario/consumo');
    revalidatePath('/inventario/dashboard');
    revalidatePath(`/inventario/${disciplina.toLowerCase().replace('_', '-')}`);
    revalidatePath('/historial');

    return { success: true, message: '¡Consumo registrado exitosamente!' };

  } catch (error) {
    console.error('Error en la Server Action de consumo:', error);
    // En un escenario real, podríamos tener una lógica más compleja para revertir las operaciones anteriores si una falla.
    // Por ahora, devolvemos un mensaje de error genérico.
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Ocurrió un error desconocido al registrar el consumo.' 
    };
  }
}
