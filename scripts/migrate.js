import { config } from 'dotenv';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

config({ path: '.env.local' });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const dir = path.join(process.cwd(), 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const [rows] = await connection.query(
      'SELECT 1 FROM schema_migrations WHERE filename = ?',
      [file]
    );
    if (rows.length > 0) {
      continue;
    }
    const sql = readFileSync(path.join(dir, file), 'utf8');
    console.log(`Applying ${file}...`);
    await connection.query(sql);
    await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
  }

  await connection.end();
  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
