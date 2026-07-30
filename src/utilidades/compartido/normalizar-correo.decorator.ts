import { Transform, TransformFnParams } from 'class-transformer';

// Normaliza el correo (trim + lowercase) antes de validarlo o usarlo. Sin
// esto, "Usuario@X.com" y "usuario@x.com" se tratan como cuentas distintas
// (la unicidad en BD y el login comparan tal cual, sin normalizar), lo que
// permite duplicados y bloquea el login a quien tipeé su correo con otra
// capitalización. Cualquier DTO que reciba un correoUsuario debe usar esto.
export function NormalizarCorreo(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
