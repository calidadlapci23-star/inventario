import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // CAMBIO
import { z } from 'zod';

// Esquema de validación actualizado para coincidir con el formulario
const recepcionSchema = z.object({
  disciplina: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().min(1, "Debe seleccionar una disciplina")
  ),
  producto: z.string().min(1, "El nombre del producto es requerido").trim(),
  categoria: z.string().min(1, "La categoría es requerida"),
  proveedor: z.string().min(1, "El proveedor es requerido").trim(),
  lote: z.string().min(1, "El lote es requerido").trim(),
  cantidad: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().positive("La cantidad debe ser mayor a cero")
  ),
  unidad: z.string().min(1, "La unidad de medida es requerida"),
  piezasPorCaja: z.preprocess(
    (val) => val && String(val).length > 0 ? parseInt(z.string().parse(val), 10) : null,
    z.number().positive("Las piezas por caja deben ser un número positivo").nullable()
  ),
  fechaRecepcion: z.string().min(1, "La fecha de recepción es requerida"),
  fechaVencimiento: z.string().optional().nullable(),
  alertaMinima: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().min(0, "La alerta mínima no puede ser negativa")
  ),
  ubicacion: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
}).refine(data => {
    // Si la unidad es CAJA, piezasPorCaja debe ser un número positivo.
    if (data.unidad === 'CAJA') {
        return data.piezasPorCaja !== null && data.piezasPorCaja > 0;
    }
    return true;
}, {
    message: "Se requieren piezas por caja cuando la unidad es 'CAJA'",
    path: ["piezasPorCaja"],
});


export async function POST(request: NextRequest) {
  const supabase = createClient(); // CAMBIO
  try {
    const body = await request.json();
    const validation = recepcionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Datos de entrada inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { 
        disciplina: disciplina_id, 
        producto: nombre_producto, 
        categoria, 
        proveedor, 
        lote, 
        cantidad, 
        fechaRecepcion, 
        fechaVencimiento,
        ubicacion,
        observaciones,
        unidad,
        piezasPorCaja,
        alertaMinima
    } = validation.data;

    // --- 1. Buscar o Crear Producto ---
    let producto_id: number;
    const { data: prodExistente, error: findError } = await supabase // CAMBIO
      .from('productos')
      .select('id')
      .eq('nombre', nombre_producto)
      .eq('disciplina_id', disciplina_id)
      .single();

    if (findError && findError.code !== 'PGRST116') throw new Error(`Error al buscar producto: ${findError.message}`);

    if (prodExistente) {
      producto_id = prodExistente.id;
    } else {
      const { data: nuevoProd, error: createError } = await supabase // CAMBIO
        .from('productos')
        .insert({ nombre: nombre_producto, disciplina_id: disciplina_id, categoria: categoria, proveedor_sugerido: proveedor })
        .select('id')
        .single();

      if (createError) throw new Error(`Error al crear producto: ${createError.message}`);
      producto_id = nuevoProd.id;
    }

    // --- 2. Buscar, Actualizar o Crear Lote ---
    let loteResult;
    const { data: loteExistente, error: loteFindError } = await supabase // CAMBIO
      .from('lotes')
      .select('id, cantidad_actual, cantidad_inicial')
      .eq('producto_id', producto_id)
      .eq('numero_lote', lote)
      .single();

    if (loteFindError && loteFindError.code !== 'PGRST116') throw new Error(`Error al buscar lote: ${loteFindError.message}`);

    if (loteExistente) { // Si el lote existe, se CONSOLIDA (se suma la cantidad)
      const nuevaCantidad = loteExistente.cantidad_actual + cantidad;
      const { data, error } = await supabase // CAMBIO
        .from('lotes')
        .update({
          cantidad_actual: nuevaCantidad,
          cantidad_inicial: loteExistente.cantidad_inicial + cantidad,
          estado: 'activo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', loteExistente.id)
        .select()
        .single();

      if (error) throw new Error(`Error al actualizar lote: ${error.message}`);
      loteResult = data;

    } else { // Si no existe, se crea un NUEVO lote
      const { data, error } = await supabase // CAMBIO
        .from('lotes')
        .insert({
          producto_id,
          numero_lote: lote, // Mapeo a la columna correcta
          fecha_recepcion: fechaRecepcion,
          fecha_vencimiento: fechaVencimiento,
          cantidad_inicial: cantidad,
          cantidad_actual: cantidad,
          ubicacion_almacen: ubicacion, // Mapeo a la columna correcta
          unidad: unidad, // Nuevo campo
          piezas_por_caja: piezasPorCaja, // Nuevo campo
          alerta_stock: alertaMinima, // Nuevo campo
          estado: 'activo',
        })
        .select()
        .single();

      if (error) throw new Error(`Error al crear lote: ${error.message}`);
      loteResult = data;
    }

    // --- 3. Registrar Movimiento de Inventario ---
    const { error: movimientoError } = await supabase.from('movimientos').insert({ // CAMBIO
      tipo: 'recepcion',
      lote_id: loteResult.id,
      cantidad: cantidad,
      observaciones: observaciones || (loteExistente ? 'Recepción consolidada.' : 'Nueva recepción.'),
    });

    if (movimientoError) throw new Error(`Error al registrar movimiento: ${movimientoError.message}`);

    // --- 4. Enviar Respuesta Exitosa ---
    return NextResponse.json(
      {
        success: true,
        message: `Recepción ${loteExistente ? 'consolidada' : 'registrada'} exitosamente.`,
        data: loteResult,
      },
      { status: loteExistente ? 200 : 201 }
    );

  } catch (error: any) {
    console.error('Error en endpoint de recepción:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

// La función GET no cambia
export async function GET() {
  return NextResponse.json(
    { message: 'Use POST para registrar recepciones' },
    { status: 200 }
  )
}
