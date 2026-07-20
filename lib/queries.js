import { pool } from './db';

export async function createMatch() {
  const [result] = await pool.execute('INSERT INTO matches () VALUES ()');
  const [rows] = await pool.execute(
    'SELECT id, started_at AS startedAt, ended_at AS endedAt, status FROM matches WHERE id = ?',
    [result.insertId]
  );
  return rows[0];
}

export async function getAllMatches() {
  const [rows] = await pool.query(
    'SELECT id, started_at AS startedAt, ended_at AS endedAt, status FROM matches ORDER BY started_at DESC'
  );
  return rows;
}

export async function getMatchById(id) {
  const [rows] = await pool.execute(
    `SELECT id, started_at AS startedAt, ended_at AS endedAt, status,
            controller_token AS controllerToken,
            controller_heartbeat_at AS controllerHeartbeatAt
     FROM matches WHERE id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

// 호출부(API 핸들러)에서 존재 여부/상태를 먼저 확인한 뒤 호출하는 것을 전제로 한다.
export async function endMatch(id) {
  await pool.execute(
    "UPDATE matches SET status = 'ended', ended_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
    [id]
  );
  return getMatchById(id);
}

// 선점(비어있거나 stale) / 갱신(같은 토큰) 두 경우 모두 이 하나의 UPDATE로 처리한다.
// 호출부(POST /api/positions)에서 이미 "이 토큰이 쓸 수 있는지"를 판단한 뒤 호출한다.
export async function claimOrRenewController(matchId, controllerToken) {
  await pool.execute(
    'UPDATE matches SET controller_token = ?, controller_heartbeat_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
    [controllerToken, matchId]
  );
}

export async function insertPosition(matchId, position) {
  // recorded_at은 앱이 아닌 DB가 INSERT 시점에 DEFAULT CURRENT_TIMESTAMP(3)로 채운다.
  const [result] = await pool.execute(
    'INSERT INTO ball_positions (match_id, position) VALUES (?, ?)',
    [matchId, position]
  );
  const [rows] = await pool.execute(
    'SELECT id, match_id AS matchId, position, recorded_at AS recordedAt FROM ball_positions WHERE id = ?',
    [result.insertId]
  );
  return rows[0];
}

export async function getRecentPositions(matchId, limit) {
  // limit은 호출부(parseLimit)에서 정수로 검증된 값만 들어온다.
  // mysql2 prepared statement의 LIMIT 바인딩 이슈를 피하기 위해 직접 보간한다.
  const [rows] = await pool.query(
    `SELECT id, match_id AS matchId, position, recorded_at AS recordedAt FROM ball_positions
     WHERE match_id = ?
     ORDER BY recorded_at DESC LIMIT ${Number(limit)}`,
    [matchId]
  );
  return rows;
}

export async function getAllPositionsOrdered(matchId) {
  const [rows] = await pool.query(
    'SELECT position, recorded_at AS recordedAt FROM ball_positions WHERE match_id = ? ORDER BY recorded_at ASC',
    [matchId]
  );
  return rows;
}
