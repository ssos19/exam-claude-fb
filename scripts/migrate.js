import { config } from 'dotenv';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

config({ path: '.env.local' });

// docker-compose 등에서 DB 컨테이너의 healthcheck가 통과해도, 아주 짧은 순간
// TCP 연결이 아직 안 열려 있을 수 있다(예: MySQL 최초 실행 시 init용 임시
// 서버가 재시작하는 틈). 몇 차례 재시도해 그런 타이밍 문제를 흡수한다.
async function connectWithRetry({ retries = 10, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true,
      });
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      console.log(
        `DB 연결 실패 (${attempt}/${retries}), ${delayMs}ms 후 재시도: ${err.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main() {
  const connection = await connectWithRetry();

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
