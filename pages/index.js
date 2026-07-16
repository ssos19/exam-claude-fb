import { getAllPositionsOrdered, getRecentPositions } from '@/lib/queries';
import { calculateOccupancy } from '@/lib/occupancy';
import { buildOccupancyView } from '@/lib/occupancyView';
import { SIDE_BOUNDARY } from '@/lib/teams';
import PositionForm from '@/components/PositionForm';
import OccupancySummary from '@/components/OccupancySummary';
import RecentPositionsTable from '@/components/RecentPositionsTable';

export async function getServerSideProps() {
  const [allRecords, recent] = await Promise.all([
    getAllPositionsOrdered(),
    getRecentPositions(20),
  ]);

  const occupancy = buildOccupancyView(
    calculateOccupancy(allRecords, { boundary: SIDE_BOUNDARY })
  );

  return {
    props: {
      occupancy,
      recent: recent.map((item) => ({
        ...item,
        recordedAt: item.recordedAt.toISOString(),
      })),
    },
  };
}

export default function HomePage({ occupancy, recent }) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">축구공 위치 기반 점유율 추적</h1>
      <PositionForm />
      <OccupancySummary occupancy={occupancy} />
      <RecentPositionsTable items={recent} />
    </main>
  );
}
