import { getMatchById, endMatch } from '@/lib/queries';
import { parseId, ValidationError } from '@/lib/validation';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const id = parseId(req.query.id, 'id');
      const match = await getMatchById(id);
      if (!match) {
        res.status(404).json({ error: 'match not found' });
        return;
      }
      res.status(200).json(match);
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

  if (req.method === 'PATCH') {
    try {
      const id = parseId(req.query.id, 'id');
      const match = await getMatchById(id);

      if (!match) {
        res.status(404).json({ error: 'match not found' });
        return;
      }
      if (match.status === 'ended') {
        res.status(400).json({ error: 'match already ended' });
        return;
      }

      const updated = await endMatch(id);
      res.status(200).json(updated);
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

  res.setHeader('Allow', ['GET', 'PATCH']);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
