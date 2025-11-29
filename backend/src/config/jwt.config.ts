import { registerAs } from "@nestjs/config";

type JwtConfig = {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
  refreshExpiresInMs: number;
};

export default registerAs('jwt', (): JwtConfig => ({
  secret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
  expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',

  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  refreshExpiresInMs: Number(process.env.JWT_REFRESH_EXPIRES_IN_MS) || 7 * 24 * 60 * 60 * 1000,
}));