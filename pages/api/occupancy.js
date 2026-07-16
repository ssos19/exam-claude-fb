import { getAllPositionsOrdered } from '@/lib/queries';
import { calculateOccupancy } from '@/lib/occupancy';
import { buildOccupancyView } from '@/lib/occupancyView';
import { SIDE_BOUNDARY } from '@/lib/teams';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const records = await getAllPositionsOrdered();
    const result = calculateOccupancy(records, { boundary: SIDE_BOUNDARY });
    res.status(200).json(buildOccupancyView(result));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}
