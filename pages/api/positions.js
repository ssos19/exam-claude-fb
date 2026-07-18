import { insertPosition, getRecentPositions, getMatchById } from '@/lib/queries';
import { parsePosition, parseLimit, parseId, ValidationError } from '@/lib/validation';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const matchId = parseId(req.body?.matchId, 'matchId');
      const position = parsePosition(req.body?.position);

      const match = await getMatchById(matchId);
      if (!match) {
        res.status(400).json({ error: 'match not found' });
        return;
      }
      if (match.status === 'ended') {
        res.status(403).json({ error: 'match has ended' });
        return;
      }

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
