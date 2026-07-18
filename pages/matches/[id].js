import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ErrorPage from 'next/error';
import PositionForm from '@/components/PositionForm';
import OccupancySummary from '@/components/OccupancySummary';
import RecentPositionsTable from '@/components/RecentPositionsTable';

function StatusBadge({ status }) {
  const ended = status === 'ended';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ended ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'
      }`}
    >
      {ended ? '종료' : '진행 중'}
    </span>
  );
}

export default function MatchPage() {
  const router = useRouter();
  const { id } = router.query;
  // router.isReady가 true가 되기 전엔 id가 비어있을 수 있어, 그 전까지는 아무것도 조회하지 않는다.
  const matchId = router.isReady ? Number(id) : null;

  // undefined = 아직 조회 전(로딩), null = 조회했지만 없음(404), 객체 = 정상
  const [match, setMatch] = useState(undefined);
  // OccupancySummary는 { status: 'insufficient_data' | 'ok', ... } 형태를 기대하므로,
  // 최초 조회 전에도 그 형태에 맞는 기본값을 넣어둔다.
  const [occupancy, setOccupancy] = useState({ status: 'insufficient_data', sampleCount: 0 });
  const [recent, setRecent] = useState([]);

  const loadMatch = useCallback(async () => {
    const res = await fetch('/api/matches');
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    const found = data.items.find((m) => m.id === matchId);
    setMatch(found ?? null);
  }, [matchId]);

  const loadPositionsAndOccupancy = useCallback(async () => {
    if (!matchId) {
      return;
    }
    const [positionsRes, occupancyRes] = await Promise.all([
      fetch(`/api/positions?matchId=${matchId}&limit=20`),
      fetch(`/api/occupancy?matchId=${matchId}`),
    ]);
    if (positionsRes.ok) {
      const data = await positionsRes.json();
      setRecent(data.items);
    }
    if (occupancyRes.ok) {
      const data = await occupancyRes.json();
      setOccupancy(data);
    }
  }, [matchId]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    // loadMatch/loadPositionsAndOccupancy는 정지·종료 액션 이후 재조회에도
    // 그대로 재사용해야 해서(요구사항), 이 마운트 이펙트 전용으로 fetch를
    // 새로 인라인하지 않고 그대로 호출한다. react-hooks/set-state-in-effect는
    // "effect에서 직접 fetch하지 말고 프레임워크의 데이터 페칭을 쓰라"는
    // 취지인데, 이 페이지는 SSR을 쓰지 않고 클라이언트 useEffect+fetch로만
    // 데이터를 가져오도록 되어 있어 이 경고는 해당하지 않는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMatch();
    loadPositionsAndOccupancy();
  }, [router.isReady, loadMatch, loadPositionsAndOccupancy]);

  async function handleEnd() {
    const res = await fetch(`/api/matches/${matchId}`, { method: 'PATCH' });
    if (res.ok) {
      await loadMatch();
    }
    return res;
  }

  if (!router.isReady || match === undefined) {
    return <main className="mx-auto max-w-2xl p-6 text-gray-600">불러오는 중...</main>;
  }

  if (match === null) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">경기 #{match.id}</h1>
        <StatusBadge status={match.status} />
      </div>

      <PositionForm
        matchId={match.id}
        ended={match.status === 'ended'}
        onSubmitSuccess={loadPositionsAndOccupancy}
        onEnd={handleEnd}
      />

      <OccupancySummary occupancy={occupancy} />
      <RecentPositionsTable items={recent} />
    </main>
  );
}
