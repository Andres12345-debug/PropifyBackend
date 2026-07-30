// Política de contraseñas única para todo el backend — cualquier lugar que
// valide una contraseña nueva debe importar esto en vez de escribir su
// propio regex. Anclado con {8,128}$ para que valide la cadena COMPLETA
// (no solo que el primer carácter pertenezca al set permitido): exige entre
// 8 y 128 caracteres, con al menos una minúscula, una mayúscula, un número
// y un carácter especial.
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

export const PASSWORD_REGEX_MESSAGE =
  'La contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial';
