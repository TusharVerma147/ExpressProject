import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

export const connectDb = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log(`Connected to PostgreSQL database "${env.DB_NAME}"`);
  } finally {
    client.release();
  }
};
