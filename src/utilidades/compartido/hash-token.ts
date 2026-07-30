import { createHash } from 'crypto';

// Para tokens de un solo uso ya aleatorios (UUID v4): un hash rápido sin sal
// alcanza, porque lo que se protege es la fuga de la tabla, no la fuerza
// bruta (adivinar un UUID es inviable de por sí). No usar para contraseñas.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
