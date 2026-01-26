'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface RegistrarConsumoParams {
  productoId: string;
  loteId: string;
  cantidad: number;
  observaciones: string;
}

export async function registrarConsumoAction(params: RegistrarConsumoParams) {
  const supabase = createClient();

  const { productoId, loteId, cantidad, observaciones } = params;

  try {
    // Iniciar transacción
    const { error: rpcError } = await supabase.rpc('registrar_consumo', { 
      p_lote_id: loteId, 
      p_cantidad: cantidad, 
      p_observaciones: observaciones
    });

    if (rpcError) {
      throw new Error(`Error en la base de datos: ${rpcError.message}`);
    }

    // Revalidar el path para que los datos se actualicen en la UI
    revalidatePath('/inventario/consumo');
    revalidatePath('/inventario/dashboard'); // Opcional: si el dashboard muestra stock

    return {
      success: true,
      message: '¡Consumo registrado exitosamente!',
    };

  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Ocurrió un error inesperado al registrar el consumo.',
    };
  }
}
