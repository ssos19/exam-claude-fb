import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
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

export default function HomePage() {
  const router = useRouter();
  const [matches, setMatches] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 이 마운트 시점 조회는 여기서만 쓰이므로(재사용 없음), 별도 함수로
    // 빼지 않고 fetch().then(...) 형태로 이펙트 안에 바로 둔다.
    let ignore = false;
    fetch('/api/matches').then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (!ignore) {
          setMatches(data.items);
        }
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/matches', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '경기 생성 실패');
        return;
      }
      const match = await res.json();
      router.push(`/matches/${match.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">축구공 위치 기반 점유율 추적</h1>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          새 경기 시작
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {matches === null && <p className="text-gray-600">불러오는 중...</p>}
      {matches?.length === 0 && (
        <p className="text-gray-600">아직 생성된 경기가 없습니다.</p>
      )}
      {matches && matches.length > 0 && (
        <ul className="divide-y divide-gray-200">
          {matches.map((match) => (
            <li key={match.id} className="flex items-center justify-between py-3">
              <Link
                href={`/matches/${match.id}`}
                className="font-medium text-blue-600 hover:underline"
              >
                경기 #{match.id}
              </Link>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{formatDateTime(match.startedAt)}</span>
                <StatusBadge status={match.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
