
import { z } from 'zod';

export const proveedorSchema = z.object({
  id: z.string(),
  razon_social: z.string(),
  rfc: z.string(),
  direccion: z.string(),
  giro: z.string(),
  telefono: z.string(),
  contacto: z.string(),
  correo: z.string(),
  regimen_fiscal: z.string(),
  credito: z.string(),
  contado: z.string(),
  inicio_relacion: z.string(),
  fecha_termino_relacion: z.string().optional(),
  registro: z.string(),
});

export type Proveedor = z.infer<typeof proveedorSchema>;
