export const USUARIOS_SQL = {
  CONSULTAR: `
    SELECT
      u.cod_usuario,
      u.nombre_usuario,
      u.correo_usuario,
      r.nombre_rol
    FROM usuarios u
    INNER JOIN roles r
      ON r.cod_rol = u.cod_rol
    ORDER BY u.cod_usuario ASC
  `,
};
