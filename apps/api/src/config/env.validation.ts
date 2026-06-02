import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),

  DATABASE_URL: Joi.string().uri().required(),

  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),

  JWT_PRIVATE_KEY: Joi.string().required(),
  JWT_PUBLIC_KEY: Joi.string().required(),
  JWT_ACCESS_TTL: Joi.number().default(900),
  JWT_REFRESH_TTL_DAYS: Joi.number().default(7),

  ENCRYPTION_KEY: Joi.string().length(64).required(),

  REDIS_URL: Joi.string().optional(),
  REDIS_PASSWORD: Joi.string().optional(),

  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
});
