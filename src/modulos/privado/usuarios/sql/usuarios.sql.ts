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
    WHERE u.cod_tenant = $1
    ORDER BY u.cod_usuario ASC
  `,
  // Solo para el superadministrador: ve usuarios de todos los tenants.
  CONSULTAR_TODOS: `
    SELECT
      u.cod_usuario,
      u.nombre_usuario,
      u.correo_usuario,
      u.cod_tenant,
      r.nombre_rol
    FROM usuarios u
    INNER JOIN roles r
      ON r.cod_rol = u.cod_rol
    ORDER BY u.cod_tenant ASC NULLS FIRST, u.cod_usuario ASC
  `,
};
