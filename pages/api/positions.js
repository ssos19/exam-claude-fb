import {
  insertPosition,
  getRecentPositions,
  getMatchById,
  claimOrRenewController,
} from '@/lib/queries';
import {
  parsePosition,
  parseLimit,
  parseId,
  parseControllerToken,
  ValidationError,
} from '@/lib/validation';

// 이 시간(ms) 안에 heartbeat가 없으면 제어권을 "비어있는 것"으로 간주해
// 다른 토큰이 선점할 수 있게 한다. 극단적인 동시 진입 타이밍까지 막을
// 필요는 없어서, 넉넉한 실용적 값으로만 잡는다.
const CONTROLLER_STALE_MS = 10000;

function isControllerStale(match) {
  if (!match.controllerToken || !match.controllerHeartbeatAt) {
    return true;
  }
  const heartbeatAt = new Date(match.controllerHeartbeatAt).getTime();
  return Date.now() - heartbeatAt > CONTROLLER_STALE_MS;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const matchId = parseId(req.body?.matchId, 'matchId');
      const position = parsePosition(req.body?.position);
      const controllerToken = parseControllerToken(req.body?.controllerToken);

      const match = await getMatchById(matchId);
      if (!match) {
        res.status(400).json({ error: 'match not found' });
        return;
      }
      if (match.status === 'ended') {
        res.status(403).json({ error: 'match has ended' });
        return;
      }

      const stale = isControllerStale(match);
      const isCurrentController = match.controllerToken === controllerToken;

      if (!stale && !isCurrentController) {
        res.status(403).json({ error: 'another user is controlling this match' });
        return;
      }

      // 비어있거나 stale이면 이 토큰으로 선점, 이미 내 토큰이면 heartbeat만 갱신.
      await claimOrRenewController(matchId, controllerToken);

      const record = await insertPosition(matchId, position);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
    return;
  }

  if (req.method === 'GET') {
    try {
      const matchId = parseId(req.query.matchId, 'matchId');
      const limit = parseLimit(req.query.limit);
      const items = await getRecentPositions(matchId, limit);
      res.status(200).json({ items, count: items.length });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
