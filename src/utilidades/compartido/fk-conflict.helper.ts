// Códigos de error de Postgres para violaciones de constraint. Usar esto en
// vez de castear "as { code?: string }" suelto en cada catch — patrón que
// se repetía (y a veces faltaba) en varios servicios.
const VIOLACION_FOREIGN_KEY = '23503';
const VIOLACION_UNIQUE = '23505';

function codigoError(error: unknown): string | undefined {
  return (error as { code?: string } | null | undefined)?.code;
}

export function esViolacionForeignKey(error: unknown): boolean {
  return codigoError(error) === VIOLACION_FOREIGN_KEY;
}

export function esViolacionUnicidad(error: unknown): boolean {
  return codigoError(error) === VIOLACION_UNIQUE;
}
