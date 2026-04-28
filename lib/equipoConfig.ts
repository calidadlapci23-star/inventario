// lib/equipoConfig.ts

/**
 * Mapeo de slugs de URL a los IDs almacenados en la base de datos.
 * Esta es la corrección clave: el slug de la URL es 'abxpentra'.
 */
export const equipoIdMapping: { [slug: string]: string } = {
  abxpentra: 'ABX microes', // CORREGIDO: de 'abx' a 'abxpentra'
  bs240: 'bs240',
};

/**
 * Configuración de nombres para mostrar en la interfaz de usuario.
 * Se usa el slug de la URL como clave para mantener la consistencia.
 */
export const equiposConfig: { [slug: string]: { nombre: string } } = {
  bs240: { nombre: 'BS-240 Pro' },
  abxpentra: { nombre: 'ABX microes' }, // CORREGIDO: de 'abx' a 'abxpentra'
};
