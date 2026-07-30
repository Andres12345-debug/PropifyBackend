import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PUERTO_SERVIDOR: Joi.number().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  CLAVE_SECRETA: Joi.string().min(32).required(),
  JWT_TTL: Joi.string().default('1h'),
  FRONTEND_URL: Joi.string().uri().required(),

  MAIL_HOST: Joi.string().required(),
  MAIL_PORT: Joi.number().required(),
  MAIL_USER: Joi.string().required(),
  MAIL_PASS: Joi.string().required(),
  MAIL_FROM: Joi.string().required(),
  MAIL_TO: Joi.string().required(),

  // Opcionales: si se definen, SeedService crea un usuario admin al arrancar.
  SEED_ADMIN_EMAIL: Joi.string().email().optional(),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).max(128).optional(),
  SEED_ADMIN_NAME: Joi.string().optional(),
});
