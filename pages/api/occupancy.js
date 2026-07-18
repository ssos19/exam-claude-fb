import { getAllPositionsOrdered } from '@/lib/queries';
import { calculateOccupancy } from '@/lib/occupancy';
import { buildOccupancyView } from '@/lib/occupancyView';
import { SIDE_BOUNDARY } from '@/lib/teams';
import { parseId, ValidationError } from '@/lib/validation';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  try {
    const matchId = parseId(req.query.matchId, 'matchId');
    const records = await getAllPositionsOrdered(matchId);
    const result = calculateOccupancy(records, { boundary: SIDE_BOUNDARY });
    res.status(200).json(buildOccupancyView(result));
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}
