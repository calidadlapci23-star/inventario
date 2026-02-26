// /home/user/inventario/app/inventario/recepcion/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface RecepcionData {
  productoId: string;
  lote: string;
  fechaRecepcion: string;
  fechaVencimiento: string;
  cantidad: number;
  unidad: string;
  proveedor: string;
  ubicacion: string;
  observaciones: string;
  precioUnitario?: number;
  documento?: string;
  disciplina?: string; // ✅ AGREGADO
}

export interface RecepcionActionResult {
  success: boolean;
  message: string;
  data?: any;
}

export async function registrarRecepcionAction(data: RecepcionData): Promise<RecepcionActionResult> {
  const supabase = createClient();

  try {
    // 1. Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: '❌ Error de autenticación. Por favor, inicie sesión.' };
    }

    const {
      productoId,
      lote,
      fechaRecepcion,
      fechaVencimiento,
      cantidad,
      unidad,
      proveedor,
      ubicacion,
      observaciones,
      precioUnitario,
      documento,
      disciplina // ✅ RECIBIR DISCIPLINA
    } = data;

    // 2. Validaciones básicas
    if (!productoId || !lote || !fechaRecepcion || !fechaVencimiento || cantidad <= 0) {
      return { success: false, message: '❌ Por favor, complete todos los campos requeridos.' };
    }

    // 3. Verificar si el lote ya existe
    const { data: loteExistente, error: loteError } = await supabase
      .from('lotes')
      .select('id, lote, producto_id')
      .eq('lote', lote)
      .eq('producto_id', productoId)
      .maybeSingle();

    if (loteError) {
      console.error('Error al verificar lote:', loteError);
      throw new Error(`Error al verificar existencia del lote: ${loteError.message}`);
    }

    if (loteExistente) {
      return { 
        success: false, 
        message: `❌ El lote "${lote}" ya existe para este producto. Use "Añadir Stock" para incrementar.` 
      };
    }

    // 4. Obtener información del producto
    const { data: producto, error: productoError } = await supabase
      .from('productos')
      .select('id, nombre, stock_actual, disciplina, unidad_medida, alerta_minima, alerta_maxima')
      .eq('id', productoId)
      .single();

    if (productoError) {
      console.error('Error al obtener producto:', productoError);
      throw new Error(`Error al obtener información del producto: ${productoError.message}`);
    }

    // 5. Usar disciplina proporcionada o obtenerla del producto
    const disciplinaFinal = disciplina || producto.disciplina;

    // 6. Calcular estado del lote basado en fecha de vencimiento
    const hoy = new Date();
    const fechaVenc = new Date(fechaVencimiento);
    const diasParaVencimiento = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    let estadoLote = 'ACTIVO';
    if (diasParaVencimiento <= 30) {
      estadoLote = 'POR_VENCER';
    } else if (diasParaVencimiento <= 0) {
      estadoLote = 'VENCIDO';
    }

    // 7. Calcular stock del producto después de la recepción
    const nuevoStockProducto = producto.stock_actual + cantidad;
    
    // Verificar si supera la alerta máxima
    let alertaStock = null;
    if (producto.alerta_maxima && nuevoStockProducto > producto.alerta_maxima) {
      alertaStock = `⚠️ Stock máximo superado (${producto.alerta_maxima})`;
    }

    // --- INICIO DE LA TRANSACCIÓN LÓGICA ---

    // 8. Crear el nuevo lote
    const { data: nuevoLote, error: crearLoteError } = await supabase
      .from('lotes')
      .insert({
        producto_id: productoId,
        lote: lote,
        fecha_recepcion: fechaRecepcion,
        fecha_vencimiento: fechaVencimiento,
        stock: cantidad,
        unidad: unidad,
        estado: estadoLote,
        ubicacion: ubicacion,
        proveedor: proveedor,
        precio_unitario: precioUnitario,
        documento: documento,
        observaciones: observaciones,
        usuario_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (crearLoteError) {
      console.error('Error al crear lote:', crearLoteError);
      throw new Error(`Error al registrar el nuevo lote: ${crearLoteError.message}`);
    }

    // 9. Actualizar stock del producto
    const { error: actualizarProductoError } = await supabase
      .from('productos')
      .update({
        stock_actual: nuevoStockProducto,
        ultima_actualizacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', productoId);

    if (actualizarProductoError) {
      console.error('Error al actualizar producto:', actualizarProductoError);
      throw new Error(`Error al actualizar stock del producto: ${actualizarProductoError.message}`);
    }

    // 10. Registrar movimiento de inventario (ENTRADA)
    const { error: movimientoError } = await supabase
      .from('movimientos_inventario')
      .insert({
        tipo: 'RECEPCION',
        producto_id: productoId,
        lote_id: nuevoLote.id,
        cantidad: cantidad,
        stock_anterior: producto.stock_actual,
        stock_nuevo: nuevoStockProducto,
        usuario_id: user.id,
        referencia: `Recepción Lote: ${lote} - ${observaciones || 'Nueva recepción'}`,
        created_at: new Date().toISOString(),
      });

    if (movimientoError) {
      console.error('Error al registrar movimiento:', movimientoError);
      throw new Error(`Error al registrar el movimiento de inventario: ${movimientoError.message}`);
    }

    // 11. Registrar la recepción en tabla específica si existe
    try {
      await supabase
        .from('recepciones')
        .insert({
          producto_id: productoId,
          lote_id: nuevoLote.id,
          lote: lote,
          cantidad: cantidad,
          unidad: unidad,
          proveedor: proveedor,
          fecha_recepcion: fechaRecepcion,
          fecha_vencimiento: fechaVencimiento,
          usuario_id: user.id,
          observaciones: observaciones,
          precio_unitario: precioUnitario,
          documento: documento,
          disciplina: disciplinaFinal,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.warn('No se pudo registrar en tabla recepciones:', error);
      // No es crítico si la tabla no existe
    }

    // 12. Verificar alertas de stock mínimo
    let alertaMinima = null;
    if (producto.alerta_minima && nuevoStockProducto <= producto.alerta_minima) {
      alertaMinima = `⚠️ Stock por debajo del mínimo (${producto.alerta_minima})`;
      
      // Opcional: Registrar alerta en tabla de alertas
      try {
        await supabase
          .from('alertas')
          .insert({
            tipo: 'STOCK_MINIMO',
            producto_id: productoId,
            lote_id: nuevoLote.id,
            mensaje: `Stock del producto ${producto.nombre} está por debajo del mínimo (${producto.alerta_minima})`,
            prioridad: 'ALTA',
            leida: false,
            created_at: new Date().toISOString(),
          });
      } catch (error) {
        console.warn('No se pudo registrar alerta:', error);
      }
    }

    // --- FIN DE LA TRANSACCIÓN LÓGICA ---

    // 13. Revalidar cachés para actualizar la UI
    revalidatePath('/inventario/recepcion');
    revalidatePath('/inventario/dashboard');
    revalidatePath('/historial');
    revalidatePath('/inventario/lotes');
    revalidatePath(`/inventario/productos/${productoId}`);
    
    // 14. Revalidar también la página de la disciplina
    if (disciplinaFinal) {
      const rutaDisciplina = `/inventario/${disciplinaFinal.toLowerCase().replace(' ', '-')}`;
      revalidatePath(rutaDisciplina);
    }

    // 15. Mensaje de éxito detallado
    const mensajeExito = `
✅ ¡Recepción registrada exitosamente!

📦 **DETALLES DEL LOTE**
• Producto: ${producto.nombre}
• Disciplina: ${disciplinaFinal}
• Lote: ${lote}
• Cantidad: ${cantidad} ${unidad}
• Proveedor: ${proveedor}
• Ubicación: ${ubicacion}
• Recepción: ${new Date(fechaRecepcion).toLocaleDateString()}
• Vencimiento: ${new Date(fechaVencimiento).toLocaleDateString()} (${diasParaVencimiento} días)
• Estado: ${estadoLote}

📊 **ACTUALIZACIÓN DE STOCK**
• Stock anterior: ${producto.stock_actual} ${unidad}
• Stock actual: ${nuevoStockProducto} ${unidad}
• Incremento: +${cantidad} ${unidad}

${alertaStock ? `\n⚠️ **ALERTA:** ${alertaStock}` : ''}
${alertaMinima ? `\n⚠️ **ALERTA:** ${alertaMinima}` : ''}
    `.trim();

    return {
      success: true,
      message: mensajeExito,
      data: {
        loteId: nuevoLote.id,
        producto: producto.nombre,
        disciplina: disciplinaFinal,
        stockAnterior: producto.stock_actual,
        stockNuevo: nuevoStockProducto,
        alertas: [alertaStock, alertaMinima].filter(Boolean),
      }
    };

  } catch (error) {
    console.error('Error completo en la Server Action de recepción:', error);
    
    const mensajeError = error instanceof Error
      ? `❌ Error del sistema: ${error.message}`
      : '❌ Ocurrió un error desconocido al registrar la recepción. Por favor, intente nuevamente.';
    
    return {
      success: false,
      message: mensajeError
    };
  }
}

// Función para añadir stock a un lote existente
export async function añadirStockLoteAction(loteId: string, cantidad: number, observaciones?: string): Promise<RecepcionActionResult> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: '❌ Error de autenticación.' };
    }

    if (cantidad <= 0) {
      return { success: false, message: '❌ La cantidad debe ser mayor a cero.' };
    }

    // 1. Obtener información del lote
    const { data: lote, error: loteError } = await supabase
      .from('lotes')
      .select('*, productos(*)')
      .eq('id', loteId)
      .single();

    if (loteError) {
      throw new Error(`Error al obtener lote: ${loteError.message}`);
    }

    // 2. Actualizar stock del lote
    const nuevoStockLote = lote.stock + cantidad;
    const { error: actualizarLoteError } = await supabase
      .from('lotes')
      .update({
        stock: nuevoStockLote,
        estado: nuevoStockLote > 0 ? 'ACTIVO' : lote.estado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loteId);

    if (actualizarLoteError) {
      throw new Error(`Error al actualizar lote: ${actualizarLoteError.message}`);
    }

    // 3. Actualizar stock del producto
    const nuevoStockProducto = (lote.productos.stock_actual || 0) + cantidad;
    const { error: actualizarProductoError } = await supabase
      .from('productos')
      .update({
        stock_actual: nuevoStockProducto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lote.producto_id);

    if (actualizarProductoError) {
      throw new Error(`Error al actualizar producto: ${actualizarProductoError.message}`);
    }

    // 4. Registrar movimiento
    await supabase
      .from('movimientos_inventario')
      .insert({
        tipo: 'AUMENTO_STOCK',
        producto_id: lote.producto_id,
        lote_id: loteId,
        cantidad: cantidad,
        stock_anterior: lote.productos.stock_actual,
        stock_nuevo: nuevoStockProducto,
        usuario_id: user.id,
        referencia: `Aumento de stock: ${observaciones || 'Stock añadido'}`,
        created_at: new Date().toISOString(),
      });

    // 5. Revalidar cachés
    revalidatePath('/inventario/lotes');
    revalidatePath('/inventario/dashboard');
    revalidatePath(`/inventario/productos/${lote.producto_id}`);

    return {
      success: true,
      message: `✅ Stock añadido exitosamente al lote ${lote.lote}. Nuevo stock: ${nuevoStockLote}`,
    };

  } catch (error) {
    console.error('Error al añadir stock:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// Función para obtener productos para el formulario de recepción
export async function obtenerProductosParaRecepcion() {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('id, nombre, codigo, unidad_medida, disciplina')
      .order('nombre');
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return { success: false, data: [] };
  }
}

// Función para obtener proveedores
export async function obtenerProveedores() {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('proveedores')
      .select('id, nombre, contacto')
      .order('nombre');
    
    if (error) throw error;
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    return { success: false, data: [] };
  }
}

// Función para verificar si un lote existe
export async function verificarLoteExistente(lote: string, productoId: string) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('lotes')
      .select('id, lote, producto_id')
      .eq('lote', lote)
      .eq('producto_id', productoId)
      .maybeSingle();
    
    if (error) throw error;
    
    return { 
      success: true, 
      existe: !!data,
      lote: data 
    };
  } catch (error) {
    console.error('Error al verificar lote:', error);
    return { success: false, existe: false };
  }
}