import { pool } from './db';

export async function createMatch() {
  // started_at은 DB의 CURRENT_TIMESTAMP(3)이 아니라 앱(JS)의 new Date()로 채운다.
  // SQL 쪽 CURRENT_TIMESTAMP는 DB 서버 자체의 로컬 타임존을 따르는데(lib/db.js의
  // mysql2 timezone:'Z' 옵션은 클라이언트가 보내거나 받는 값의 해석에만 관여할
  // 뿐, 서버가 CURRENT_TIMESTAMP를 계산하는 방식 자체는 못 바꾼다), 서버 타임존이
  // UTC가 아니면(예: Asia/Seoul) "그 지역의 벽시계 시각"이 저장되고, 이걸 나중에
  // timezone:'Z'가 UTC로 잘못 해석해서 읽어오면서 시간이 밀리는 버그가 있었다.
  // JS에서 new Date()를 만들어 파라미터로 넘기면 mysql2가 항상 진짜 UTC로 변환해
  // 저장하므로, DB 서버의 타임존 설정과 무관하게 항상 일관된다.
  const startedAt = new Date();
  const [result] = await pool.execute(
    'INSERT INTO matches (started_at) VALUES (?)',
    [startedAt]
  );
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
  // ended_at도 createMatch의 started_at과 같은 이유로 SQL CURRENT_TIMESTAMP 대신
  // JS의 new Date()를 넘긴다.
  const endedAt = new Date();
  await pool.execute(
    "UPDATE matches SET status = 'ended', ended_at = ? WHERE id = ?",
    [endedAt, id]
  );
  return getMatchById(id);
}

// 선점(비어있거나 stale) / 갱신(같은 토큰) 두 경우 모두 이 하나의 UPDATE로 처리한다.
// 호출부(POST /api/positions)에서 이미 "이 토큰이 쓸 수 있는지"를 판단한 뒤 호출한다.
export async function claimOrRenewController(matchId, controllerToken) {
  // controller_heartbeat_at은 10초 stale 판정의 기준 시각이라, 위와 같은 이유로
  // SQL CURRENT_TIMESTAMP가 아니라 JS의 new Date()로 정확히 UTC로 저장해야 한다 -
  // 그렇지 않으면 DB 서버 타임존에 따라 stale 판정(제어권 자동 인계) 자체가
  // 몇 시간 단위로 어긋날 수 있다.
  const heartbeatAt = new Date();
  await pool.execute(
    'UPDATE matches SET controller_token = ?, controller_heartbeat_at = ? WHERE id = ?',
    [controllerToken, heartbeatAt, matchId]
  );
}

export async function insertPosition(matchId, position) {
  // recorded_at/created_at도 DB의 DEFAULT CURRENT_TIMESTAMP(3)가 아니라
  // 앱(JS)의 new Date()로 명시적으로 채운다 (위 createMatch 주석 참고).
  const recordedAt = new Date();
  const [result] = await pool.execute(
    'INSERT INTO ball_positions (match_id, position, recorded_at, created_at) VALUES (?, ?, ?, ?)',
    [matchId, position, recordedAt, recordedAt]
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
