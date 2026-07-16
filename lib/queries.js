import { pool } from './db';

export async function insertPosition(position) {
  const recordedAt = new Date(); // 입력 시점의 서버 타임스탬프
  const [result] = await pool.execute(
    'INSERT INTO ball_positions (position, recorded_at) VALUES (?, ?)',
    [position, recordedAt]
  );
  return { id: result.insertId, position, recordedAt };
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
