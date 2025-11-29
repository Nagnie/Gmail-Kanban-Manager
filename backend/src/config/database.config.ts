import { registerAs } from '@nestjs/config';

type DatabaseConfig = {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  type: string | 'postgres' | 'mysql' | 'sqlite' | 'mariadb' | 'mongodb';
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  ssl: boolean;
  channelBinding: 'require' | 'disable';
};

export default registerAs('database', (): DatabaseConfig => ({
  type: process.env.DB_TYPE || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  name: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSLMODE === 'require',
  channelBinding:
    process.env.DB_CHANNELBINDING === 'require' ? 'require' : 'disable',
}));
