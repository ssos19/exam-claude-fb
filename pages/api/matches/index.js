import { createMatch, getAllMatches } from '@/lib/queries';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const match = await createMatch();
      res.status(201).json(match);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
    return;
  }

  if (req.method === 'GET') {
    try {
      const items = await getAllMatches();
      res.status(200).json({ items, count: items.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
