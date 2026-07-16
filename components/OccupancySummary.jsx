import { TEAMS } from '@/lib/teams';

export default function OccupancySummary({ occupancy }) {
  if (occupancy.status === 'insufficient_data') {
    return (
      <p className="text-gray-600">
        데이터가 부족합니다 (기록 {occupancy.sampleCount}건). 최소 2건 이상 필요합니다.
      </p>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Object.values(TEAMS).map((team) => {
        const stats = occupancy.teams[team.id];
        return (
          <div key={team.id} className="rounded border border-gray-200 p-4">
            <h3 className="font-semibold">
              {team.fullName} ({team.shortName})
            </h3>
            <p className="mt-1 text-2xl font-bold">
              {(stats.attackRatio * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">공격 점유율</p>
          </div>
        );
      })}
    </section>
  );
}
