import mysql from 'mysql2/promise';

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z', // UTC로 고정 - Date 객체 왕복 시 서버 타임존에 따른 오차 방지
  });
}

// Next dev 모드 HMR 시 pool이 매번 재생성되는 것을 방지
export const pool = globalThis._mysqlPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  globalThis._mysqlPool = pool;
}
