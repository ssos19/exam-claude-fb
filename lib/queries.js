import { pool } from './db';

export async function insertPosition(position) {
  // recorded_at은 앱이 아닌 DB가 INSERT 시점에 DEFAULT CURRENT_TIMESTAMP(3)로 채운다.
  const [result] = await pool.execute(
    'INSERT INTO ball_positions (position) VALUES (?)',
    [position]
  );
  const [rows] = await pool.execute(
    'SELECT id, position, recorded_at AS recordedAt FROM ball_positions WHERE id = ?',
    [result.insertId]
  );
  return rows[0];
}

export async function getRecentPositions(limit) {
  // limit은 호출부(parseLimit)에서 정수로 검증된 값만 들어온다.
  // mysql2 prepared statement의 LIMIT 바인딩 이슈를 피하기 위해 직접 보간한다.
  const [rows] = await pool.query(
    `SELECT id, position, recorded_at AS recordedAt FROM ball_positions
     ORDER BY recorded_at DESC LIMIT ${Number(limit)}`
  );
  return rows;
}

export async function getAllPositionsOrdered() {
  const [rows] = await pool.query(
    'SELECT position, recorded_at AS recordedAt FROM ball_positions ORDER BY recorded_at ASC'
  );
  return rows;
}
