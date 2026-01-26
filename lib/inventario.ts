import { createClient } from '@/lib/supabase/server'; // CAMBIO

// Definición de la estructura de un Producto
export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  stock_actual: number;
  stock_minimo: number;
  disciplina_nombre: string; // Nombre de la disciplina
}

/**
 * Obtiene todos los productos del inventario con el nombre de su disciplina.
 * Esta función es segura para ser usada en Server Components.
 */
export async function getProductos(): Promise<Producto[]> {
  const supabase = createClient(); // CAMBIO
  try {
    // Consulta a Supabase para obtener los productos y hacer un JOIN con la tabla de disciplinas
    // Renombramos alerta_minima a stock_minimo y obtenemos el nombre de la disciplina
    const { data, error } = await supabase
      .from('productos')
      .select(`
        id,
        nombre,
        descripcion,
        stock_actual,
        alerta_minima,
        disciplina:disciplinas (nombre)
      `);

    if (error) {
      // Si hay un error en la consulta, lo lanzamos para que sea manejado por el que llama
      throw new Error(`Error al obtener productos: ${error.message}`);
    }

    // Si no hay datos, retornamos un array vacío para evitar errores en la UI
    if (!data) {
      return [];
    }

    // Mapeamos los datos para que coincidan con la interfaz `Producto` que espera el frontend
    const productos: Producto[] = data.map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      stock_actual: p.stock_actual,
      stock_minimo: p.alerta_minima, // Alias para el frontend
      // Aplanamos el objeto de disciplina para obtener solo el nombre
      disciplina_nombre: p.disciplina?.nombre ?? 'Sin disciplina',
    }));

    return productos;

  } catch (error) {
    console.error('Error en getProductos:', error);
    // Relanzamos el error para que la página que lo use pueda manejarlo (e.g., mostrar un mensaje de error)
    if (error instanceof Error) {
        throw new Error(`Fallo al cargar los productos: ${error.message}`);
    }
    throw new Error('Fallo al cargar los productos por un error desconocido.');
  }
}
