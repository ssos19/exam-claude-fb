import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ErrorPage from 'next/error';
import PositionForm from '@/components/PositionForm';
import OccupancySummary from '@/components/OccupancySummary';
import RecentPositionsTable from '@/components/RecentPositionsTable';

// 서버(pages/api/positions.js)와 같은 값을 써야 "10초 이내"의 기준이 일치한다.
const CONTROLLER_STALE_MS = 10000;
const CONTROLLER_TOKEN_KEY = 'controllerToken';
// 데이터 새로고침(경기 상태/제어권, 기록/점유율) 주기.
const POLL_INTERVAL_MS = 3000;

// sessionStorage는 브라우저 전용이라 SSR 중에는 호출하면 죽는다. Next.js
// Pages Router는 getServerSideProps가 없어도 최초 요청 시 이 컴포넌트를
// 서버에서 한 번 렌더링하므로, useState의 lazy initializer 안에서
// typeof window로 방어해야 한다. (Math.random처럼 lazy initializer 안의
// 호출은 React 순수성 린트 규칙에서도 예외로 허용된다.)
function getOrCreateControllerToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  let token = sessionStorage.getItem(CONTROLLER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(CONTROLLER_TOKEN_KEY, token);
  }
  return token;
}

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

  const [controllerToken] = useState(() => getOrCreateControllerToken());

  // undefined = 아직 조회 전(로딩), null = 조회했지만 없음(404), 객체 = 정상
  const [match, setMatch] = useState(undefined);
  // "내가 지금 제어 중인가"는 match.controllerHeartbeatAt과 현재 시각(Date.now())을
  // 비교해야 하는데, Date.now()를 렌더 중에 직접 부르면 React 순수성 규칙 위반이다.
  // 그래서 렌더 때마다 다시 계산하지 않고, 매번 새로 fetch할 때(loadMatch 안,
  // 렌더가 아닌 시점)만 계산해서 상태로 들고 있는다.
  const [isController, setIsController] = useState(false);
  // OccupancySummary는 { status: 'insufficient_data' | 'ok', ... } 형태를 기대하므로,
  // 최초 조회 전에도 그 형태에 맞는 기본값을 넣어둔다.
  const [occupancy, setOccupancy] = useState({ status: 'insufficient_data', sampleCount: 0 });
  const [recent, setRecent] = useState([]);

  const loadMatch = useCallback(async () => {
    if (!matchId) {
      return;
    }
    const res = await fetch(`/api/matches/${matchId}`);
    if (res.status === 404) {
      setMatch(null);
      return;
    }
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    setMatch(data);
    const heartbeatFresh =
      !!data.controllerHeartbeatAt &&
      Date.now() - new Date(data.controllerHeartbeatAt).getTime() <= CONTROLLER_STALE_MS;
    setIsController(data.controllerToken === controllerToken && heartbeatFresh);
  }, [matchId, controllerToken]);

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

  // 제어권 잠금 상태(누가 제어 중인지, heartbeat가 살아있는지)와 기록/점유율을
  // 주기적으로 다시 확인한다. 내가 제어 중이 아니어도 계속 확인해야, 제어자가
  // 나가서 heartbeat가 끊기는 순간을 감지해 "이제 넘겨받을 수 있다"는 걸 UI에
  // 반영할 수 있다. 종료된 경기는 더 이상 바뀔 일이 없어 폴링을 멈춘다.
  useEffect(() => {
    if (!router.isReady || !matchId || match?.status === 'ended') {
      return undefined;
    }
    const intervalId = setInterval(() => {
      loadMatch();
      loadPositionsAndOccupancy();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [router.isReady, matchId, match?.status, loadMatch, loadPositionsAndOccupancy]);

  async function handleEnd() {
    const res = await fetch(`/api/matches/${matchId}`, { method: 'PATCH' });
    if (res.ok) {
      await loadMatch();
    }
    return res;
  }

  // 내 제출이 성공했다는 건 서버 기준으로 방금 내가 제어권을 얻었거나 갱신했다는
  // 뜻이다. 다음 3초 폴링을 기다리지 않고 즉시 match(제어권 정보)도 같이
  // 다시 읽어와야 "선점 직후에도 잠깐 잠긴 것처럼 보이는" 지연을 없앨 수 있다.
  // useCallback으로 참조를 고정해야 한다 - 매 렌더마다 새 함수면 이걸 prop으로
  // 받는 PositionForm의 제출 루프 effect가 그때마다 재시작돼 3초 주기가 깨진다.
  const handleSubmitSuccess = useCallback(() => {
    loadMatch();
    loadPositionsAndOccupancy();
  }, [loadMatch, loadPositionsAndOccupancy]);

  if (!router.isReady || match === undefined) {
    return <main className="mx-auto max-w-2xl p-6 text-gray-600">불러오는 중...</main>;
  }

  if (match === null) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← 경기 목록
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">경기 #{match.id}</h1>
        <StatusBadge status={match.status} />
      </div>

      <PositionForm
        matchId={match.id}
        ended={match.status === 'ended'}
        controllerToken={controllerToken}
        isController={isController}
        lastPosition={recent[0]?.position}
        onSubmitSuccess={handleSubmitSuccess}
        onEnd={handleEnd}
      />

      <OccupancySummary occupancy={occupancy} />
      <RecentPositionsTable items={recent} />
    </main>
  );
}
