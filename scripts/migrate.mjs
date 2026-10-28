import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ quiet: true });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sql = readFileSync(join(root, 'db/schema.sql'), 'utf8');

const client = new pg.Client({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'express_db_connection',
});

await client.connect();
try {
  await client.query(sql);
  console.log('Migration applied from db/schema.sql');
} finally {
  await client.end();
}
