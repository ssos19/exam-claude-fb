import { insertPosition, getRecentPositions } from '@/lib/queries';
import { parsePosition, parseLimit, ValidationError } from '@/lib/validation';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const position = parsePosition(req.body?.position);
      const record = await insertPosition(position);
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
      const limit = parseLimit(req.query.limit);
      const items = await getRecentPositions(limit);
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
