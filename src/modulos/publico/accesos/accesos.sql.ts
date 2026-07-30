export const ACCESO_SQL = {
  DATOS_SESION: `
    SELECT
      u.cod_usuario,
      u.nombre_usuario,
      u.correo_usuario,
      (SELECT nombre_rol
       FROM roles
       WHERE cod_rol = u.cod_rol) AS nombre_rol
    FROM accesos a
    INNER JOIN usuarios u ON u.cod_usuario = a.cod_usuario
    WHERE a.cod_usuario = $1
  `,
};
